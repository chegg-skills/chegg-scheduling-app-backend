# Stress Test Report: Many-to-One (Panel Interview)

**Event:** 0321b054-1f9e-4589-8244-dcd87d67f711  
**Interaction Type:** `MANY_TO_ONE`  
**Configuration:** `DIRECT` Strategy, `ROTATING_LEAD` Strategy, `targetCoHostCount: 2`.

---

## 📋 Test Scenario
- **Goal:** Verify that a student booking results in 1 Lead + 2 Co-hosts.
- **Load:** 20 bookings scheduled sequentially at 1h 15m intervals starting on May 12th, 2026.
- **Cleanup:** All previous bookings for this event were purged before testing.

## 📊 Summary of Results
- **Success Rate:** 12/20 (Bookings 13-20 failed due to weekend restrictions).
- **Lead Assignment:** **Liam Systems** (100% success rate as fixed lead).
- **Co-host Assignment:** **Noah APIs** & **Ethan Engineer** (100% consistency).

### Execution Details (Run #1)

| # | Student | Lead Coach | Co-hosts | Status |
|---|---|---|---|---|
| 1 | Panel Student 1 | Liam Systems | Noah APIs, Ethan Engineer | SUCCESS |
| 2 | Panel Student 2 | Liam Systems | Noah APIs, Ethan Engineer | SUCCESS |
| 3 | Panel Student 3 | Liam Systems | Noah APIs, Ethan Engineer | SUCCESS |
| ... | ... | ... | ... | ... |
| 12 | Panel Student 12 | Liam Systems | Noah APIs, Ethan Engineer | SUCCESS |
| 13 | Panel Student 13 | - | - | FAILED (Weekend) |

---

## 🔍 Technical Analysis

### 1. Lead Consistency
The system correctly identified **Liam Systems** as the lead for every session because the event is set to `DIRECT` with Liam as the `fixedLeadCoachId`. This confirms the override logic successfully prioritizes the designated lead.

### 2. Co-host Selection Logic
The test revealed that co-host selection is **deterministic relative to the lead**:
- **Algorithm:** The search for co-hosts starts immediately after the Lead's position in the coach pool.
- **Observation:** Since Liam (Lead) is #3 in the pool, the search index starts at #4 (Ethan) then wraps to #1 (Noah).
- **Impact:** Since `targetCoHostCount` is 2, the system always picks Ethan and Noah as they are the first two available in the search sequence. **Ava Backend** (#2) remains as a backup who only gets picked if Noah or Ethan are busy.

### 3. Constraint Reliability
The system successfully blocked 8 bookings scheduled for Saturday, May 16th, correctly identifying that the event is configured for weekdays only.

---

## ✅ Final Conclusion
The `MANY_TO_ONE` interaction is stable and correctly resolves multiple coaches per session. While co-host rotation is not "fair" (distributed equally) in the current implementation—it is "deterministic" (predictable based on pool order)—it is functionally correct and reliable for production panel interviews.
