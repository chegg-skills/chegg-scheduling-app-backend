# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A full-stack meeting/event scheduling platform with three services in a monorepo:
- **`backend/`** — Node.js/Express REST API (port 4000)
- **`frontend/`** — React SPA (port 3000 in dev)
- **`notification-service/`** — RabbitMQ consumer for async email notifications

## Commands

### Backend (`/backend`)
```bash
npm run dev                  # Start with hot reload (tsx watch)
npm run build                # Compile TypeScript for production
npm run test                 # Run all tests (serially with --runInBand)
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm run seed:demo            # Populate demo data
npm run seed:demo:reset      # Reset and repopulate demo data
npx prisma migrate dev       # Create + run migrations
npx prisma migrate deploy    # Deploy existing migrations
npx prisma studio            # Open Prisma GUI
```

### Frontend (`/frontend`)
```bash
npm run dev          # Start Vite dev server
npm run build        # Type-check + bundle for production
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no emit)
```

### Notification Service (`/notification-service`)
```bash
npm run start:dev    # Start with hot reload
npm run build        # Compile TypeScript
npm run prisma:migrate   # Create/run migrations
npm run prisma:deploy    # Deploy migrations
```

## Architecture

### Backend — Domain-Driven Design

Each feature lives under `src/domain/<feature>/` with its own controller, service, and repository. The route aggregator at `src/routes/` mounts everything under `/api/v1`.

Key domains: `auth`, `events`, `bookings`, `availability`, `teams`, `users`, `students`, `invite`, `public`, `reports`, `stats`.

Shared infrastructure in `src/shared/`:
- `middleware/` — auth (JWT), validation (Zod), rate limiting, CSRF, request context
- `db/` — Prisma client singleton
- `notifications/` — RabbitMQ publisher
- `error/` — standardized error classes and Prisma error mapper
- `utils/` — date helpers, JWT utils, pagination
- `constants/interactionType.ts` — hardcoded `INTERACTION_TYPE_CAPS`, `INTERACTION_TYPE_LABELS`, `INTERACTION_TYPE_KEYS` for the four interaction types

### Interaction Type Design

`InteractionType` is a **hardcoded Prisma enum**, not an admin-configurable DB table. The four values are mathematically complete:

| Key | multipleCoaches | multipleParticipants | derivesLeadershipFromAssignment |
|---|---|---|---|
| `ONE_TO_ONE` | false | false | false |
| `ONE_TO_MANY` | false | true | false |
| `MANY_TO_ONE` | true | false | **true** |
| `MANY_TO_MANY` | true | true | **true** |

Capability flags come from `INTERACTION_TYPE_CAPS` in `backend/src/shared/constants/interactionType.ts` (and mirrored in `frontend/src/constants/interactionTypes.ts`). No DB query is needed to resolve capabilities. The `GET /event-interaction-types` endpoint returns these hardcoded values for the frontend.

**Do not add admin CRUD routes for interaction types.** They are structural constants.

**`multipleCoaches` means multiple coaches simultaneously in a session — it does NOT mean the pool can only have one coach.** ONE_TO_ONE and ONE_TO_MANY events can still have a multi-coach pool and use `ROUND_ROBIN` to rotate which single coach is assigned per booking. Do not add validation that blocks `ROUND_ROBIN` for `!multipleCoaches` types.

**`derivesLeadershipFromAssignment`** — when `true`, the type's `sessionLeadershipStrategy` is always auto-derived from `assignmentStrategy` (DIRECT→FIXED_LEAD, ROUND_ROBIN→ROTATING_LEAD) and cannot be set manually. Currently `true` for MANY_TO_ONE and MANY_TO_MANY. Adding a new cap flag here is the correct extension point for future per-type behavioral differences — avoid hardcoding type name strings anywhere in the codebase.

### EventCoach (formerly EventHost)

The three-tier hierarchy:
- **TeamMember** — eligibility (who can be assigned to events on a team)
- **EventCoach** — pool assigned to a specific event (`EventCoach` model, fields `coachUserId`, `coachOrder`)
- **Host/Co-host** — session-time roles recorded on each `Booking` (`coachUserId`, `coCoachUserIds`)

`Event` holds the following coach-related fields — all live on the event, not on the interaction type:
- `minCoachCount` / `maxCoachCount` — pool size constraints (how many coaches must/can be in the pool)
- `targetCoHostCount` — per-session co-host cap for `MANY_TO_ONE` / `MANY_TO_MANY` events (`null` = all available coaches join as co-hosts)
- `fixedLeadCoachId` — used when `sessionLeadershipStrategy = FIXED_LEAD`
- `showDescription` — boolean (`@default(false)`). When `true`, the event's `description` is rendered in a `SessionIntroduction` component on the public booking page.
- `maxBookingWindowDays` — optional positive integer (`null` = no limit, max 365). Prevents students from booking sessions further in the future than this many days from today. Enforced on two layers: the availability service clips `effectiveMaxDate` before generating slots, and `SlotStep` disables dates beyond the window in the date picker. Both sides compute the boundary using UTC arithmetic (`setUTCDate` / `setUTCHours(23, 59, 59, 999)`) so the cutoff is consistent regardless of server or browser timezone.

The backend service file is `eventCoach.service.ts`. Routes are under `/events/:eventId/coaches`.

### Booking Mode & Strategy Auto-Enforcement

Two separate services enforce complementary rules server-side:

**`resolveEventSchedulingConfig` in `eventScheduling.service.ts`** — enforces scheduling shape:
- **Group types (`caps.multipleParticipants = true`)** — `bookingMode` is hard-locked to `FIXED_SLOTS`. This covers any current or future single-coach or multi-coach group type (ONE_TO_MANY, MANY_TO_MANY). Students can only book into pre-created schedule slots.
- **Single-participant types (`caps.multipleParticipants = false`)** — `minParticipantCount` and `maxParticipantCount` are enforced as `1` regardless of payload.
- **Default `bookingMode`** — `COACH_AVAILABILITY` (was previously `HOST_AVAILABILITY` before the rename).
- Does **not** set `sessionLeadershipStrategy` — that is owned entirely by `eventMutation.service.ts`.

**`resolveSessionLeadershipConfig` in `eventMutation.service.ts`** — enforces leadership strategy with four priority levels (last wins):
1. Default by caps (`multipleCoaches` → `ROTATING_LEAD`, else `SINGLE_COACH`)
2. Override with existing DB value (update path)
3. Override with user input from payload
4. **Leadership Reform** — for types where `caps.derivesLeadershipFromAssignment = true` (MANY_TO_ONE / MANY_TO_MANY), always overrides with: `DIRECT` → `FIXED_LEAD`, `ROUND_ROBIN` → `ROTATING_LEAD`. This is the highest priority and cannot be overridden by user input.

Do not expose a manual `sessionLeadershipStrategy` selector for `derivesLeadershipFromAssignment` types in the UI or accept it in the API payload for those types. Schema validation in `event.schema.ts` also blocks invalid assignment strategy and booking mode values using caps-based checks (not hardcoded type name strings).

**Schema vs service enforcement asymmetry for group booking modes:** `event.schema.ts` only blocks `bookingMode !== FIXED_SLOTS` for `!multipleCoaches && multipleParticipants` (ONE_TO_MANY). For MANY_TO_MANY (`multipleCoaches && multipleParticipants`), the schema does not reject `COACH_AVAILABILITY` — the service's `resolveEventSchedulingConfig` silently overrides it to `FIXED_SLOTS`. Both paths produce a correct DB state; the schema just doesn't surface a 400 for the MANY_TO_MANY case. Do not add schema validation to block it for MANY_TO_MANY — the silent override is the intended design.

**Update schema — no defaults:** `UpdateEventSchema` uses `EventBaseObjectCore.partial()` (no `.default()` on any field), not `EventBaseObject.partial()`. This is intentional: Zod `.partial()` still applies defaults from the wrapped schema, so using the defaulted form would cause absent fields (e.g., `assignmentStrategy`) to silently resolve to their default ("DIRECT") rather than `undefined` — breaking the `?? existingEvent.field` fallback in `resolveUpdateEventContext` and triggering incorrect leadership derivation. Always use `EventBaseObjectCore` as the base for the update schema.

**Partial schema caps limitation:** `UpdateEventSchema` uses `EventBaseObjectCore.partial()`, so `data.interactionType` is `undefined` when the PATCH body omits it. The `refineEventConstraints` superRefine skips all caps-based checks when `interactionType` is absent. Clients that want cap validation (e.g., verifying `targetCoHostCount ≥ 1`) must include `interactionType` in the PATCH body. Integration tests that cover this path must also include `interactionType` in the PATCH payload. When `minCoachCount` is omitted from a PATCH, the schema-level ROUND_ROBIN check does not fire (no default to compare against); instead the service-level `validateEventConfiguration` catches it.

**`assertRoundRobinCoachCount` in `event.service.ts`** — runs after every event update to reject the 1-coach intermediate state for ROUND_ROBIN events. It intentionally allows 0 coaches (consistent with `validateEventConfiguration`'s `coachCount > 0` guard): 0 coaches is a valid "still being set up" state; only the 1-coach state is invalid for ROUND_ROBIN.

### Co-host Rotation

`resolveCollaborativeCoHosts` in `bookingAssignmentResolver.service.ts` advances the `EventRoutingState.nextCoachOrder` cursor every time a co-host is assigned — regardless of whether the lead was selected via `DIRECT` or `ROUND_ROBIN`. This ensures fair workload distribution across all co-hosts even when the lead is pinned (`FIXED_LEAD`).

### Booking Domain Type Architecture

`BookableEvent` in `booking.shared.ts` is typed as `Prisma.EventGetPayload<{ include: typeof bookableEventInclude }>` — a fully structural Prisma type derived from the `bookableEventInclude` validator defined in the same file. This gives complete type safety across `bookingAssignmentResolver.service.ts` for all event field accesses.

`BookingSchedulingContext` is a `Pick<BookableEvent, ...>` of the scheduling-relevant fields — it is properly typed as a side-effect of `BookableEvent` being concrete.

**`"SINGLE_HOST"` legacy string guard:** Line 328 of `bookingAssignmentResolver.service.ts` compares `(event.sessionLeadershipStrategy as string) === "SINGLE_HOST"` — the `as string` cast is intentional. TypeScript's control-flow narrowing excludes `SINGLE_COACH` at that branch (already checked above), leaving only `FIXED_LEAD | ROTATING_LEAD`. The `"SINGLE_HOST"` check is a safeguard against stale DB rows that pre-date the enum rename; the cast signals this is a deliberate legacy fallback, not a type error.

**Scope of remaining `as any` usage:** `availability.service.ts` builds its own event query (including `scheduleSlots`) that does not use `bookableEventInclude`, so its event and schedule-slot casts are a separate concern. Controllers use `req.params as any` / `req.query as any` throughout — the validate middleware already parses these but the typed output is accessed via the original `req` object. Neither has been refactored; both are tracked as future work.

### Frontend — React + React Query

Pages in `src/pages/` are lazy-loaded via React Router. Auth pages live in `src/pages/auth/`. Data fetching uses React Query hooks defined in `src/hooks/queries/` which wrap API functions from `src/api/`.

Pattern: `Page → custom hook (React Query) → api/<domain>.ts → axios`.

State: `auth` (user session), `confirm` (dialog prompts), `bookingView` (coach navigation in booking UI). No global store — everything is local or server-state via React Query.

The Vite dev server proxies `/api` to `http://localhost:4000`, so `VITE_API_BASE_URL` can be empty locally.

#### Frontend Folder Structure

- `src/constants/interactionTypes.ts` — `INTERACTION_TYPE_CAPS`, `InteractionType` type, `INTERACTION_TYPE_OPTIONS` (card labels/descriptions)
- `src/hooks/queries/` — all React Query server-state hooks (useBookings, useEvents, useUsers, etc.)
- `src/hooks/` — non-query hooks (useTableSort, useBookingFilters, useAsyncAction, etc.)
- `src/context/` — React contexts, each split into its own subfolder following SRP:
  - `auth/` — `AuthProvider`, `useAuth` (user session)
  - `confirm/` — `ConfirmProvider`, `useConfirm`, `ConfirmDialog` (confirm/alert dialogs)
  - `bookingView/` — `BookingViewProvider`, `useBookingView` (coach navigation in booking UI)
  - Each subfolder has: `types.ts`, `<Name>Context.ts`, provider, hook, `index.ts` barrel
- `src/components/shared/ui/` — generic UI primitives (Modal, Button, Badge, Spinner, etc.)
- `src/components/shared/form/` — generic form components (FormField, Input, Select, Textarea, etc.)
- `src/components/shared/table/` — generic table utilities (SortableHeaderCell, TablePagination, RowActions)
- `src/components/dashboard/` — dashboard orchestrator (`DashboardCharts.tsx`)
  - `charts/` — chart sub-components: `BookingVolumeTrendChart`, `SessionOutcomesChart`, `TeamPerformanceChart`, `PeakActivityChart`, shared `ChartHeader`, `chartColors`
- `src/components/events/form/` — event form components and schema
- `src/components/events/table/` — event table row and utilities
- `src/components/events/dialogs/` — event-specific dialog components
- `src/components/event-interaction-types/` — **read-only** `InteractionTypeTable` used by `InteractionTypesPage`. No create/edit/delete components exist here.
- `src/components/public/booking/SessionIntroduction.tsx` — displays event description on the public booking side panel when `showDescription` is true
- `src/components/shared/form/Switch.tsx` — reusable MUI Switch with label, used in event form for boolean toggles
- `src/pages/auth/` — login, register, bootstrap, accept-invite pages

#### Key Patterns

- **Interaction type caps in the form** — `useEventForm` derives `caps: InteractionTypeCaps | null` from `INTERACTION_TYPE_CAPS[watch('interactionType')]` with no API call. The `caps` object is passed to child form components (`EventScheduleFields`, `EventSchedulingPolicyFields`, `EventAssignmentAlert`) to gate conditional sections. Do not re-fetch interaction types inside the event form hook.
- **Event form conditional sections** — The Coach Pool Size fields in `EventScheduleFields` are shown when `caps.multipleCoaches` is true OR when `assignmentStrategy === 'ROUND_ROBIN'` (since single-session types can still use a pool for rotation). The Leadership Strategy selector is shown when `caps.multipleCoaches && !caps.derivesLeadershipFromAssignment` — types where leadership is auto-derived suppress the manual selector. Co-hosts-per-session is shown when `leadershipStrategy !== 'SINGLE_COACH'`. `caps.multipleParticipants` gates `ParticipantCapacityFields` in `EventSchedulingPolicyFields`. Switching interaction type triggers a `useEffect` that resets session-leadership and `targetCoHostCount` (but NOT pool size) for `!multipleCoaches` types. For `derivesLeadershipFromAssignment` types, the effect auto-derives `sessionLeadershipStrategy` from `assignmentStrategy`.
- **Event form `superRefine`** — `eventFormSchema.ts` mirrors all backend cross-field validation rules (FIXED_LEAD without a lead coach, maxCoachCount < minCoachCount, ROUND_ROBIN requires minCoachCount ≥ 2, etc.) for immediate inline errors. `ROUND_ROBIN` is valid for all four interaction types — do not add a block for `!multipleCoaches`.
- **`targetCoHostCount`** — optional integer on `Event`. Limits how many co-hosts `resolveCollaborativeCoHosts` assigns per session for MANY_TO_ONE / MANY_TO_MANY events. `null` means all available coaches (minus lead) join. Must be ≥ 1 when set (validated in `event.schema.ts`). Exposed in the event form under "Co-hosts per session". Reset to `null` when switching to a `!multipleCoaches` type.
- **`showDescription`** — boolean toggle on `Event` (`@default(false)`). Exposed in the event form via `EventBasicFields` using the shared `Switch` component. When `true`, `PublicBookingPage` renders `SessionIntroduction` in the side panel showing the event description. The field is included in `publicEventSelect` so it is returned by the public event API.
- **`maxBookingWindowDays`** — optional integer (1–365, `null` = no limit) on `Event`. Exposed in `EventSchedulingPolicyFields` with a numeric input (`min="1" max="365"`). Both the backend (`event.schema.ts`: `.min(1).max(365)`) and frontend (`eventFormSchema.ts`: `.min(1).max(365)`) validate the range. In `availability.service.ts`, `getAvailableSlots` caps `effectiveMaxDate` to `today + maxBookingWindowDays` at UTC end-of-day before generating slots. `SlotStep` mirrors this using the same UTC calculation to disable out-of-window dates in the calendar picker. **Always use `setUTCDate`/`setUTCHours` on both sides** — never local time — to keep the boundary consistent across timezones.
- **Interaction type selector** — `EventResourceFields` uses a 2×2 card-based `RadioGroup` driven by `INTERACTION_TYPE_OPTIONS` constants, not an API-fetched dropdown.
- **Public booking coach selection** — `usePublicBookingState` exposes `selectedCoachId` / `setSelectedCoachId`. For `DIRECT`-assignment events the hook derives `preferredCoachId` from `selectedCoachId` (not from the coach-slug URL). The public event API now returns `assignmentStrategy`, `interactionType`, and the active `coaches` list (`PublicEventCoach[]` in `types/index.ts`) so the booking UI can render a coach-picker step for DIRECT events.
  - `SlotStep` accepts optional `coaches`, `selectedCoachId`, `onCoachSelect` props. When `coaches` is non-empty (DIRECT events only) a card grid of coaches renders above the calendar; the slot grid shows a placeholder until a coach is selected (slots are fetched filtered by `preferredCoachId`).
  - `PublicBookingFlow` receives `eventCoaches`, `selectedCoachId`, `setSelectedCoachId` and forwards them to `SlotStep`. For ROUND_ROBIN events `eventCoaches` is an empty array so the picker is suppressed.
  - `PublicBookingPage` derives `isDirectEvent` and `eventCoaches` from `eventDetails`, passes them into the flow, and guards the schedule step's "Next" button: disabled until both a coach and a slot are chosen on DIRECT events with a coach pool.
- `bookingView` context — provides `onViewCoach` callback at page level (`BookingsPage`, `EventDetailPage`). Import from `@/context/bookingView`. Do not prop-drill through intermediate booking components.
- Module-level `Intl.DateTimeFormat` instances — defined outside components in `BookingTable`, `BookingTimeCell`, `ScheduleSection` to avoid re-creation on every render.
- `useCallback` for stable event handlers in list components (`BookingTable.handleToggle`, `BookingCalendar.getStatusColor`).

### Timezone Architecture

All datetimes are stored as UTC in the database. Timezone handling is split across three layers:

**Storage:**
- `User.timezone` — every user (coach, admin) stores their IANA timezone string (e.g. `"Asia/Kolkata"`), defaulting to `"UTC"`.
- `Booking.timezone` — stores the student's IANA timezone at the moment of booking, captured from the browser via `Intl.DateTimeFormat().resolvedOptions().timeZone` in `usePublicBookingState.ts`. This defaults to `"UTC"` only if not provided — the frontend always sends it.
- `EventScheduleSlot` has no timezone field — fixed slots are created and displayed using the coach's browser timezone (UTC storage, local display).

**Availability checking (`availability.service.ts`):**
- `isCoachAvailable()` converts the incoming UTC slot time to the coach's stored timezone using `Intl.DateTimeFormat` before comparing against weekly availability windows. A coach who sets "9am–5pm" will always have that interpreted in their own timezone regardless of where the student is.

**Public booking slot display (`usePublicBookingState.ts`, `SlotStep.tsx`):**
- The frontend sends the selected calendar day as UTC midnight-to-midnight in the browser's local timezone (via `new Date(year, month, day).toISOString()`). This correctly maps "April 20 in IST" to the UTC window covering that day in IST. Slots returned as ISO strings are displayed using the browser's local timezone, which equals the student's timezone. No extra conversion is needed.

**Notification emails (`booking.notification.ts`):**
- `getBookingNotificationVariables(booking, timezoneOverride?)` accepts a per-recipient timezone override.
- Every notification function sends times in the **recipient's own timezone**:
  - Student emails → `booking.timezone` (student's timezone at booking time)
  - Coach emails → `booking.coach.timezone` (coach's stored user timezone)
  - Team admin emails → each admin's `user.timezone` (fetched via `getTeamAdminRecipients`)
  - Co-coach emails → each co-coach's `user.timezone`
- All formatting is done by `formatNotificationDate()` in `shared/utils/date.ts`, which uses `Intl.DateTimeFormat` with `timeZone`. Email templates include a `{{timezone}}` label so recipients know which timezone the displayed time is in.
- Do **not** use a single `booking.timezone` for all recipients — the per-recipient override pattern in `getBookingNotificationVariables` must be preserved.

**`parseBoundedDateRange` in `shared/utils/date.ts`:** When `endDate` is a date-only string (e.g. `"2026-12-07"`), the function extends it to `23:59:59.999 UTC` so that a same-day query (`?startDate=2026-12-07&endDate=2026-12-07`) covers the full 24-hour window. Without this, `new Date("2026-12-07")` parses as midnight UTC, making the slot-generation while loop a no-op (`currentStart < midnight == false`). Full ISO strings with an explicit time component are left unchanged.

**Remaining known limitations:**
- `availability.service.ts` builds its own Prisma query shape with `as any` casts — separate from the typed `bookableEventInclude` used in the booking domain.
- `EventScheduleSlot` has no timezone metadata; fixed-slot display relies on the viewer's browser timezone.

### Notification Service — Microservice

Consumes RabbitMQ messages published by the backend on booking events. Follows SRP throughout — each folder owns exactly one concern.

```
src/
├── app/           — bootstrap.ts (startup/shutdown/timeout), healthServer.ts (HTTP /health)
├── channels/      — NotificationChannel (abstract), EmailChannel, registry (Map-based dispatcher)
├── config/        — env.ts (all process.env reads), queues.ts (queue/exchange names)
├── consumers/     — notificationConsumer, dlqConsumer, processNotification (shared handler)
├── db/            — prisma.ts (singleton)
├── queues/        — rabbitmq.ts (connection + exponential-backoff reconnect)
├── scheduler/     — reminderScheduler.ts (polling sweep, guard against concurrent runs)
├── services/      — mailer.ts (SMTP+retry), notificationRepository.ts (all Prisma ops),
│                    notificationService.ts (orchestration), scheduledNotificationService.ts (batch sweep)
├── templates/     — layout.ts (wrapLayout+brand), partials.ts (detailRow/inlineLink helpers),
│                    booking/coach/team/invite/reminders domain files, registry.ts (merged map +
│                    compile-time exhaustiveness check), renderer.ts (renderTemplate + XSS allowlist)
├── types/         — notification.ts (NotificationType union, EmailTemplate)
└── index.ts       — 5-line entry point
```

Key patterns:
- `processNotification.ts` — single shared handler imported by both consumers (no duplication)
- `templates/registry.ts` — compile-time exhaustiveness check: adding a `NotificationType` without a template is a build error
- `RAW_HTML_FIELDS` allowlist in `renderer.ts` — `coHostDetailsHtml` is injected raw; all other variables are HTML-escaped
- `config/env.ts` — all `process.env` reads in one place; nothing scattered across files
- RabbitMQ reconnects with exponential backoff (up to 10 attempts), then `process.exit(1)`
- Health check server on `HEALTH_PORT` (default 3001) for container orchestrators
- `CANCEL_BOOKING_REMINDERS` is a control message — has no email template and is excluded from the exhaustiveness check

Uses a separate Prisma schema with a `notifications` tracking table (can share the same Postgres instance as backend).

### Database

Both backend and notification-service use PostgreSQL + Prisma. Each has its own `prisma/schema.prisma` and migrations. The test environment uses a separate DB (`chegg_test`).

## Environment Variables

Copy `.env.example` → `.env` in each service directory. Key variables:

**Backend:**
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — must be changed in production
- `RABBITMQ_URL` — RabbitMQ connection (optional if `NOTIFICATIONS_ENABLED=false`)
- `BOOTSTRAP_SECRET` — one-time secret for creating the first admin user
- `ALLOW_SELF_REGISTER` — toggle self-registration

**Frontend:**
- `VITE_API_BASE_URL` — leave empty for dev (Vite proxy handles it)

**Notification Service:**
- `DATABASE_URL`, `RABBITMQ_URL`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`
- `EMAIL_FROM` — sender address (fallback: `SMTP_USER` → `EMAIL_USERNAME` → `no-reply@example.com`)
- `EMAIL_MAX_RETRIES` (default 3), `EMAIL_RETRY_DELAY_MS` (default 3000)
- `EMAIL_LOGO_URL` — brand logo in emails (default: Chegg logokit URL)
- `HEALTH_PORT` (default 3001) — HTTP health check port
- `STARTUP_TIMEOUT_MS` (default 30000) — kills process if consumers don't connect in time
- `REMINDER_SCHEDULER_ENABLED` (default true), `REMINDER_SCHEDULER_INTERVAL_MS` (default 60000), `REMINDER_BATCH_SIZE` (default 25)

## Testing

Backend tests require a running Postgres instance. The test DB URL is configured in `tests/setup/`. CI uses `postgresql://postgres:postgres@127.0.0.1:5432/chegg_test`.

All tests are integration tests under `tests/integration/`. The `tests/unit/` directory is empty — there are no unit tests. Run a single integration test file:
```bash
npx jest tests/integration/events.test.ts --runInBand
```

### Event integration test coverage (`tests/integration/events.test.ts`)

`events.test.ts` is the primary spec for the event domain. It covers:

- **Event offerings** — create/list/update/delete, key normalization, usage listing, deletion blocked when events exist
- **Interaction type endpoint** — all four types returned, `caps` structure including `derivesLeadershipFromAssignment` values
- **Event CRUD** — create, read, update, deactivate, hard delete (blocked when bookings exist), duplicate with coaches
- **General-detail updates across all interaction types** — dedicated PATCH tests for ONE_TO_MANY (verifies FIXED_SLOTS and SINGLE_COACH survive a name-only patch), MANY_TO_ONE ROUND_ROBIN (verifies ROTATING_LEAD is preserved and not reset to FIXED_LEAD), MANY_TO_MANY ROUND_ROBIN (verifies FIXED_SLOTS + ROTATING_LEAD both survive)
- **Event scheduling** — `FIXED_SLOTS` enforcement for ONE_TO_MANY, slot CRUD, slot deletion blocked when bookings exist
- **Event coach routes** — assign/list/remove coaches, ROUND_ROBIN minimum-coach enforcement on assign and remove
- **Leadership auto-derivation** — all four `interactionType × assignmentStrategy` combinations for MANY_TO_ONE and MANY_TO_MANY; verifies reform overrides user-provided `sessionLeadershipStrategy`; verifies re-derivation on update; verifies 400 when DIRECT is used without `fixedLeadCoachId`
- **`targetCoHostCount` validation** — rejects 0 and negative values, accepts 1 and null; update path requires `interactionType` in PATCH body for cap checks
- **MANY_TO_MANY creation** — happy-path with participant capacity; silent `COACH_AVAILABILITY → FIXED_SLOTS` service override; DIRECT + `targetCoHostCount`
- **`showDescription` field** — defaults false on creation, can be set true, toggled via PATCH, preserved on duplicate; public slug endpoint returns the field
- **`maxBookingWindowDays` field** — defaults null, can be set on creation, updated via PATCH, cleared to null, preserved on duplicate; rejects 0, negative values, and values > 365
- **Schema rejections** — ONE_TO_MANY + ROUND_ROBIN, ONE_TO_MANY + COACH_AVAILABILITY, ONE_TO_ONE + maxParticipantCount > 1, maxCoachCount < minCoachCount, ROUND_ROBIN + minCoachCount < 2, FIXED_LEAD without coach (schema and service level), non-SINGLE_COACH for single-coach types

Ad-hoc scripts for data backfill and seeding live in `backend/src/scripts/`. Run them directly with `npx tsx`:
```bash
npx tsx src/scripts/populate-data.ts
npx tsx src/scripts/backfill-slugs.ts
```
These scripts require a live DB — run only against a dev/test database.

## Code Style

Each service has a `.prettierrc`. Configs differ by service:
- **Frontend** — `singleQuote: true`, `semi: false`, `printWidth: 100`
- **Backend / Notification Service** — `singleQuote: false`, `semi: true`, `printWidth: 100`

Frontend ESLint uses `eslint-config-prettier` to disable rules that conflict with Prettier.

## CI

`.github/workflows/ci.yml` runs on every push and PR: backend install → build → test, then frontend install → lint → build. Node.js 20.
