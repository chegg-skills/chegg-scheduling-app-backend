# One-to-Many Interaction (1 Coach : Multiple Students)

A group session or webinar-style interaction where one coach handles multiple participants simultaneously.

## 📋 Session Behavior
- **Capacity:** 1 Coach : X Students (defined by `maxParticipantCount`).
- **Session Consistency:** To prevent session splitting, the **first student** to book a slot "locks" the coach for that time. All subsequent students who book the same slot are automatically assigned to that same coach.

## ⚙️ Assignment Strategies
### Round-Robin
- The **first student** triggers the Round-Robin rotation to pick a Lead.
- Subsequent students join the existing session without moving the Round-Robin counter.

### Direct Assignment
- The event is pinned to a specific coach. All participants join that coach's session.

## 📅 Booking Modes
### Flexible (Coach Availability)
- Slots are generated based on the team pool. Once a session starts, it remains "open" for more students until the capacity is reached.

### Fixed (Predefined Slots)
- Very common for masterclasses. Slots are created at specific times (e.g., 2:00 PM).
- Multiple students can join the same slot until it's full.
