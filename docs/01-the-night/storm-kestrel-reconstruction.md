# Storm Kestrel — reconstruction of one night

> **What this is:** the AS-IS, told as an incident timeline, so everyone argues about the same night. **For:** sponsor, stakeholders, the team. **Previous:** [documentation map](../00-documentation-map.md) · **Next:** [problem statement](problem-statement.md).

*Fictional operator and storm. The figures are those of night #12 in the [simulation](../06-simulation/model.md) — the night whose AS-IS cost is closest to the median of 200 nights — so this story and the model tell the same thing. [Replay it in the war room](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/war-room/?tour).*

## Why a reconstruction first

Before the first interview I asked for one thing: the timeline of the last storm, reconstructed from the booking history, the call logs and the gate-in times. Twelve people had twelve memories of that night. A timeline gives them one, and it turns "the storm was chaos" into questions that have an answer: *when* did we know, *who* was waiting, *what* sailed empty.

## Thursday

| Time | What happened | Who noticed |
|---|---|---|
| **16:00** | The master and the operations director cancel TW-21 (18:00), TW-23 (22:00) and TW-25 (02:00). **859 units** are stranded: 538 trailers, 152 accompanied trucks, 116 reefers (80 with perishable cargo), 43 ADR units, 10 project units. | Duty manager (S-04) |
| 16:05 | The website shows "sailings cancelled". No customer gets a message about *their* unit. | — |
| 16:10 – 19:00 | Customers start calling. Four agents rebook whoever gets through, one unit at a time, on the earliest sailing with lane metres free. The booking screen shows no plugs, no ADR slots, no deck height. | Customer service (S-03) |
| 19:00 | 310 units have a new sailing. 549 do not. The duty manager still has no list of what is stranded. | — |
| 22:00 | The night desk drops to two agents. Hauliers for TW-23 and TW-25 keep arriving, because nobody told them not to. **The yard passes its 650 slots** for stranded units. | Yard manager (S-06) |

## Friday

| Time | What happened | Who noticed |
|---|---|---|
| 00:00 | **453 units have no answer.** 32 units are withdrawn by customers who move them to a competing route. | — |
| 02:00 | Yard peak: **827 stranded units** for 650 slots; trailers on the access road. 152 drivers are waiting in their cabs. Nobody is working on the 453 open units — contract customers wait for their account manager, the rest will call when their office opens. | Yard manager (S-06), driver (S-10) |
| 06:30 | Cut-off for TW-27. | Load planner (S-05) |
| 07:30 | Account managers start calling key accounts — **15½ hours** after the cancellation. | Sales (S-02) |
| 08:00 | TW-27 sails with 88 stranded units. 24 more units are withdrawn. | — |
| 08:30 | Cut-off TWX-1 (relief): the load planner bumps a unit that was booked without a free slot. From here on, every cut-off bumps one or two units — **7 bumps** in total, each one a customer who was told the wrong sailing. | Load planner (S-05) |
| 10:00 | Relief sailing TWX-1 sails with 228 stranded units. | — |
| 10:00 – 20:00 | Rebooking catches up. Recovery sailings leave with **164 lane metres empty in total** while usable units wait in the yard: space freed at cut-off cannot be refilled. | — |

## Saturday

| Time | What happened |
|---|---|
| 04:00 | TW-37 sails with 114 units; the backlog is nearly cleared. |
| 16:00 | The last stranded unit sails. |

## The bill

| | Storm Kestrel, AS-IS |
|---|---|
| Hours until half the units had a confirmed sailing | **15.4 h** |
| Hours until half of the *contract* customers' units were confirmed | **16.1 h** |
| Perishable units sailing after their deadline | **20** of 80 |
| Units withdrawn by customers | **56** |
| Calls offered / abandoned | 104 / 7 |
| Hours drivers waited at the terminal | **3,345 h** |
| Yard over capacity | **12.7 h**, peak 827 units |
| Units bumped at cut-off | 7 |

## What the reconstruction already told us

1. **The problem is not the phones.** Customer service handled the calls that came. The problem is that most units had *nobody* working on them for fifteen hours, because the process waits for the customer to call ([D-01](../03-workshops/decision-log.md)).
2. **The capacity loss itself is physics.** Rebooking faster does not create ships. The average delay was ±19 hours and would have been about the same with any process. What *can* change is who waits, how long they wait without knowing, and what spoils.
3. **Contract customers were punished, not protected.** Sales thought key accounts were handled first. They were handled *last*: their account managers start at 07:30.
4. **Three kinds of knowledge were missing at the moment of booking:** which reefers are perishable, which sailings have plugs/ADR/deck, and whether a unit has its customs pre-lodgement.
