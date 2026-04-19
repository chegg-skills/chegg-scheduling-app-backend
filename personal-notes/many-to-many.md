# Many-to-Many Interaction (Multiple Coaches : Multiple Students)

The most complex interaction type, used for collaborative group sessions, workshops, or large-scale labs.

## 📋 Session Behavior
- **Capacity:** Multiple Coaches : Multiple Students.
- **Complexity:** Combines **Session Consistency** (locking the team for students) with **Co-Host Rotation** (fairly distributing staff).

## ⚙️ Assignment Strategies
### Round-Robin
- **Initial Setup:** The first student to book a slot triggers the full team assignment (1 Lead + X Co-Hosts).
- **Workload Balance:** The system rotates the entire "Coaching Team" state, ensuring everyone on the team gets a fair turn leading or supporting.

### Leadership Strategies
- **Rotating Lead:** Every session gets a new lead from the pool.
- **Fixed Lead:** A specific person (e.g., a Lead Instructor) always leads, while support staff (Co-Hosts) rotate.
- **Single Coach:** On-demand lead assignment via fixed slots.

## 📅 Booking Modes
### Flexible (Coach Availability)
- Requires complex "Team Availability" checks to ensure the entire required staff is free simultaneously before showing a slot to students.

### Fixed (Predefined Slots)
- Highly recommended for stability. Slots are locked to specific times, and the system handles the staff rotation behind the scenes when the first participant joins.
