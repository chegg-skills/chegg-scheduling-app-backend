# Weekly Engineering Update — week of Jun 15–21, 2026

**TL;DR (paste-ready):**

- 🔎 **Admin slot-availability debug tooling** — admins can now see _exactly_ why a student sees no slots, per coach, inline on the booking & reschedule pages.
- 📊 **Live Lesson Tracker** — new `/tracker` page for ONE_TO_MANY sessions with date nav, occupancy/log status, and deep-links into bookings.
- 🗓️ **Tracker reporting** — calendar dot indicators, date-range filtering, and CSV export.
- ✉️ **Invitation audit trail** — full invite status history (Pending/Accepted/Expired/Revoked) + one-click revoke, TEAM_ADMIN-scoped.
- ❓ **Per-event custom booking questions** — server-driven questions with admin-managed system defaults.
- Plus: ROUND_ROBIN for ONE_TO_MANY, coach conflict checks, URL state persistence, TEAM_ADMIN scoping, a backend structure refactor, and a large frontend decomposition pass.

---

## Headline implementations

### 1. Admin slot-availability debug tooling (#157, #160)

When a student reports "no slots available," an admin (SUPER_ADMIN / TEAM_ADMIN /
COACH) can open the same booking URL, pick a date, and see **every generated slot
with exact per-coach reasons** — conflict, exception block, outside availability,
notice window, booking window, capacity full, or in the past.

- **Backend:** new `GET /events/:eventId/slots/debug` (authenticate + authorize).
  Refactored `evaluateCoachAvailability` out of `isCoachAvailable` as the single
  source of truth (`isCoachAvailable` is now a thin wrapper — booking behavior
  unchanged). Fixed a cross-midnight buffer-wrap bug (`isStartWithinWindow`).
- **Frontend:** `usePublicSessionUser` silent-auth hook + `useSlotDebugReport`
  React Query hook; rendered as an **inline third column** in `SlotStep` and
  `FollowUpScheduleStep` (toggled by "Troubleshoot Slots", internal users only).

### 2. Live Lesson Tracker for ONE_TO_MANY sessions (#144, #145, #146, #147)

New `/tracker` page (SUPER_ADMIN + TEAM_ADMIN) showing all ONE_TO_MANY fixed-slot
sessions for a selected date across teams: occupancy status, session-log status,
series ordinal, sticky filter card with date nav, and inline `LogSessionDialog`.
Polished with a themed date picker, tab-style filters, and a coach column;
**deep-links** from the Tracker straight into an event's Bookings tab.

### 3. Tracker reporting — dots, date-range filter & CSV export (#162)

- **Calendar dot indicators:** dates with available slots / sessions now show an
  orange dot on the booking, reschedule, and Tracker calendars (consistent UX).
  New `GET /v1/tracker/session-dates` (minimal `startTime`-only select).
- **Date-range filtering + CSV export** on the Tracker so admins can pull a
  session report for any selected range.

### 4. Invitation audit trail (#149)

New "Invitations" tab on the Users page: every invite's status
(Pending/Accepted/Expired/Revoked), who sent it and when, with **one-click revoke**
of pending invites. TEAM_ADMIN scope enforced (they only see invites they created).

### 5. Per-event custom booking questions + system defaults (#142)

Replaced hardcoded booking fields with a fully server-driven questions system.

- New `SystemBookingQuestion` model (max 5, ordered, XSS-sanitized), CRUD at
  `/system-settings/booking-questions` (SUPER_ADMIN).
- `resolveEffectiveBookingQuestions` returns the right set (custom vs system
  default); bookings snapshot `customQuestions`/`customAnswers` at booking time,
  with answer-count validation. (Also fixed a CSRF-on-logout bug.)

## Other improvements

- **ROUND_ROBIN assignment for ONE_TO_MANY events** (#151) — incl. auto-adding the
  fixed-lead coach to the pool on update; DIRECT validation scoped to
  COACH_AVAILABILITY.
- **Coach conflict check in the slot dialog** + buffer hidden for group events (#150).
- **URL state persistence** — all page-level filters and tab state now persist in
  the URL (shareable/back-button-friendly) (#159).
- **TEAM_ADMIN scoping & visibility fixes** across events/bookings + iframe embed
  and event-creation UX (#140, #141, #147).
- **Backend structure refactor** — scripts split (ops/dev), auth/http shared
  modules, route-prefix cleanup (#163).
- **Frontend decomposition pass** — broke up PublicBookingDirectory,
  BookingDetailsRightSection, BookFollowUpDialog, SendEmailDialog, EventGroupSections;
  consolidated user-identity rendering into shared primitives; added a
  `useCopyToClipboard` hook (#152–#156, #158, #161).
- **Interaction-type logic fix** + workflow doc cleanup (#143).
