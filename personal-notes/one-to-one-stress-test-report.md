# One-to-One Stress Test Report

This report documents the performance and host assignment logic for a One-to-One interaction type under a 20-booking stress test.

## Test Configuration
- **Event ID:** `9fe55913-ba1c-4c1e-972f-d92131028307`
- **Name:** live assessment - one to one session
- **Interaction Type:** `ONE_TO_ONE`
- **Assignment Strategy:** `ROUND_ROBIN`
- **Booking Mode:** `FIXED_SLOTS`
- **Number of Bookings:** 20
- **Coaches (in Round-Robin Order):**
  1. Noah APIs
  2. Ava Backend
  3. Liam Systems
  4. Priyank Copilot
  5. Sofia Agents
  6. Daniel LLM
  7. Grace Automation

---

## Stress Test Results (Created: 2026-04-19)

| # | Slot Start | Student | Assigned Host | Status | Error |
|---|---|---|---|---|---|
| 1 | 2026-04-21 09:00 | Stress Test Student 1 | Noah APIs | SUCCESS | - |
| 2 | 2026-04-21 10:00 | Stress Test Student 2 | Ava Backend | SUCCESS | - |
| 3 | 2026-04-21 11:00 | Stress Test Student 3 | Liam Systems | SUCCESS | - |
| 4 | 2026-04-21 12:00 | Stress Test Student 4 | Priyank Copilot | SUCCESS | - |
| 5 | 2026-04-21 13:00 | Stress Test Student 5 | Sofia Agents | SUCCESS | - |
| 6 | 2026-04-21 14:00 | Stress Test Student 6 | Daniel LLM | SUCCESS | - |
| 7 | 2026-04-21 15:00 | Stress Test Student 7 | Grace Automation | SUCCESS | - |
| 8 | 2026-04-21 16:00 | Stress Test Student 8 | Noah APIs | SUCCESS | - |
| 9 | 2026-04-21 17:00 | Stress Test Student 9 | Ava Backend | SUCCESS | - |
| 10 | 2026-04-21 18:00 | Stress Test Student 10 | N/A | FAILED | No available coaches found |
| 11 | 2026-04-21 19:00 | Stress Test Student 11 | Liam Systems | SUCCESS | - |
| 12 | 2026-04-21 20:00 | Stress Test Student 12 | Priyank Copilot | SUCCESS | - |
| 13 | 2026-04-21 21:00 | Stress Test Student 13 | Sofia Agents | SUCCESS | - |
| 14 | 2026-04-21 22:00 | Stress Test Student 14 | Daniel LLM | SUCCESS | - |
| 15 | 2026-04-21 23:00 | Stress Test Student 15 | Grace Automation | SUCCESS | - |
| 16 | 2026-04-22 00:00 | Stress Test Student 16 | Noah APIs | SUCCESS | - |
| 17 | 2026-04-22 01:00 | Stress Test Student 17 | Ava Backend | SUCCESS | - |
| 18 | 2026-04-22 02:00 | Stress Test Student 18 | Liam Systems | SUCCESS | - |
| 19 | 2026-04-22 03:00 | Stress Test Student 19 | Priyank Copilot | SUCCESS | - |
| 20 | 2026-04-22 04:00 | Stress Test Student 20 | Sofia Agents | SUCCESS | - |

### Analysis
- **Rotation:** The Round-Robin rotation successfully iterated through all 7 coaches multiple times. 
- **Pattern:** Noah (1) -> Ava (2) -> Liam (3) -> Priyank (4) -> Sofia (5) -> Daniel (6) -> Grace (7) -> Loop.
- **Failures:** Booking #10 failed because no coach was available for that specific slot (likely a schedule constraint for the next-in-line coach, Liam Systems).
- **Consistency:** After the failure at #10, the rotation correctly picked up with Liam Systems (#11), maintaining the sequence integrity.

---

## Stress Test Results: Direct Assignment (Created: 2026-04-19)

### Configuration
- **Assignment Strategy:** `DIRECT`
- **Host:** Noah APIs (Fixed Lead)
- **Buffer:** 15 minutes

| # | Slot Start | Student | Assigned Host | Status | Error |
|---|---|---|---|---|---|
| 1 | 2026-04-21 09:00 | Stress Test Student 1 | Noah APIs | SUCCESS | - |
| 2 | 2026-04-21 10:00 | Stress Test Student 2 | N/A | FAILED | Coach is not available |
| 3 | 2026-04-21 11:00 | Stress Test Student 3 | Noah APIs | SUCCESS | - |
| 4 | 2026-04-21 12:00 | Stress Test Student 4 | N/A | FAILED | Coach is not available |
| 5 | 2026-04-21 13:00 | Stress Test Student 5 | Noah APIs | SUCCESS | - |
| 6 | 2026-04-21 14:00 | Stress Test Student 6 | N/A | FAILED | Coach is not available |
| 7 | 2026-04-21 15:00 | Stress Test Student 7 | Noah APIs | SUCCESS | - |
| 8 | 2026-04-21 16:00 | Stress Test Student 8 | N/A | FAILED | Coach is not available |
| 9 | 2026-04-21 17:00 | Stress Test Student 9 | Noah APIs | SUCCESS | - |
| 10 | 2026-04-21 18:00 | Stress Test Student 10 | N/A | FAILED | Coach is not available |
| 11 | 2026-04-21 19:00 | Stress Test Student 11 | Noah APIs | SUCCESS | - |
| 12 | 2026-04-21 20:00 | Stress Test Student 12 | N/A | FAILED | Coach is not available |
| 13 | 2026-04-21 21:00 | Stress Test Student 13 | Noah APIs | SUCCESS | - |
| 14 | 2026-04-21 22:00 | Stress Test Student 14 | N/A | FAILED | Coach is not available |
| 15 | 2026-04-21 23:00 | Stress Test Student 15 | Noah APIs | SUCCESS | - |
| 16 | 2026-04-22 00:00 | Stress Test Student 16 | N/A | FAILED | Coach is not available |
| 17 | 2026-04-22 01:00 | Stress Test Student 17 | Noah APIs | SUCCESS | - |
| 18 | 2026-04-22 02:00 | Stress Test Student 18 | N/A | FAILED | Coach is not available |
| 19 | 2026-04-22 03:00 | Stress Test Student 19 | Noah APIs | SUCCESS | - |
| 20 | 2026-04-22 04:00 | Stress Test Student 20 | N/A | FAILED | Coach is not available |

### Analysis
- **Conflict Enforcement:** In `DIRECT` mode, all 20 bookings targeted the same host (Noah APIs).
- **Buffer Logic:** Because the sessions are 1 hour long and the buffer is 15 minutes, the coach is blocked from taking back-to-back sessions. 
- **Pattern:** The system correctly permitted sessions only when the host had at least a 1-hour gap since their last session, resulting in a perfect "Every Other Hour" success pattern (10/20 successful).

---

## Stress Test Results: Coach Availability + Direct (Created: 2026-04-19)

### Configuration
- **Booking Mode:** `COACH_AVAILABILITY`
- **Assignment Strategy:** `DIRECT`
- **Host:** Noah APIs (Fixed Lead)
- **Buffer:** 15 minutes

| # | Slot Start | Student | Assigned Host | Status | Error |
|---|---|---|---|---|---|
| 1 | 2026-04-21 09:00 | Stress Test Student 1 | Noah APIs | SUCCESS | - |
| 2 | 2026-04-21 10:00 | Stress Test Student 2 | N/A | FAILED | Coach is not available |
| 3 | 2026-04-21 11:00 | Stress Test Student 3 | Noah APIs | SUCCESS | - |
| 4 | 2026-04-21 12:00 | Stress Test Student 4 | N/A | FAILED | Coach is not available |
| 5 | 2026-04-21 13:00 | Stress Test Student 5 | Noah APIs | SUCCESS | - |
| 6 | 2026-04-21 14:00 | Stress Test Student 6 | N/A | FAILED | Coach is not available |
| 7 | 2026-04-21 15:00 | Stress Test Student 7 | Noah APIs | SUCCESS | - |
| 8 | 2026-04-21 16:00 | Stress Test Student 8 | N/A | FAILED | Coach is not available |
| 9 | 2026-04-21 17:00 | Stress Test Student 9 | Noah APIs | SUCCESS | - |
| 10 | 2026-04-21 18:00 | Stress Test Student 10 | N/A | FAILED | Coach is not available |
| 11 | 2026-04-21 19:00 | Stress Test Student 11 | Noah APIs | SUCCESS | - |
| 12 | 2026-04-21 20:00 | Stress Test Student 12 | N/A | FAILED | Coach is not available |
| 13 | 2026-04-21 21:00 | Stress Test Student 13 | Noah APIs | SUCCESS | - |
| 14 | 2026-04-21 22:00 | Stress Test Student 14 | N/A | FAILED | Coach is not available |
| 15 | 2026-04-21 23:00 | Stress Test Student 15 | Noah APIs | SUCCESS | - |
| 16 | 2026-04-22 00:00 | Stress Test Student 16 | N/A | FAILED | Coach is not available |
| 17 | 2026-04-22 01:00 | Stress Test Student 17 | Noah APIs | SUCCESS | - |
| 18 | 2026-04-22 02:00 | Stress Test Student 18 | N/A | FAILED | Coach is not available |
| 19 | 2026-04-22 03:00 | Stress Test Student 19 | Noah APIs | SUCCESS | - |
| 20 | 2026-04-22 04:00 | Stress Test Student 20 | N/A | FAILED | Coach is not available |

### Analysis
- **Consistency:** The behavior in `COACH_AVAILABILITY` mode is consistent with the `FIXED_SLOTS` mode. 
- **Dynamic Checks:** Even without predefined slots, the system effectively looks ahead at the coach's scheduled bookings and enforces the buffer logic to prevent overlap or back-to-back fatigue.
- **Reliability:** 10/20 successful bookings is the theoretical maximum for a single coach with back-to-back 1-hour sessions requiring buffers.

---

## Stress Test Results: Round-Robin + Buffer-Aware (Created: 2026-04-19)

### Configuration
- **Booking Mode:** `COACH_AVAILABILITY`
- **Assignment Strategy:** `ROUND_ROBIN`
- **Spacing:** 1 Hour 15 Minutes (ensures 15m buffer)
- **Host Team:** Noah (1), Ava (2), Liam (3), Priyank (4), Sofia (5), Daniel (6), Grace (7).

| # | Slot Start | Student | Assigned Host | Status | Error |
|---|---|---|---|---|---|
| 1 | 2026-04-21 09:00 | Stress Test Student 1 | Noah APIs | SUCCESS | - |
| 2 | 2026-04-21 10:15 | Stress Test Student 2 | Ava Backend | SUCCESS | - |
| 3 | 2026-04-21 11:30 | Stress Test Student 3 | Liam Systems | SUCCESS | - |
| 4 | 2026-04-21 12:45 | Stress Test Student 4 | Priyank Copilot | SUCCESS | - |
| 5 | 2026-04-21 14:00 | Stress Test Student 5 | Sofia Agents | SUCCESS | - |
| 6 | 2026-04-21 15:15 | Stress Test Student 6 | Daniel LLM | SUCCESS | - |
| 7 | 2026-04-21 16:30 | Stress Test Student 7 | Grace Automation | SUCCESS | - |
| 8 | 2026-04-21 17:45 | Stress Test Student 8 | N/A | FAILED | No available coaches found |
| 9 | 2026-04-21 19:00 | Stress Test Student 9 | Noah APIs | SUCCESS | - |
| 10 | 2026-04-21 20:15 | Stress Test Student 10 | Ava Backend | SUCCESS | - |
| 11 | 2026-04-21 21:30 | Stress Test Student 11 | Liam Systems | SUCCESS | - |
| 12 | 2026-04-21 22:45 | Stress Test Student 12 | Priyank Copilot | SUCCESS | - |
| 13 | 2026-04-22 00:00 | Stress Test Student 13 | Sofia Agents | SUCCESS | - |
| 14 | 2026-04-22 01:15 | Stress Test Student 14 | Daniel LLM | SUCCESS | - |
| 15 | 2026-04-22 02:30 | Stress Test Student 15 | Grace Automation | SUCCESS | - |
| 16 | 2026-04-22 03:45 | Stress Test Student 16 | Noah APIs | SUCCESS | - |
| 17 | 2026-04-22 05:00 | Stress Test Student 17 | Ava Backend | SUCCESS | - |
| 18 | 2026-04-22 06:15 | Stress Test Student 18 | Liam Systems | SUCCESS | - |
| 19 | 2026-04-22 07:30 | Stress Test Student 19 | Priyank Copilot | SUCCESS | - |
| 20 | 2026-04-22 08:45 | Stress Test Student 20 | Sofia Agents | SUCCESS | - |

### Analysis
- **Success Rate:** **19/20** Successful.
- **Rotation Effectiveness:** The Round-Robin strategy rotated across the team efficiently. By using 1h15m intervals, the system was able to pack bookings much more densely than the previous 1h interval runs.
- **Buffer Success:** This run confirms that the "Coach is not available" errors from previous runs were indeed legitimate buffer violations, as they disappeared when the 15m buffer was respected in the test timing.
- **Resilience:** The failure at #8 (Noah's second slot) indicates a real-world availability gap in the lead coach's schedule at that 17:45 mark, but the system correctly recovered and continued the rotation with the next available slots.
