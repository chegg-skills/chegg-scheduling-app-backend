# One-to-Many Stress Test Report

This report documents the performance and session consistency logic for a One-to-Many interaction type (Group Session).

## Test Configuration
- **Event ID:** `03d2d844-3936-48fa-9e94-bcc9119d2c76`
- **Name:** Live lesson - one to many
- **Interaction Type:** `ONE_TO_MANY`
- **Assignment Strategy:** `DIRECT` (Lead: Sofia Agents)
- **Booking Mode:** `FIXED_SLOTS`
- **Slot Time:** 2026-04-30 06:40:00 UTC
- **Capacity Tested:** 20 Students

---

## Stress Test Results (Created: 2026-04-19)

| # | Student | Assigned Host | Status | Error |
|---|---|---|---|---|
| 1 | Group Student 1 | Sofia Agents | SUCCESS | - |
| 2 | Group Student 2 | Sofia Agents | SUCCESS | - |
| 3 | Group Student 3 | Sofia Agents | SUCCESS | - |
| 4 | Group Student 4 | Sofia Agents | SUCCESS | - |
| 5 | Group Student 5 | Sofia Agents | SUCCESS | - |
| 6 | Group Student 6 | Sofia Agents | SUCCESS | - |
| 7 | Group Student 7 | Sofia Agents | SUCCESS | - |
| 8 | Group Student 8 | Sofia Agents | SUCCESS | - |
| 9 | Group Student 9 | Sofia Agents | SUCCESS | - |
| 10 | Group Student 10 | Sofia Agents | SUCCESS | - |
| 11 | Group Student 11 | Sofia Agents | SUCCESS | - |
| 12 | Group Student 12 | Sofia Agents | SUCCESS | - |
| 13 | Group Student 13 | Sofia Agents | SUCCESS | - |
| 14 | Group Student 14 | Sofia Agents | SUCCESS | - |
| 15 | Group Student 15 | Sofia Agents | SUCCESS | - |
| 16 | Group Student 16 | Sofia Agents | SUCCESS | - |
| 17 | Group Student 17 | Sofia Agents | SUCCESS | - |
| 18 | Group Student 18 | Sofia Agents | SUCCESS | - |
| 19 | Group Student 19 | Sofia Agents | SUCCESS | - |
| 20 | Group Student 20 | Sofia Agents | SUCCESS | - |

### Analysis
- **Success Rate:** **100%** (20/20).
- **Session Consistency:** All 20 students were correctly assigned to the same host (**Sofia Agents**).
- **Capacity Management:** The system successfully handled 20 concurrent participants after the event capacity was increased from 15 to 20.
- **Assignment Logic:** confirmed that in `ONE_TO_MANY` mode, the system correctly bypasses individual coach rotation for overlapping students, ensuring all participants join the same session with the resolved lead coach.
