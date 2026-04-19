# Stress Test Report: Many-to-One (Panel Interview) - HYBRID ROTATION

**Event:** 0321b054-1f9e-4589-8244-dcd87d67f711  
**Interaction Type:** `MANY_TO_ONE`  
**Configuration:** `DIRECT` Assignment (Fixed Lead: Ava) + **Rotating Co-hosts**.
**Co-host Count:** 2.
**Pool:** Noah, Ava, Liam, Ethan.

---

## 📊 Summary of Results 
- **Success Rate:** 100% (20/20)
- **Lead Coach:** **Ava Backend** (100% Fixed).
- **Co-host Rotation:** **100% FAIR**. 
    - Co-hosts cycle through the remaining pool (Noah, Liam, Ethan) sequentially.
    - Result: Every person on the team carries an equal co-hosting load.

## 📋 Rotation Trace (Sample)

| # | Student | Lead Coach (Fixed) | Co-hosts (Rotating) |
|---|---|---|---|
| 13 | Student 13 | Ava Backend | Noah APIs, Liam Systems |
| 14 | Student 14 | Ava Backend | Noah APIs, Ethan Engineer |
| 15 | Student 15 | Ava Backend | Liam Systems, Ethan Engineer |
| 16 | Student 16 | Ava Backend | Noah APIs, Liam Systems |

## 🔍 Technical Analysis

### 1. Hybrid Rotation Cursor
The system now supports the "Pinned Lead + Rotating Panel" requirement. 
- The **Lead Host** is determined by the `AssignmentStrategy` (Direct = Fixed; Round Robin = Rotating).
- The **Co-host Panel** always advances the "Pool Cursor" to ensure fair distribution across the remaining team members, regardless of whether the lead is fixed or rotating.

### 2. Verified Fairness
Across the 20-booking run in Direct mode:
- **Lead (Ava):** 20 sessions.
- **Co-host (Noah):** 14 sessions.
- **Co-host (Liam):** 13 sessions.
- **Co-host (Ethan):** 13 sessions.
(Perfectly balanced distribution for the co-host pool).

## ✅ Final Conclusion
The Panel Interview system now supports both **Full Rotation** and **Hybrid Rotation** (Fixed Lead + Rotating Panel). This provides maximum flexibility for academic and professional interview workflows.
