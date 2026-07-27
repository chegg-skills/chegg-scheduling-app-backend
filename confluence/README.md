# Scheduling App

Root page for the Scheduling App folder. Every page listed below should be created
as a child page of this one.

This space documents the Chegg Scheduling Platform, checked directly against the
codebase rather than written from memory: function names, database fields, table
names, and default values are copied straight from the source. Where something
couldn't be confirmed, the page says so instead of guessing. If a page ever
disagrees with the running code, trust the code and flag the page for a fix.

Page references throughout this space are written as plain page titles in bold,
not file links, since Confluence links pages by title once they're created, not by
file path. The table below is the reference list, matching each page's H1 exactly.
Use the exact title when creating each page, otherwise Confluence's search and
auto-linking won't match them up.

Source code links point at `main` on GitHub
(`https://github.com/chegg-skills/chegg-scheduling-app-backend`). Adjust the base
URL if this space ends up mirrored from a different remote.

Mermaid diagrams render natively on GitHub. Confluence needs the "Mermaid
Diagrams" (or equivalent) marketplace app installed, otherwise they'll just show
as plain code blocks.

---

## Master Specification

| Page title | Source file | Covers |
|---|---|---|
| **Chegg Scheduling Platform — Master Specification** | `COMPLETE.md` | Tech stack, architecture, domain model, database, testing, coding standards, deployment, known limitations |

## Feature Lifecycle Guides

| # | Page title | Source file | Primary modules |
|---|---|---|---|
| 01 | **Booking Creation** | `01-booking-creation.md` | `booking.service.ts`, `bookingAssignmentResolver.service.ts`, `booking.repository.ts` |
| 02 | **Reschedule & Cancellation** | `02-reschedule-and-cancellation.md` | `booking.service.ts` |
| 03 | **Coach Availability & Round Robin** | `03-coach-availability-and-round-robin.md` | `assignment.service.ts`, `availability.service.ts` |
| 04 | **Event Creation & Management** | `04-event-creation-and-management.md` | `event.service.ts`, `eventMutation.service.ts`, `event.schema.ts` |
| 05 | **Notification Service & Transactional Outbox** | `05-notification-service-and-outbox.md` | `outbox.worker.ts`, `notification.publisher.ts`, `notificationConsumer.ts` |
| 06 | **Anonymous Booking vs. Deferred Coach Reveal** | `06-anonymous-booking-and-deferred-reveal.md` | `bookingAssignmentResolver.service.ts`, `eventScheduling.service.ts`, `public.service.ts` |
| 07 | **Authentication, SSO & Invite Onboarding** | `07-authentication-and-sso.md` | `auth.service.ts`, `sso.controller.ts`, `shared/middleware/auth.ts` |
| 08 | **Reminders & Scheduled Notifications** | `08-reminders-and-scheduled-notifications.md` | `reminderScheduler.ts`, `scheduledNotificationService.ts` |
| 09 | **Analytics, Reports & Dashboards** | `09-analytics-reports-and-dashboards.md` | `report.service.ts`, `stats.service.ts` |
| 10 | **Group Session Tracker** | `10-group-session-tracker-and-roster.md` | `tracker.service.ts` |
| 11 | **Teams, Roles & Directory Management** | `11-teams-roles-and-directory-management.md` | `team.service.ts`, `bookingDirectory.service.ts`, `user.service.ts` |
| 12 | **Student History & Session Logging** | `12-student-history-and-session-logging.md` | `student.service.ts`, `bookingActivity.service.ts` |

## Role model

The `UserRole` enum (`backend/prisma/schema.prisma`) has exactly three values:
`SUPER_ADMIN`, `TEAM_ADMIN`, `COACH`. "Public" below means unauthenticated
requests — it isn't an actual role value in the schema.

| Role / access | Scope, as enforced in code |
|---|---|
| Unauthenticated (public) | Create bookings, view public event/team/coach pages, reschedule/cancel with a valid token, join sessions. Rate-limited via `publicLimiter` / `bookingCreationLimiter`. |
| `COACH` | Own assigned sessions and own availability, scoped via `buildBookingAccessWhere` (`coachUserId: caller.id`). Can't read `coachNotes`, even on sessions they hosted. |
| `TEAM_ADMIN` | Teams they lead or are an active member of, depending on the specific check — see **Teams, Roles & Directory Management**. Can't edit, invite as, or demote a `SUPER_ADMIN` account. |
| `SUPER_ADMIN` | Unrestricted. Required for system settings and booking-directory administration, guarded via `authorize(SUPER_ADMIN)`. |

## Keeping this space current

Update the relevant page in the same PR that changes the underlying behavior. A
stale doc is worse than no doc. New page: add it to the table above with its
exact title and place it as a child page under Scheduling App.
