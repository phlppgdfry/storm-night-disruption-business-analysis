# Allocation rules

> **What this is:** the agreed recovery policy as sixteen rules, a decision table and executable examples. **For:** developers, tester, customer service (to explain), the duty manager (to trust). **Previous:** [UML](../04-process/uml.md) · **Next:** [conflicts](conflicts.md).

*Fictional operator. The rules below are implemented once in [`site/assets/lib/allocate.mjs`](../../site/assets/lib/allocate.mjs); the prototype, the simulation and the examples all call that one module, and CI runs the [23 examples](features/allocation.feature) on every change. The module exists to prove the rules are precise enough to build and test — not to suggest that the analyst writes production code.*

## The rules

### Hard constraints — never broken, not even by an override

| ID | Rule | Why | Examples |
|---|---|---|---|
| R-01 | A unit can only be planned on a sailing whose booking cut-off (90 min before departure) has not passed. | Later changes miss the stowage plan (Q-04). | SC-01 |
| R-02 | Planned lane metres never exceed the free lane metres of the sailing. | Physics. | SC-02 |
| R-03 | Reefers only go on a sailing with a free reefer plug. | P-03 | SC-03, SC-16 |
| R-04 | ADR units only go on a sailing with a free ADR slot. | Safety; P-03 | SC-04 |
| R-05 | Project cargo only goes on a sailing with a high deck. | P-03 | SC-05 |
| R-06 | A unit without a customs pre-lodgement is held, not planned, until the pre-lodgement exists. | Q-08, P-07 | SC-06 |
| R-13 | A unit is only planned on a sailing it can reach: at the terminal 60 minutes before departure. | No planned no-shows | SC-17 |

### Order — who goes first when capacity is short (decision D-04)

| ID | Rule | Why | Examples |
|---|---|---|---|
| R-15 | **Scarce slots first:** ADR and project units are planned before the lane metres are handed out, onto sailings that have their slot. | Otherwise ADR slots on early sailings go unused and ADR units drift to Sunday (D-06) | SC-19, SC-20 |
| R-07 | **Class 1:** perishable reefers, earliest deadline first. | G-03; Q-13 | SC-07, SC-08 |
| R-08 | **Class 2:** accompanied units (a driver is waiting), earliest arrival first. | G-05; Q-07 | SC-09, SC-10 |
| R-09 | **Contract allotment:** contract customers have first claim on their allotment share (45%) of every recovery sailing — a first claim, not space kept empty. | Q-03, Q-12; D-04 | SC-11, SC-12 |
| R-10 | **Everyone else:** original sailing first, then original booking time. | Q-11 — "first booked, first rebooked", not "first to call" | SC-02, SC-13 |

### Stability and people

| ID | Rule | Why | Examples |
|---|---|---|---|
| R-11 | A confirmed unit is never moved to a later sailing by a replan round. | Certainty once given is kept (G-01) | SC-14 |
| R-12 | The duty manager may override a unit's sailing with a reason code; hard constraints still apply. | D-02; Q-17 | SC-15, SC-16 |
| R-14 | A perishable that cannot sail before its deadline is planned as early as possible and escalated to customer service. | Somebody calls the customer before the strawberries spoil (Q-05) | SC-14, SC-18 |
| R-16 | When a sailing's capacity is reduced (vessel swap), confirmed units that no longer fit are re-planned first and escalated. R-11 protects against replans, not against a smaller ship. | Storm drill finding F-5 ([BAT](../09-acceptance/storm-drill.md#triage)); decision D-11 | SC-23 |

## Decision table — which class, and what then

| # | ADR or project? | Perishable flag (US-02)? | Driver with the unit? | Contract customer? | Class / pass | Ordered by | Placed on |
|---|---|---|---|---|---|---|---|
| 1 | yes | – | – | – | Scarce (R-15) | original sailing, booking time | earliest sailing with the slot (R-04/R-05) that fits R-01, R-02, R-13 |
| 2 | no | yes | – | – | 1 (R-07) | deadline | earliest sailing that fits; escalate if after deadline (R-14) |
| 3 | no | no | yes | – | 2 (R-08) | gate-in time | earliest sailing that fits |
| 4 | no | no | no | yes | 3a (R-09) | original sailing, booking time | per sailing, within the contract share; then with everyone in 3b |
| 5 | no | no | no | no | 3b (R-10) | original sailing, booking time | per sailing, first with room at its queue position |
| – | *any unit without a customs pre-lodgement* | | | | Held (R-06) | — | not planned; replanned when released |
| – | *any unit with a valid override* | | | | Override (R-12) | — | the chosen sailing, if R-01–R-05 and R-13 allow |

Units a sailing cannot take (plug, ADR slot, deck, reach) move on to the next sailing in the same pass; nobody loses their place in the queue for a later pass.

## Every allocation explains itself

Each plan line carries its reasons, in the order they were applied. This is what the [why-panel](../08-design/recovery-board.md#why-panel-scr-02) shows and what customer service reads out (US-06, US-13). Two real lines from the plan built for Storm Kestrel (night #12) at Thursday 16:50:

```text
U-0016  reefer, perishable, deliver by Fri 17:52
  R-07 class 1: perishable, deadline Fri 17:52
  TW-27 skipped: no reefer plug left
  → TWX-1 Fri 10:00, earliest sailing that fits

U-0203  trailer, contract customer
  R-10 queue position 1 (original sailing TW-21, booked Sun 18:09)
  TW-27 full before this unit's turn
  R-09 within the contract allotment share of TWX-1 (45%)
  → TWX-1 Fri 10:00
```

The second line shows something the workshop had to accept: the first recovery sailing (TW-27) is full of ADR units, perishables and waiting drivers before anyone in the ordinary queue gets a turn — even queue position 1.

## Examples

The 23 examples in [`features/allocation.feature`](features/allocation.feature) are Given/When/Then with tables, one or more per rule, plus three that show how the rejected proposals behave (`@policy`). Run them:

```bash
node --test tests/allocation.test.mjs
```

[`scripts/check-trace.mjs`](../../scripts/check-trace.mjs) fails the build if a rule has no tagged example, or if `allocate.mjs` and this document disagree on which rules exist.
