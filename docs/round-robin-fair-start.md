# Round-Robin Coach Assignment — Options for Fairer Distribution

**Status:** Proposal — seeking team agreement
**Audience:** Product + Engineering
**Decision needed:** Which approach do we want for sharing sessions fairly among coaches?

---

## 1. Why we're discussing this

When an event uses **Round Robin**, the system shares sessions among coaches by going down the coach list in order and looping back to the top:

> Coach 1 → Coach 2 → Coach 3 → Coach 1 → …

Two facts about how it works **today**:

- Each event keeps its **own** "next coach" pointer.
- **Every new event starts that pointer back at the first coach** (same when an event is duplicated or its coach list changes).

**The problem:** because every event starts at the first coach, that coach slowly gets more sessions than the others as we create more events. There's also **no awareness of how busy a coach already is** — a coach drowning in sessions elsewhere still gets an equal share in a new event.

This document lays out **three ways** we could handle this, in plain language, with examples and pros/cons, so the team can choose.

---

## 2. Quick glossary

- **Coach pool** — the list of coaches attached to an event.
- **Rotation pointer** — a marker for "who's next" in the round-robin cycle.
- **Load** — how many sessions a coach already has.
- **Event Type** — the catalog label for an event, e.g. "Mock Interview", "Resume Review".
- **Interaction type** — the structural format, e.g. One-to-One, One-to-Many.

---

## 3. Option 1 — Round Robin **Per Event** (the current approach)

### How it works (plain)
Each event rotates through **its own** coach list, independently of every other event.

### Example
Coaches **Anna, Ben, Carl**. Two events, each a 4-session series.

| Event | Assignment |
|---|---|
| Event A | Anna, Ben, Carl, **Anna** |
| Event B | Anna, Ben, Carl, **Anna** |
| **Totals** | **Anna = 4**, Ben = 2, Carl = 2 |

Both events look identical, and Anna (top of the list) gets the leftover session every time.

> **Optional refinement — "Fair Start":** instead of always starting at Anna, start each new event at the coach who currently has the fewest sessions. With that tweak, Event B would begin at Ben → totals become Anna = 3, Ben = 3, Carl = 2. It reduces the top-of-list bias but the busy coach still takes their normal turn in the cycle (it won't repair a *large* existing gap).

### Pros
- ✅ Simplest — this is already built and tested.
- ✅ Predictable, easy-to-explain order.
- ✅ Events are independent — changing one never affects another.

### Cons
- ❌ No balancing **across** events — the first coach gets overloaded over time.
- ❌ Ignores how busy a coach already is elsewhere.
- ❌ Duplicating an event restarts at the first coach again.
- ⚠️ Even with "Fair Start", it won't fix a coach who is already far ahead.

---

## 4. Option 2 — **Skip the Busiest** (Least-Loaded assignment)

### How it works (plain)
For each new session, give it to the coach who currently has the **fewest** sessions. In effect, coaches with the **most** bookings are skipped until the others catch up.

### Example
Coach **X already has 10 upcoming sessions**; **Y and Z have 0**. We add a 6-session series.

| Session | Counts (X, Y, Z) | Goes to |
|---|---|---|
| 1 | 10, 0, 0 | Y |
| 2 | 10, 1, 0 | Z |
| 3 | 10, 1, 1 | Y |
| 4 | 10, 2, 1 | Z |
| 5 | 10, 2, 2 | Y |
| 6 | 10, 3, 2 | Z |

**Result:** X gets **0** new sessions; Y = +3, Z = +3. Totals: X = 10, Y = 3, Z = 3. The gap actively closes.

### Pros
- ✅ Genuinely even — fixes even **large** existing gaps.
- ✅ Self-correcting over time; the busiest coach naturally pauses until others catch up.
- ✅ Balances **across all events automatically** (when load is counted system-wide).

### Cons
- ❌ Assignment order becomes **load-driven, not positional** — harder for admins to predict who gets what.
- ❌ A coach can be **skipped entirely** for a stretch (may feel odd, or cluster sessions onto the same few coaches).
- ⚠️ More computation (a count per assignment) and we must define **what counts as load** (see §6).
- ⚠️ Bigger change to the core assignment logic → more testing.

---

## 5. Option 3 — Round Robin at **Event-Type Level**

### How it works (plain)
Instead of each event rotating on its own, **all events that share the same Event Type share one rotation pointer.** The "next coach" continues across those events instead of resetting for each one.

### Example
Event Type = **"Mock Interview"**, with three events (E1, E2, E3), all using coaches **Anna, Ben, Carl**, sharing one pointer.

| Event | Sessions | Assignment |
|---|---|---|
| E1 | 2 | Anna, Ben |
| E2 | 2 | Carl, Anna |
| E3 | 2 | Ben, Carl |
| **Totals across the type** | | **Anna = 2, Ben = 2, Carl = 2** ✅ |

Because the pointer **continues** across events of the same type (instead of restarting at Anna each time), the load evens out across the whole "Mock Interview" program.

### Pros
- ✅ Balances across all events of the **same type** with a single continuing cycle.
- ✅ No per-session load math — stays simple and positional.
- ✅ Matches a "per-program" mental model (everything of one type shares the rotation).

### Cons
- ❌ **Breaks down when events of the same type have different coach pools** — e.g. if E2 doesn't include Ben, a shared pointer pointing at Ben is awkward to resolve.
- ❌ **Couples events together** — bookings on one event shift where another event starts.
- ❌ Does **not** balance across *different* event types (a coach busy in another program isn't considered).
- ⚠️ Still positional, so uneven pool sizes/counts can still skew things.
- ⚠️ Needs a new shared-pointer data model + careful handling when two events book at the same moment.

---

## 6. A note on "what counts as load"

Options 2 and 3 both need a rule for **which sessions count** when judging how busy a coach is. We can scope it:

- **Same interaction type** — a One-to-Many event only counts the coach's other One-to-Many sessions (One-to-One load is ignored). Each format is its own fairness bucket.
- **Same Event Type** — only count sessions of the same catalog type (e.g. "Mock Interview" vs "Mock Interview").
- **Global (all types)** — count the coach's total upcoming sessions everywhere (true overall workload).

> Example: Coach X has 10 One-to-One sessions and 0 One-to-Many. Seeding a new One-to-Many event:
> - *Same-type scope* → X's 10 are ignored, X is treated as free for One-to-Many.
> - *Global scope* → X is seen as the busiest and gets fewer.

This scope choice is **independent** of which option we pick, and the team should decide it too.

---

## 7. Side-by-side comparison

| Question | Opt 1: Per Event | Opt 2: Skip Busiest | Opt 3: Event-Type Level |
|---|---|---|---|
| Balances **within** one event | ✅ | ✅ | ✅ |
| Balances **across events of the same type** | ❌ (✅ with Fair Start) | ✅ | ✅ |
| Balances **across all events / types** | ❌ | ✅ (if counted globally) | ❌ |
| Fixes a **large existing gap** | ❌ | ✅ | ❌ |
| Handles **different coach pools** cleanly | ✅ | ✅ | ❌ |
| **Predictable** order for admins | ✅ | ❌ | ✅ |
| Implementation **effort** | None / Low | Medium | Medium-High |
| **Risk** to existing behaviour | None / Low | Medium | Medium |
| Needs **data model change / migration** | No | No | Yes |

---

## 8. Plain-English recommendation

- If the priority is **true fairness even with big existing gaps**, and we accept a less predictable order → **Option 2 (Skip the Busiest)**.
- If the priority is **lowest risk and predictability**, and the imbalance is mild → **Option 1 with Fair Start**.
- If we genuinely think in **programs** (events of the same type as one unit) **and** those events always share the same coach pool → **Option 3**.

There's no single "correct" answer — it depends on how strongly we value perfect balance vs predictability and simplicity.

---

## 9. Decision needed from the team

1. **Which option** do we want — 1 (+ Fair Start), 2, or 3?
2. **What counts as load** — same interaction type, same Event Type, or global?
3. If Option 3: are we OK with the limitation that **events of the same type must share the same coach pool**?

> Please add your name + vote below this line.
