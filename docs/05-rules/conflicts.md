# Conflicts — and how each was resolved

> **What this is:** the three stakeholder conflicts, the evidence used and the resolution. **For:** sponsor, Sales, customer service, operations, PO. **Previous:** [allocation rules](allocation-rules.md) · **Next:** [how the simulation works](../06-simulation/model.md).

*Fictional people and figures. Simulation figures are medians over 200 nights from [results.md](../06-simulation/results.md).*

## C-1 Who sails first

| | Customer service (S-03) | Sales (S-02) | Operations / load planning (S-05) |
|---|---|---|---|
| Said | "Fair is first come, first served." (Q-11) | "Contract customers come first. Full stop." (Q-12) | "Perishables and drivers first." (Q-13) |
| Underlying need | A rule agents can defend on the phone | Key accounts never left until last, and told early | Nothing spoils; no driver sleeps in a cab |
| What the data said | Today's order is "first to *call*", not "first booked" | Today key accounts are handled *last* (16 h to an answer) | Their proposal leaves ADR slots unused on the relief sailing |

**How it was resolved:** each proposal written as rules, simulated on the same 200 nights, measures fixed before the results were shown, a combined policy built rule by rule in the room, the sponsor deciding — see the [policy workshop](../03-workshops/policy-workshop.md).

| Median of 200 nights | First booked | Key accounts first | Perishables & drivers first | **Recommended (D-04)** |
|---|---|---|---|---|
| Perishables after deadline | 20 | 23 | 9 | **10** |
| Delay, contract customers | 19.6 h | 12.7 h | 20.0 h | 19.8 h |
| Delay, other customers | 19.6 h | 25.3 h | 20.0 h | 20.2 h |
| Driver waiting hours | 2,373 | 2,486 | 1,832 | 1,841 |

**What each party got:** customer service gets one explainable order with a reason per line; Sales gets an allotment share on every sailing, answers within the hour and the plan visible to account managers at 17:00; operations gets perishables and drivers first, plus R-15. **What each party gave up:** Sales gives up absolute priority; other customers wait about half an hour longer on average than under pure booking order.

## C-2 Who owns the constraint data

| | Load planner (S-05) | PO Booking Platform (S-07) |
|---|---|---|
| Position | "Check every reefer and ADR booking with me." (Q-04) | "No manual step in a flow that runs at 2 a.m." |
| Underlying need | Control over what goes on the deck | Data in the platform, testable |

**Resolution (D-03):** plugs, ADR slots and deck height become attributes of each sailing in the booking platform; **load planning maintains them** and remains the owner. The load planner keeps control over the values without being on the phone at night. Risk X-06 (wrong values) is covered in the storm drill (BAT-08).

## C-3 Who presses send

| | Customer service (S-03) | Operations (S-01) |
|---|---|---|
| Position | "We approve every message — we get the calls." | "Send automatically, speed is the point." |
| Underlying need | No surprises for agents | Certainty within the hour |

**Resolution (D-02):** the duty manager approves the *plan* once; messages follow the plan; customer service sees every message and every reason (US-13) before the customer calls. Cost: ±30 minutes per storm (A-30) — kept, because a plan nobody approved is a plan nobody owns.
