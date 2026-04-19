# Many-to-One Interaction (Multiple Coaches : 1 Student)

Collaborative coaching or panel-style sessions where a single student is supported by a team of coaches.

## 📋 Session Behavior
- **Capacity:** Multiple Coaches : 1 Student.
- **Roles:**
  - **Lead:** The primary coach responsible for the session.
  - **Co-Hosts:** Additional support coaches (defined by `targetCoHostCount`).

## ⚙️ Assignment Strategies
### Round-Robin
- **Lead Rotation:** The system picks the next available Lead from the pool.
- **Co-Host Rotation:** The system then picks the next available `X` co-hosts from the remaining pool.
- **Overlap Prevention:** The system ensures no coach is assigned as both Lead and Co-Host for the same session.

### Direct Assignment
- The student picks a specific Lead. The system then automatically rotates co-hosts to support that lead based on availability.

## 📅 Booking Modes
### Flexible (Coach Availability)
- **Shared Availability:** A slot is only "available" if the Lead **and** the required number of Co-Hosts are all free at the same time.

### Fixed (Predefined Slots)
- Usually used for structured reviews. The slot is created, and the system fills the "hiring" needs (Lead + Co-Hosts) when the student books, using Round-Robin for any unassigned roles.
