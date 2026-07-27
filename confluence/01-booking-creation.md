# Booking Creation

Handles a student booking a session against an event. Resolves a coach (or none,
for anonymous events) and writes the booking record atomically under a row lock.
This is the highest-traffic write path in the system, and the one most exposed to
concurrency bugs. See the concurrency section near the bottom.

## Code traces

| Component | File | Key functions |
|---|---|---|
| Route | [`booking.router.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/domain/bookings/booking.router.ts) | `POST /` — `bookingCreationLimiter`, `validate(CreateBookingSchema)` |
| Controller | [`booking.controller.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/domain/bookings/booking.controller.ts) | Thin delegation to the service |
| Service | [`booking.service.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/domain/bookings/booking.service.ts) | `createBooking`, `acquireLocksAndSelectCoach`, `computeSessionTimeWindow` |
| Coach resolver | [`bookingAssignmentResolver.service.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/domain/bookings/bookingAssignmentResolver.service.ts) | `resolveBookingCoachSelection`, `prefetchCoachAvailability` |
| Locking + writes | [`booking.repository.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/domain/bookings/booking.repository.ts) | `lockEvent`, `lockScheduleSlot`, `lockCoach`, `lockStudent`, `createBookingRecord` |
| Notification enqueue | [`notification.publisher.ts`](https://github.com/chegg-skills/chegg-scheduling-app-backend/blob/main/backend/src/shared/notifications/notification.publisher.ts) | `publishNotificationSafely` |

## Full flow, including branches

```mermaid
flowchart TD
    A[POST /api/bookings] --> B[Rate limit + Zod validation]
    B --> C[Normalize student input, parse start time]
    C --> D[Load event + active coach pool]
    D --> E{Active coaches on event?}
    E -- none --> E1[503 Service Unavailable]
    E -- at least one --> F{allowStudentCoachChoice<br/>and no preferredCoachId?}
    F -- yes --> F1[400 Bad Request]
    F -- no --> G[computeSessionTimeWindow<br/>asserts notice window]
    G --> H{Event uses FIXED_SLOTS?}
    H -- yes --> H1{Matching slot found?}
    H1 -- no --> H2[409 Conflict]
    H1 -- yes --> I[BEGIN TRANSACTION]
    H -- no, COACH_AVAILABILITY --> I

    I --> J{matchedScheduleSlot?}
    J -- yes --> K[lockScheduleSlot FOR UPDATE]
    J -- no --> L[lockEvent FOR UPDATE]

    K --> M[resolveBookingCoachSelection]
    L --> M
    M --> M1{allowAnonymousBooking?}
    M1 -- yes --> M2[assignedCoachId = null, skip to student step]
    M1 -- no --> M3{Existing group session<br/>at this time?}
    M3 -- yes --> M4[Reuse existing coaching team]
    M3 -- no --> M5{SINGLE_COACH leadership?}
    M5 -- yes --> M6[resolveSingleHostSelection]
    M5 -- no --> M7[Resolve lead + fill co-hosts<br/>round-robin or fixed]

    M2 --> N{assignedCoachId not null?}
    M4 --> N
    M6 --> N
    M7 --> N
    N -- yes --> N1[lockCoach FOR UPDATE]
    N -- no --> O
    N1 --> O{FIXED_SLOTS mode?}
    O -- yes --> O1[Capacity check]
    O1 -- full --> O2[409 Conflict]
    O1 -- has room --> P
    O -- no --> P[Upsert student, lockStudent,<br/>assert no overlap]
    P -- overlap found --> P1[409 Conflict]
    P -- no overlap --> Q[INSERT booking, status = CONFIRMED]
    Q --> R[COMMIT]
    R -- pool/tx timeout --> R1["409 Conflict (mapped from P2024/P2028,<br/>never surfaces as 500)"]
    R -- success --> S[Best-effort audit log]
    S --> T[Enqueue notification, fire-and-forget]
    T --> U[201 Created]
```

## Sequence view

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Router
    participant Service as booking.service.ts
    participant Resolver as bookingAssignmentResolver.service.ts
    participant DB as PostgreSQL (tx)

    Student->>Router: POST /api/bookings
    Router->>Router: rate limit + Zod validation
    Router->>Service: createBooking(payload)

    Service->>Service: normalize student input, parse start time
    Service->>DB: load event + active coach pool
    Service->>Service: resolve booking questions
    Service->>Service: computeSessionTimeWindow (asserts notice window)
    Service->>DB: match a fixed slot, if this event uses one

    Note over Service,DB: guard — no coaches on event (503),<br/>coach-choice required but missing (400)

    Service->>DB: BEGIN TRANSACTION
    alt matchedScheduleSlot present (FIXED_SLOTS)
        Service->>DB: lockScheduleSlot — SELECT ... FOR UPDATE
    else COACH_AVAILABILITY mode
        Service->>DB: lockEvent — SELECT ... FOR UPDATE
    end

    Service->>Resolver: resolveBookingCoachSelection(tx)
    Resolver->>DB: prefetchCoachAvailability — 6 batched IN queries<br/>(timezones, event overrides, weekly, exceptions,<br/>conflicting bookings, conflicting slot assignments)
    Resolver->>Resolver: rank + select coach (see round-robin page)
    Resolver-->>Service: assignedCoachId, coCoachUserIds

    opt assignedCoachId is not null
        Service->>DB: lockCoach — SELECT ... FOR UPDATE
    end

    opt FIXED_SLOTS
        Service->>DB: capacity check
    end

    Service->>DB: upsert student, lockStudent, assert no overlap
    Service->>DB: INSERT booking (status = CONFIRMED)
    Service->>DB: COMMIT

    Service->>DB: best-effort audit log (BOOKING_CREATED)
    Service->>Service: publishNotificationSafely (fire-and-forget)
    Service-->>Student: 201 Created { booking }
```

## Lock order

`acquireLocksAndSelectCoach` in `booking.service.ts` branches on whether a
schedule slot was matched. It doesn't lock both:

```typescript
if (args.matchedScheduleSlot) {
  await lockScheduleSlot(tx, args.matchedScheduleSlot.id);
} else {
  await lockEvent(tx, args.event.id);
}
// ... resolve coach ...
if (selection.assignedCoachId !== null) {
  await lockCoach(tx, selection.assignedCoachId);
}
```

Across all three booking entry points (create, reschedule, follow-up) the order is
always slot-or-event, then coach, then student. Never both slot and event in the
same request. That consistency is what keeps concurrent transactions safe from
lock-order deadlocks: two requests can never end up each holding what the other
one wants.

Why lock the event or slot at all? `ROUND_ROBIN` assignment ranks coaches by
team-wide booking count, and that ranking only holds up if coach selection and
booking creation commit as one atomic unit before the next concurrent request
reads the same counts. The row lock is what buys that atomicity.

## A concurrency bug we found and fixed here

Every query run inside the transaction has to use the transaction's own client
(`tx`), not the global `prisma` client. There was a bug where the coach
availability lookup queried through the global client while still inside the
locked transaction. Under concurrent load that query needed a second connection
from the database pool, but every other connection was already tied up by
requests queued behind the same lock — so the pool deadlocked and requests started
timing out as HTTP 500s.

The fix was making that query transaction-bound throughout. We confirmed it with a
stress-test script (`backend/src/scripts/dev/concurrent-booking-test.ts`): 20
concurrent requests against a 13-coach pool came back as 13 successes, 7 clean
conflicts, and zero server errors, all in about 600ms.

## Validation and edge cases

| Condition | Status | Where enforced |
|---|---|---|
| No active coaches on the event | 503 | Pre-transaction guard |
| Notice window violated | 400-class | `computeSessionTimeWindow` |
| FIXED_SLOTS request with no matching slot | 409 | Slot-matching step |
| Seat capacity full (FIXED_SLOTS only) | 409 | `assertParticipantCapacityAvailable` |
| Student already has an overlapping booking | 409 | `assertStudentNotOverlapping` |
| Pool/transaction timeout under extreme load | 409, mapped from Prisma `P2024`/`P2028` | `.catch` on the transaction, never surfaces as 500 |

## Related pages

**Reschedule & Cancellation** reuses this same lock skeleton. **Coach Availability
& Round Robin** covers what happens inside `resolveBookingCoachSelection`.
