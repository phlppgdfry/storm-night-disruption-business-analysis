# Business acceptance — the storm drill

> **What this is:** business acceptance testing for release 1, run as a drill: replaying Storm Kestrel with the people who will do it for real. **For:** key users, PO, sponsor. **Previous:** [recovery board design](../08-design/recovery-board.md) · **Next:** [pre-mortem](../10-go-live/premortem.md).

*Fictional drill, findings and sign-off.*

## Why a drill

Waiting for a real storm to accept the system means finding defects at 2 a.m. with 900 units stranded (D-08). A drill can be scheduled, repeated and measured. And the AS-IS of the same storm is known: the [reconstruction](../01-the-night/storm-kestrel-reconstruction.md) gives the benchmark.

## Set-up

| | |
|---|---|
| Environment | Acceptance environment with a copy of Storm Kestrel's bookings, sailings and capacity (anonymised customer contacts; messages go to test inboxes and test phones) |
| Key users | Duty manager (S-04), load planner (S-05), two customer-service agents (S-03's team), customs desk (S-08), yard manager (S-06) as observer |
| Role-players | The BA and the tester play customers calling in; Sales (S-02) plays a key account |
| Time | 16:00 – 19:00 on a weekday, clock compressed: replan rounds every 15 minutes |
| Entry criteria | All release-1 stories done; examples green; constraint attributes loaded for all Humber sailings (D-03) |
| Exit criteria | All BAT cases passed or accepted with a workaround; no open severity-1 findings; drill KPIs within target |

## BAT cases

| ID | Case | Stories | Passed when |
|---|---|---|---|
| BAT-01 | Stranded-unit list is complete against the booking system | US-01 | Count per type equals the booking platform's count; three spot checks per type correct |
| BAT-02 | A reefer booking without commodity code is refused in the portal; EDI gets a warning | US-02 | Portal refuses with a clear message; EDI booking accepted with warning |
| BAT-03 | An agent explains three random allocations using only the why-panel | US-06, US-13 | A role-player customer accepts the explanation without the agent asking anyone |
| BAT-04 | The duty manager reviews and approves a 900-unit plan within 30 minutes | US-08, US-09 | Approved within 30 min, including at least one override with reason |
| BAT-05 | Customer message: content, timing, one message per customer | US-11 | Every test inbox has exactly one message within 5 min of approval; content matches the plan |
| BAT-06 | Driver text arrives and the hold-at-origin instruction is understood | US-12 | Two drivers (real, on test phones) restate the instruction correctly |
| BAT-07 | Storm report figures match a manual count | US-14 | K-01 – K-10 within ±1 unit of a manual count |
| BAT-08 | Storm drill: Storm Kestrel replayed end to end | US-03, US-04, US-08, US-10 | No plan line breaks a hard rule; the load planner bumps nothing at the simulated cut-offs |

## Drill log

| Time | Event | Finding |
|---|---|---|
| 16:00 | Cancellation entered | — |
| 16:12 | Board shows 859 units | BAT-01 ✔ — counts match |
| 16:14 | Plan proposed | — |
| 16:16 | Duty manager filters "Escalated": 0; "Held": 39 | F-1 *(minor)*: held units show no expected release time — customs desk asks for "pre-lodgement requested at …" |
| 16:27 | Override: live animals (OV-2) to TW-27 → refused, no plug | F-2 *(major)*: the refusal names R-03 but not the sailing that *would* fit; duty manager had to try three sailings |
| 16:38 | Plan approved | BAT-04 ✔ — 24 minutes |
| 16:41 | Messages in test inboxes | BAT-05 ✔ — one per customer; F-3 *(minor)*: subject line truncated on a phone mail client |
| 16:45 | Driver texts | BAT-06 ✔ — both drivers restated correctly |
| 16:50 – 18:30 | Role-play calls | BAT-03 ✔ — 3/3 explained; agents asked for a "copy reason" button (F-4, *enhancement*) |
| 17:30 | Load planner changes TW-29 plugs from 20 to 12 (vessel swap) | **F-5 *(severity 1)***: TW-29 had 18 reefers confirmed against 20 plugs. After the swap only 12 plugs remained, and the next replan round flagged nothing: R-11 (never move a confirmed unit) kept 6 reefers on a sailing that could not take them. |
| 18:45 | Storm report | BAT-07 ✔ |

## Triage

| Finding | Severity | Decision | Owner |
|---|---|---|---|
| F-5 Capacity reduction does not re-check confirmed units | **1** | **Fixed before go-live.** New rule agreed with the sponsor (D-11): *when a sailing's capacity is reduced, confirmed units that no longer fit are re-planned first and escalated* — R-16, with executable example SC-23, re-tested in the second drill | PO |
| F-2 Override refusal does not suggest a sailing | 2 | Fix before go-live: show the earliest sailing that would accept the unit | PO |
| F-1 Held units without expected release | 3 | After go-live (release 1.1) | PO |
| F-3 Subject line truncated | 3 | Fix (copy change) | BA |
| F-4 "Copy reason" button | enhancement | Backlog | PO |

## Sign-off

Business acceptance **granted on condition** that F-5 and F-2 are fixed and re-tested in a short second drill (TW-29 vessel swap scenario only). The second drill passed: 6 reefers re-planned onto TW-31 and TW-33, all 6 escalated, customer service called the 4 customers before 18:30. Signed by the duty manager (S-04) for operations and the customer-service lead (S-03) for customer service; the PO (S-07) accepted the conditions.

**Lesson for me as BA:** F-5 was in the gap between two rules I wrote — R-11 (stability) and the capacity attributes from D-03. I had tested each rule; I had not asked "what happens when the *input* to a confirmed decision changes?" That question is now in my refinement checklist, and the answer is R-16.
