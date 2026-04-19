# One-to-One Interaction (1 Student : 1 Coach)

The classic private session. This interaction type focuses on a direct connection between one student and one coach.

## 📋 Session Behavior
- **Capacity:** Exactly 1 student and 1 coach per session.
- **Assignment Priority:** The system identifies a single "Lead" coach.

## ⚙️ Assignment Strategies
### Round-Robin
- **Behavior:** The system rotates through the pool of active team coaches.
- **Fairness:** Each new booking increments the order, ensuring no single coach is overwhelmed.
- **Availability:** If the "next" coach is busy, the system skips to the next available one in the rotation.

### Direct Assignment
- **System Pick:** The student chooses a specific coach from the list.
- **Availability:** Only shows times when that specific coach is free.

## 📅 Booking Modes
### Flexible (Coach Availability)
- The system aggregates the weekly schedules of the coach pool and presents valid time blocks to the student.

### Fixed (Predefined Slots)
- **Pinned Slots:** If a coach is assigned to the slot, they are automatically the Lead.
- **Open Slots:** If no coach is assigned, **Round-Robin** picks the Lead when the student books.
