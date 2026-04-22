# Internal Scheduling Platform — Product Overview & Roadmap

The Internal Scheduling Platform is a full-stack, multi-tenant session booking system designed to centralize and automate session management across Chegg teams.

---

## Table of Contents

1. [Test Links & Credentials](#1-test-links--credentials)
2. [Executive Summary](#2-executive-summary)
3. [Current Challenges & Strategic Motivation](#3-current-challenges--strategic-motivation)
4. [Proposed Solution](#4-proposed-solution)
5. [Session Interaction Model](#5-session-interaction-model)
6. [Platform Architecture](#6-platform-architecture)
7. [API Reference](#7-api-reference)
8. [Core Booking Flow](#8-core-booking-flow)
9. [Scheduling & Availability Engine](#9-scheduling--availability-engine)
10. [Coach Assignment Engine](#10-coach-assignment-engine)
11. [Notification System](#11-notification-system)
12. [Analytics & Reporting](#12-analytics--reporting)
13. [Public Booking Experience](#13-public-booking-experience)
14. [Security & Access Control](#14-security--access-control)
15. [Key Feature Matrix](#15-key-feature-matrix)
16. [Infrastructure & Deployment Logistics](#16-infrastructure--deployment-logistics)
17. [Pending Technical Debt — V1](#17-pending-technical-debt--v1)

---

## 1. Test Links & Credentials

**Scheduling tool test links and walkthrough:**

- **App**: [https://chegg-scheduling-frontend.onrender.com/](https://chegg-scheduling-frontend.onrender.com/)
- **Booking Page**: [https://chegg-scheduling-frontend.onrender.com/book](https://chegg-scheduling-frontend.onrender.com/book)
- **Video Walkthrough**: *(Coming Soon)*

### Super Admin Login

To explore the complete administrative functionality, including Team Management, Event Creation, and other core workflows, please use the following credentials:

- **Email**: `mohitkumar3005@example.com`
- **Password**: `pass1234`

---

## 2. Executive Summary

The Internal Scheduling Platform is a full-stack, multi-tenant session booking system built to replace fragmented external tools (Calendly, Zoom ISV, manual trackers) with a single, centralized platform owned and operated by Chegg.

The platform supports four session shapes — One-to-One, One-to-Many, Many-to-One, and Many-to-Many — with configurable coach assignment strategies, group capacity management, automated notifications, and built-in analytics. Students book sessions through public-facing pages without requiring an account. Coaches and administrators manage everything through an authenticated dashboard.

The system is production-deployed on Render (backend + frontend) with PostgreSQL and RabbitMQ, and has been stress-tested for concurrent booking scenarios across all four interaction types.

---

## 3. Current Challenges & Strategic Motivation

---

## 4. Proposed Solution

Build a centralized, API-first scheduling platform that acts as the single source of truth for all session types across all teams.

### Design Principles

- **Multi-tenant** — Teams are isolated; TEAM_ADMINs see only their own data.
- **Public by design** — Students book without creating an account; all booking pages are publicly accessible via slugs.
- **Async notifications** — Email delivery is decoupled from booking creation via a message queue.
- **Extensible interaction model** — Four hardcoded session shapes cover all known use cases; adding a new shape requires only a new enum value and its capability flags.
- **Concurrency-safe** — Row-level database locks prevent double-booking under concurrent load.
### Key Performance Indicators (KPIs)

- **Booking Success Rate**: Percentage of initiated bookings that reach `CONFIRMED` status without conflict.
- **Assignment Latency**: Time taken to resolve coach availability and lock a session during high concurrent load.
- **Notification Deliverability**: P99 latency for email delivery from the RabbitMQ cluster to the recipient.
- **Coach Utilization**: Automated tracking of workload distribution across the coach pool (Fairness Metric).

---

## 5. Session Interaction Model

The platform organizes all session types around two axes: **how many coaches are in a session** and **how many students are in a session**. This yields four interaction types:

| Interaction Type | Coaches per Session | Students per Session | Primary Use Case |
|---|---|---|---|
| **ONE_TO_ONE** | 1 | 1 | Individual tutoring, office hours, mock interviews |
| **ONE_TO_MANY** | 1 | Many | Group workshops, webinars, live Q&A |
| **MANY_TO_ONE** | Many (pool) | 1 | Panel reviews, multi-expert coaching |
| **MANY_TO_MANY** | Many (pool) | Many | Large workshops with co-facilitators |

### Booking Modes

| Mode | Description | When Used |
|---|---|---|
| `COACH_AVAILABILITY` | Students pick from open windows on a coach's rolling schedule | ONE_TO_ONE (default), MANY_TO_ONE |
| `FIXED_SLOTS` | Admin pre-creates specific session slots; students book into them | ONE_TO_MANY, MANY_TO_MANY (enforced) |

### Assignment Strategies

| Strategy | Behaviour |
|---|---|
| `DIRECT` | A specific coach is pinned as session lead. For MANY_TO_* types, requires `fixedLeadCoachId`. |
| `ROUND_ROBIN` | Rotates through the coach pool using a persistent `nextCoachOrder` cursor. Requires `minCoachCount ≥ 2`. |

### Session Leadership Strategies

| Strategy | Behaviour |
|---|---|
| `SINGLE_COACH` | One coach, no co-host concept. Default for ONE_TO_ONE and ONE_TO_MANY. |
| `FIXED_LEAD` | One pinned lead coach (`fixedLeadCoachId`). Co-hosts rotate around them. |
| `ROTATING_LEAD` | Lead rotates via ROUND_ROBIN through the pool. Co-hosts selected from remaining coaches. |

---

## 6. Platform Architecture

The platform is a monorepo with three independently deployable services:

```
chegg-scheduling-app/
├── backend/                Node.js 20 / Express REST API
│   ├── src/domain/         Feature domains (events, bookings, teams, users, ...)
│   ├── src/shared/         Infrastructure (db, middleware, notifications, error, utils)
│   ├── src/routes/         Route aggregator — mounts all domains under /api/v1
│   ├── prisma/             Schema + migrations (PostgreSQL)
│   └── tests/              Integration test suite (Jest + supertest)
│
├── frontend/               React 18 SPA (Vite bundler)
│   ├── src/pages/          Route-level page components
│   ├── src/components/     Shared UI components and domain-specific components
│   ├── src/hooks/          React Query data hooks + utility hooks
│   ├── src/api/            Axios API client functions
│   ├── src/context/        React contexts (auth, confirm, bookingView)
│   └── src/constants/      Interaction type caps, labels, options
│
└── notification-service/   Node.js RabbitMQ consumer (email delivery)
    ├── src/consumers/      Message handlers (main queue + DLQ)
    ├── src/templates/      HTML email templates (per notification type)
    ├── src/channels/       Notification channel abstraction (Email, registry)
    ├── src/scheduler/      Polling sweep for scheduled reminders
    └── src/services/       Mailer, notification orchestration, repository
```

### Request Path

```
Student / Browser
    │
    ▼
React SPA (frontend, port 3000 dev / CDN in prod)
    │  /api/* proxied to backend (Vite dev) or via direct URL (prod)
    ▼
Express REST API (backend, port 4000)
    │  Auth middleware → Rate limiting → Zod validation
    ▼
Domain Service (e.g. booking.service.ts)
    │  Business logic, locking, assignment
    ▼
Prisma ORM → PostgreSQL
    │
    └──► RabbitMQ Publisher (async, fire-and-forget)
              │
              ▼
         Notification Service (RabbitMQ consumer)
              │  Renders template, resolves per-recipient timezone
              ▼
         SMTP → Student / Coach / Admin inbox
```

### Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js 20, TypeScript, Express | Domain-driven design |
| ORM | Prisma | PostgreSQL; migrations tracked in `prisma/migrations/` |
| Database | PostgreSQL | UTC storage; separate DBs for backend and notification-service |
| Message queue | RabbitMQ | Main queue + Dead Letter Queue (DLQ) |
| Frontend | React 18, Vite, MUI, React Query, React Router | SPA with React Query server state |
| Email delivery | SMTP via Nodemailer | Retry with exponential backoff (max 3 retries, 3s delay) |
| Auth | JWT (HttpOnly cookie) | CSRF protection middleware |

---

## 7. API Reference

Base path: `/api/v1`

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticate user, returns JWT cookie |
| `POST` | `/auth/logout` | Authenticated | Clear session |
| `POST` | `/auth/register` | Conditional | Self-registration (if `ALLOW_SELF_REGISTER=true`) |
| `POST` | `/auth/bootstrap` | Bootstrap secret | One-time super admin creation |

### Teams

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/teams` | SUPER_ADMIN | Create team |
| `GET` | `/teams` | SUPER_ADMIN, TEAM_ADMIN | List teams |
| `GET` | `/teams/:teamId` | SUPER_ADMIN, TEAM_ADMIN | Get team |
| `PATCH` | `/teams/:teamId` | SUPER_ADMIN | Update team |
| `DELETE` | `/teams/:teamId` | SUPER_ADMIN | Delete team |
| `POST` | `/teams/:teamId/members` | SUPER_ADMIN, TEAM_ADMIN | Add team member |
| `POST` | `/teams/:teamId/members/bulk` | SUPER_ADMIN, TEAM_ADMIN | Bulk add members |
| `GET` | `/teams/:teamId/members` | SUPER_ADMIN, TEAM_ADMIN | List team members |
| `DELETE` | `/teams/:teamId/members/:userId` | SUPER_ADMIN, TEAM_ADMIN | Remove member |

### Events

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/event-offerings` | SUPER_ADMIN, TEAM_ADMIN | Create offering |
| `GET` | `/event-offerings` | SUPER_ADMIN, TEAM_ADMIN | List offerings |
| `PATCH` | `/event-offerings/:offeringId` | SUPER_ADMIN, TEAM_ADMIN | Update offering |
| `DELETE` | `/event-offerings/:offeringId` | SUPER_ADMIN, TEAM_ADMIN | Delete offering |
| `GET` | `/event-offerings/:offeringId/usage` | SUPER_ADMIN | Offering usage stats |
| `GET` | `/event-interaction-types` | SUPER_ADMIN, TEAM_ADMIN | List interaction types with caps |
| `POST` | `/teams/:teamId/events` | SUPER_ADMIN, TEAM_ADMIN | Create event |
| `GET` | `/teams/:teamId/events` | Authenticated | List team events |
| `GET` | `/events` | SUPER_ADMIN, TEAM_ADMIN | List all events |
| `GET` | `/events/:eventId` | SUPER_ADMIN, TEAM_ADMIN | Get event |
| `PATCH` | `/events/:eventId` | SUPER_ADMIN, TEAM_ADMIN | Update event |
| `DELETE` | `/events/:eventId` | SUPER_ADMIN, TEAM_ADMIN | Delete event |
| `POST` | `/events/:eventId/duplicate` | SUPER_ADMIN, TEAM_ADMIN | Duplicate event with coaches |
| `GET` | `/events/:eventId/coaches` | SUPER_ADMIN, TEAM_ADMIN | List event coaches |
| `PUT` | `/events/:eventId/coaches` | SUPER_ADMIN, TEAM_ADMIN | Replace coach pool |
| `DELETE` | `/events/:eventId/coaches/:userId` | SUPER_ADMIN, TEAM_ADMIN | Remove coach from event |
| `GET` | `/events/:eventId/schedule-slots` | SUPER_ADMIN, TEAM_ADMIN | List schedule slots |
| `POST` | `/events/:eventId/schedule-slots` | SUPER_ADMIN, TEAM_ADMIN | Create slot |
| `PATCH` | `/events/:eventId/schedule-slots/:slotId` | SUPER_ADMIN, TEAM_ADMIN | Update slot |
| `DELETE` | `/events/:eventId/schedule-slots/:slotId` | SUPER_ADMIN, TEAM_ADMIN | Delete slot |

### Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/bookings` | **Public** | Create booking (student-facing) |
| `GET` | `/bookings` | SUPER_ADMIN, TEAM_ADMIN, COACH | List bookings (with filters) |
| `GET` | `/bookings/:bookingId` | Authenticated | Get booking |
| `PATCH` | `/bookings/:bookingId` | SUPER_ADMIN, TEAM_ADMIN, COACH | Update status / co-coaches |
| `POST` | `/bookings/:bookingId/reschedule` | **Public + token** | Reschedule via rescheduleToken |

### Users & Invites

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | SUPER_ADMIN, TEAM_ADMIN | List users |
| `GET` | `/users/me` | Authenticated | Own profile |
| `PATCH` | `/users/me` | Authenticated | Update own profile |
| `GET` | `/users/:userId` | SUPER_ADMIN, TEAM_ADMIN | Get user |
| `PUT` | `/users/:userId` | SUPER_ADMIN, TEAM_ADMIN | Full update user |
| `PATCH` | `/users/:userId` | SUPER_ADMIN, TEAM_ADMIN | Partial update user |
| `DELETE` | `/users/:userId` | SUPER_ADMIN, TEAM_ADMIN | Delete user |
| `POST` | `/invites` | SUPER_ADMIN, TEAM_ADMIN | Create invite |
| `POST` | `/invites/accept-invite` | **Public** | Accept invite + set password |

### Availability

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/users/:userId/availability/weekly` | Authenticated (owner) | Set weekly schedule |
| `GET` | `/users/:userId/availability/weekly` | Authenticated (owner) | Get weekly schedule |
| `POST` | `/users/:userId/availability/exceptions` | Authenticated (owner) | Add exception |
| `GET` | `/users/:userId/availability/exceptions` | Authenticated (owner) | List exceptions |
| `DELETE` | `/users/:userId/availability/exceptions/:exceptionId` | Authenticated (owner) | Remove exception |
| `GET` | `/users/:userId/availability/effective` | Authenticated (owner) | Effective availability for date range |

### Students

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/students` | SUPER_ADMIN, TEAM_ADMIN, COACH | List students |
| `GET` | `/students/:studentId` | SUPER_ADMIN, TEAM_ADMIN, COACH | Get student |
| `GET` | `/students/:studentId/bookings` | SUPER_ADMIN, TEAM_ADMIN, COACH | Student booking history |

### Stats

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/stats/dashboard` | Authenticated | Aggregated dashboard overview |
| `GET` | `/stats/bookings` | Authenticated | Booking counts and trends |
| `GET` | `/stats/users` | Authenticated | User activity stats |
| `GET` | `/stats/teams` | Authenticated | Team-level stats |
| `GET` | `/stats/events` | Authenticated | Event stats |
| `GET` | `/stats/offerings` | Authenticated | Offering usage counts |
| `GET` | `/stats/interaction-types` | Authenticated | Events per interaction type |
| `GET` | `/stats/trends` | Authenticated | Booking volume over time |
| `GET` | `/stats/teams/performance` | Authenticated | Per-team: bookings, completion rate |
| `GET` | `/stats/activity/peaks` | Authenticated | Peak booking times, busiest coaches |

### Reports (CSV Downloads)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/reports/bookings` | SUPER_ADMIN, TEAM_ADMIN | Bookings CSV |
| `GET` | `/reports/performance` | SUPER_ADMIN, TEAM_ADMIN | Coach performance CSV |
| `GET` | `/reports/students` | SUPER_ADMIN, TEAM_ADMIN | Student engagement CSV |

### Public (Unauthenticated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/public/teams` | List active teams |
| `GET` | `/public/teams/slug/:slug` | Get team by slug |
| `GET` | `/public/teams/slug/:slug/events` | List team events by slug |
| `GET` | `/public/teams/:teamId/events` | List team events by ID |
| `GET` | `/public/events/slug/:slug` | Get event by slug |
| `GET` | `/public/coaches/slug/:slug` | Get coach by slug |
| `GET` | `/public/coaches/slug/:slug/events` | List coach's events |
| `GET` | `/public/events/:eventId/slots` | Available slots for date range |
| `GET` | `/public/bookings/:id?token=:rescheduleToken` | Get booking (reschedule flow) |

---

## 8. Core Booking Flow

The booking creation path (`POST /api/v1/bookings`) is the most complex flow in the system. It coordinates validation, scheduling policy enforcement, coach assignment, concurrency control, and record creation — all within a single database transaction.

### End-to-End Sequence

```
Student submits booking form
        │
        ▼
1. INPUT VALIDATION (Zod schema)
   ─ Validate studentName, studentEmail, teamId, eventId, startTime, timezone
   ─ Normalize: email → lowercase, name → trimmed

        │
        ▼
2. EVENT VALIDATION
   ─ Load event (with coaches, schedule slots, routing state)
   ─ Assert event is active and belongs to specified team
   ─ Assert at least one active coach exists in pool

        │
        ▼
3. SCHEDULING POLICY CHECKS
   ─ assertBookingWeekdayAllowed: is the requested day in allowedWeekdays[]?
   ─ assertBookingNoticeSatisfied: is (startTime - now) ≥ minimumNoticeMinutes?

        │
        ▼
4. SLOT RESOLUTION
   ─ resolveMatchingScheduleSlot: find EventScheduleSlot by eventId + exact startTime
   ─ For FIXED_SLOTS events: slot MUST exist → 409 CONFLICT if not found

        │
        ▼
5. DATABASE TRANSACTION BEGIN (timeout: 15s)
   │
   ├── 5a. PESSIMISTIC LOCK
   │   ─ If FIXED_SLOTS: SELECT ... FROM EventScheduleSlot WHERE id = ? FOR UPDATE
   │   ─ If COACH_AVAILABILITY: SELECT ... FROM Event WHERE id = ? FOR UPDATE
   │
   ├── 5b. COACH ASSIGNMENT
   │   ─ resolveBookingCoachSelection:
   │     ├── Check for existing session at this time (group bookings join existing session)
   │     ├── Resolve lead coach (DIRECT → fixedLeadCoachId, ROUND_ROBIN → nextCoachOrder)
   │     ├── Validate lead is available (weekly calendar + exceptions + no conflicts)
   │     └── Resolve co-hosts for MANY_TO_* types (up to targetCoHostCount)
   │
   ├── 5c. LOCK HOST
   │   ─ SELECT ... FROM User WHERE id = assignedCoachId FOR UPDATE
   │   ─ Prevents another concurrent transaction from double-assigning this coach
   │
   ├── 5d. CAPACITY CHECK
   │   ─ getEffectiveParticipantPolicy: resolve maxParticipants from slot or event
   │   ─ countActiveParticipantsForTime: count non-cancelled bookings at this startTime
   │   ─ assertParticipantCapacityAvailable: throw 409 if at capacity
   │
   ├── 5e. STUDENT UPSERT
   │   ─ Find or create Student by email
   │   ─ Set firstBookedAt on creation; update lastBookedAt always
   │
   └── 5f. BOOKING RECORD CREATION
       ─ Insert Booking with: studentId, scheduleSlotId, coachUserId, coCoachUserIds,
         startTime, endTime, timezone, meetingJoinUrl, status=CONFIRMED,
         rescheduleToken (auto-UUID)

        │
        ▼
6. POST-TRANSACTION NOTIFICATIONS (async, fire-and-forget)
   ─ BOOKING_CONFIRMED → student (in student's timezone)
   ─ COACH_BOOKING_ASSIGNED → lead coach (in coach's timezone)
   ─ TEAM_BOOKING_CONFIRMED → each team admin (in admin's timezone)
   ─ COACH_BOOKING_COCOACH_ASSIGNED → each co-host (in co-host's timezone)
   ─ SESSION_REMINDER_24H → student (scheduled 24h before startTime)
   ─ SESSION_REMINDER_1H → student (scheduled 1h before startTime)
```

### Concurrency Safety

The booking transaction uses three distinct locks to prevent race conditions:

1. **Slot lock** (`FOR UPDATE` on `EventScheduleSlot`) — serializes concurrent bookings into the same group session slot.
2. **Event lock** (`FOR UPDATE` on `Event`) — used when no slot exists (COACH_AVAILABILITY mode) to serialize capacity checks.
3. **Coach lock** (`FOR UPDATE` on `User`) — prevents two concurrent transactions from assigning the same coach to overlapping sessions.

All locks are held within a single Prisma interactive transaction with a 15-second timeout (raised from the default 5s to accommodate remote database latency on cloud deployments).

---

## 9. Scheduling & Availability Engine

### Coach Availability Resolution

When generating available booking slots, the engine layers three sources in priority order:

```
highest priority
      │
      ▼
1. Availability Exceptions (UserAvailabilityException)
   ─ Date-specific overrides: either fully blocked (isUnavailable=true)
     or a custom window (isUnavailable=false with startTime/endTime)
      │
      ▼
2. Weekly Calendar (UserWeeklyAvailability)
   ─ Recurring weekly windows: dayOfWeek + startTime + endTime
   ─ Interpreted in the coach's stored timezone (User.timezone)
      │
      ▼
3. Conflict Detection (Booking table)
   ─ Existing confirmed/pending bookings at overlapping times
   ─ For FIXED_SLOTS group events: existing bookings at same slot
     do NOT block the slot (shared session sharing is intentional)
lowest priority
```

Additionally, `bufferAfterMinutes` is added to each session's `endTime` before conflict checking — coaches get breathing room between sessions even if the next student can book immediately.

### Slot Generation (COACH_AVAILABILITY mode)

For each day in the requested range:

1. Check `allowedWeekdays` — skip if day not permitted.
2. Assert minimum notice — skip any slots that fall within `minimumNoticeMinutes` from now.
3. Merge weekly availability + exceptions for that day into a list of available windows.
4. Within each window, generate candidate slots of `durationSeconds` length.
5. For each candidate, call `isCoachAvailable()` — filter out slots blocked by existing bookings.
6. Return surviving slots with `remainingSeats` derived from participant capacity settings.

### Slot Matching (FIXED_SLOTS mode)

`resolveMatchingScheduleSlot(eventId, startTime)` performs an exact match on `(eventId, startTime)` against `EventScheduleSlot`. If no match is found, booking is rejected with a 409 CONFLICT — students cannot book outside of pre-defined slots.

---

## 10. Coach Assignment Engine

`bookingAssignmentResolver.service.ts` handles the logic for choosing which coach leads a session and which co-hosts join.

### Lead Coach Resolution

```
SINGLE_COACH strategy:
  └── assignmentStrategy = DIRECT  → use event.fixedLeadCoachId (if set) or only coach in pool
  └── assignmentStrategy = ROUND_ROBIN → pick coach at nextCoachOrder, advance cursor

FIXED_LEAD strategy (MANY_TO_ONE / MANY_TO_MANY with DIRECT):
  └── Always use event.fixedLeadCoachId

ROTATING_LEAD strategy (MANY_TO_ONE / MANY_TO_MANY with ROUND_ROBIN):
  └── Rotate lead using EventRoutingState.nextCoachOrder cursor
```

For group session types (`multipleParticipants = true`), the engine first checks if an existing booking already exists for this slot — if so, the same coach assignment is reused so all participants share one session.

### Co-host Resolution (MANY_TO_* types)

After the lead is selected, remaining active coaches in the pool are selected as co-hosts:

- Co-hosts rotate via the same `nextCoachOrder` cursor (advances regardless of whether lead was DIRECT or ROUND_ROBIN).
- The number of co-hosts is capped by `targetCoHostCount` (if set). `null` = all remaining coaches join.
- Each co-host's availability is validated before assignment.

### Meeting Link Resolution

`meetingJoinUrl` is sourced from the lead coach's `User.zoomIsvLink`. If the coach has no Zoom ISV link configured, `meetingJoinUrl` is stored as `null`.

---

## 11. Notification System

The notification system is a standalone microservice (`notification-service/`) that consumes messages published by the backend via RabbitMQ and delivers them as HTML emails.

### Message Flow

```
Backend (booking.service.ts)
  │  publishNotificationSafely({ type, recipients, variables, sendAt?, notificationKey? })
  ▼
RabbitMQ (main queue)
  │  Consumed by notificationConsumer.ts
  ▼
notificationService.ts
  │  Deduplication via notificationKey
  │  Scheduled delivery via sendAt (stored in notifications table, swept by scheduler)
  ▼
EmailChannel → mailer.ts (SMTP)
  │  renderTemplate(type, variables) → HTML
  │  Retry: up to 3 attempts, 3s delay
  ▼
Student / Coach / Admin inbox
```

Dead-letter queue (DLQ) captures failed messages after max retries. A polling scheduler sweeps pending scheduled notifications every 60 seconds (batch size: 25).

### Notification Types

| Type | Recipient | Trigger |
|---|---|---|
| `BOOKING_CONFIRMED` | Student | Booking created |
| `BOOKING_RESCHEDULED` | Student, Coach, Co-hosts | Booking rescheduled |
| `BOOKING_CANCELLED` | Student, Coach, Co-hosts, Team Admins | Booking cancelled |
| `BOOKING_NO_SHOW` | Student, Coach, Co-hosts, Team Admins | Status set to NO_SHOW |
| `COACH_BOOKING_ASSIGNED` | Lead coach | Booking created |
| `COACH_BOOKING_COCOACH_ASSIGNED` | Each co-host | Booking created / co-host added |
| `COACH_BOOKING_CANCELLED` | Lead coach | Booking cancelled |
| `COACH_BOOKING_COCOACH_CANCELLED` | Each co-host | Booking cancelled |
| `COACH_BOOKING_COCOACH_NO_SHOW` | Each co-host | No-show recorded |
| `TEAM_BOOKING_CONFIRMED` | Each team admin | Booking created |
| `TEAM_BOOKING_CANCELLED` | Each team admin | Booking cancelled |
| `TEAM_BOOKING_NO_SHOW" | Each team admin | No-show recorded |
| `SESSION_REMINDER_24H" | Student | 24 hours before session start (scheduled) |
| `SESSION_REMINDER_1H" | Student | 1 hour before session start (scheduled) |
| `USER_INVITED" | Invitee | Invite created |
| `TEAM_MEMBER_ADDED" | New member | Added to team |
| `CANCEL_BOOKING_REMINDERS" | _(control message)_ | Booking cancelled/no-show — cancels scheduled reminders |


---

## 12. Analytics & Reporting

### Dashboard Stats (`GET /stats/dashboard`)

Aggregated snapshot: total bookings, active users, active teams, upcoming sessions.

### Booking Stats (`GET /stats/bookings`)

- Total bookings
- Upcoming bookings (startTime > now, status = CONFIRMED)
- Completed bookings
- Cancelled bookings
- Most booked coach
- Most booked team

### Booking Trends (`GET /stats/trends`)

Booking volume bucketed over time (day / week / month based on `timeframe` parameter).

### Team Performance (`GET /stats/teams/performance`)

Per team: total bookings, completion rate, active member count.

### Peak Activity (`GET /stats/activity/peaks`)

Busiest times of day, busiest coaches, busiest teams.

### Other Stat Endpoints

- `/stats/users` — new users, active users, pending invites, coach count
- `/stats/teams` — new teams, active teams, active members, teams with events
- `/stats/events` — new events, active events, round-robin events, coached events
- `/stats/offerings` — usage count per offering
- `/stats/interaction-types` — event count per interaction type

All stat endpoints accept a `?timeframe=week|month|year` query parameter. TEAM_ADMINs are automatically scoped to their own team's data.

### CSV Reports

| Report | Endpoint | Columns |
|---|---|---|
| Bookings | `GET /reports/bookings` | Booking ID, Date/Time (UTC), Status, Team, Event, Coach, Student Name, Student Email, Duration (Min), Objectives, Specific Question, Notes |
| Coach Performance | `GET /reports/performance` | Coach Name, Email, Total Bookings, Completed, No-Show, Cancelled, Completion Rate (%) |
| Student Engagement | `GET /reports/students` | Student Name, Email, Total Sessions, First Booked, Last Booked |

---

## 13. Public Booking Experience

Students book sessions without creating an account. Three URL entry points are supported:

| URL Pattern | Scope | Example |
|---|---|---|
| `/book` | Directory — student picks team, then event | All teams |
| `/book/team/:teamSlug` | Pre-selected team — student picks event | `chegg.com/book/team/math-team` |
| `/book/event/:eventSlug` | Pre-selected event — goes straight to slot picker | `chegg.com/book/event/math-101` |
| `/book/coach/:coachSlug` | Pre-selected coach — shows coach's events | `chegg.com/book/coach/alice-smith` |

### Booking Steps by Scope

| Scope | Steps |
|---|---|
| Directory | Team → Event → Schedule → Confirm |
| Team / Coach | Event → Schedule → Confirm |
| Event | Schedule → Confirm |

### DIRECT Assignment Events

For events using `assignmentStrategy = DIRECT`, the schedule step shows a coach picker card grid above the calendar. Students must select a specific coach before slots are loaded (slots are fetched filtered by `preferredCoachId`). For ROUND_ROBIN events, no coach picker is shown — coach assignment is invisible to the student.

### Reschedule Flow

Students receive a unique `rescheduleToken` in their confirmation email. The reschedule URL (`/reschedule/:bookingId?token=:token`) authenticates the student without requiring a login and allows them to pick a new time for their existing booking.

---

## 14. Security & Access Control

### Roles

| Role | Capabilities |
|---|---|
| `SUPER_ADMIN` | Full access to all teams, events, users, and system settings |
| `TEAM_ADMIN` | Manage their own team's events, members, bookings, and coaches |
| `COACH` | View own bookings and students; update booking status (COMPLETED, NO_SHOW) |

### Authentication

- JWT stored in HttpOnly cookies (XSS-resistant).
- CSRF protection middleware on all state-mutating endpoints.
- Brute-force protection: `failedLoginAttempts` counter + `lockedUntil` timestamp on `User`.
- Bootstrap endpoint (`POST /auth/bootstrap`) is only callable when no users exist in the system, gated by `BOOTSTRAP_SECRET`.

### Rate Limiting

Applied at middleware level on public and authentication endpoints to prevent abuse.

### Input Validation

All request bodies are validated with Zod schemas before reaching service layer. Schema errors return structured 400 responses with field-level messages.

### Public Endpoint Security

- Public booking endpoints expose only `isActive = true` records.
- Sensitive user fields (role, password, `isActive`, `failedLoginAttempts`) are excluded from public API responses.
- Reschedule access is gated by `rescheduleToken` (unique UUID stored on each booking) — no session or auth cookie required, but the token is required.

---

## 15. Key Feature Matrix

| Feature | Status | Notes |
|---|---|---|
| **Booking Types** | ✅ Done | One-to-One, One-to-Many, Many-to-One, and Many-to-Many. |
| **Assignment Logic** | ✅ Done | Round-Robin and Direct coach assignment strategies. |
| **Availability** | ✅ Done | Weekly calendars and override exceptions. |
| **Scheduling** | ✅ Done | Pre-defined fixed slots and dynamic availability logic. |
| **Concurrency** | ✅ Done | Pessimistic locking and row-level safety during bookings. |
| **Self-Service** | ✅ Done | Token-gated rescheduling and booking cancellations. |
| **Notifications** | ✅ Done | Multi-recipient, timezone-aware HTML emails. |
| **Reporting** | ✅ Done | Real-time analytics dashboards and CSV data exports. |
| **Multi-tenancy** | ✅ Done | Full RBAC and data isolation between different teams. |

---

## 16. Infrastructure & Deployment Logistics

To maintain high development velocity and ensure production-grade reliability, the following tools and services are required at different milestones within each version.

### Version 1 (Foundational — Current)
**Primary Goal**: Rapid feature delivery and production stabilization.

| Category | Required Tools & Services | Purpose |
|---|---|---|
| **AI Development**| **Cursor** + **Claude 3.5 Sonnet** | Agentic coding, automated refactors, and rapid documentation. |
| **Cloud Hosting** | **Render (Web Services & DB)** | Simplified deployment for Frontend and Backend. |
| **API Testing** | **Postman** / **Insomnia** | Verification of REST endpoints and Zod validation logic. |
| **Design** | **Figma** | Maintaining UI/UX consistency with Chegg’s design system. |

### Version 2 (Scale & Integration)
*(Empty / TBD)*

### Version 3 (Enterprise Modernization)
*(Empty / TBD)*

---

## 17. Pending Technical Debt — V1

These items are identified as necessary improvements to stabilize the V1 foundation before moving to V2.

| Task | Priority | Status |
|---|---|---|
| Standardize Error Mapping | High | 🏗️ Planned |
| Implement Structured Logging | Medium | 🏗️ Planned |
| Increase Frontend Type Coverage | Medium | 🏗️ In Progress |
| Add API Rate Limiting to Public Endpoints | High | ✅ Done |

*This document serves as the high-level product reference for the Chegg Internal Scheduling Platform. For detailed API documentation or environment setup, refer to project technical specifications.*
