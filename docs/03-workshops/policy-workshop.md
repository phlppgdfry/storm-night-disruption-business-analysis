# Policy workshop — deciding who sails first, with the simulation in the room

> **What this is:** how conflict C-1 was turned from an argument into a decision. **For:** sponsor, Sales, customer service, operations. **Previous:** [event storming](event-storming.md) · **Next:** [decision log](decision-log.md).

*Fictional workshop. The numbers are the generated [simulation results](../06-simulation/results.md#policy-lab-the-four-allocation-policies-on-the-same-nights).*

## Why a separate workshop

Three people with authority wanted three different orders (Q-11, Q-12, Q-13). Each was right about something. A vote would have produced a winner and two people who quietly work around the result (risk X-03). The aim was a policy all three could *defend on the phone*, decided by the sponsor, with the trade-offs visible.

## Preparation

1. **Write each proposal as rules**, in the proposer's words, and check them back with the proposer: *First booked, first rebooked* (S-03), *Key accounts first* (S-02), *Perishables and drivers first* (S-05).
2. **Run all three on the same 200 storm nights** in the simulation. Same freight, same capacity, only the order changes.
3. **Pick the measures before showing results**, so nobody chooses the measure that makes their option win: perishables late, average delay for contract and other customers, the worst delays, driver waiting hours, ADR units that drift to Sunday.
4. **Agree the decision rule:** the sponsor decides; Sales and customer service must be able to say "I can explain this to a customer".

## Agenda (2 hours)

| Min | Step |
|---|---|
| 10 | The reconstruction: half of the contract customers' units waited 16 h for an answer (Sales had not seen this) |
| 15 | The three proposals as rules, read out by their owners |
| 25 | **Policy lab:** the [war room](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/war-room/?tab=lab) replays the same night under each policy; the medians over 200 nights on the screen |
| 20 | What each proposal costs the others (see table) |
| 30 | Building the combined policy, rule by rule, re-running the simulation after each change |
| 10 | Can each of you explain it on the phone? |
| 10 | Sponsor decides; owners and review date |

## What the simulation showed (median of 200 nights)

| | First booked, first rebooked (S-03) | Key accounts first (S-02) | Perishables & drivers first (S-05) | **Recommended** |
|---|---|---|---|---|
| Perishables after deadline | 20 | 23 | 9 | **10** |
| Average delay, contract customers | 19.6 h | **12.7 h** | 20.0 h | 19.8 h |
| Average delay, other customers | 19.6 h | 25.3 h | 20.0 h | 20.2 h |
| Driver waiting hours | 2,373 | 2,486 | 1,832 | **1,841** |
| ADR units sailing on Sunday (worst nights) | none | none | **yes** | none |

Observations that moved the room:

- **"Key accounts first" buys contract customers 7 hours by taking 6 hours from everyone else, and spoils more perishables than doing nothing smart at all.** S-02 did not want to defend that to a fresh-produce forwarder who is also a prospect.
- **Under every TO-BE policy contract customers get their answer within the hour (K-02).** What Sales really needed (Q-03) was "never last, and informed early", not "first".
- **The Operations proposal had a flaw nobody saw on paper:** drivers and perishables fill the relief sailing's lane metres before ADR units get their turn, and its 16 ADR slots go unused. ADR units drift to Sunday. The fix became R-15 *scarce slots first* (D-06).
- **"First booked, first rebooked" is not what customer service does today** — today it is "first *called*". Writing it down showed the difference.

## The decision (D-04)

The **recommended policy**, decided by the sponsor (S-01):

1. Scarce slots first (R-15) — ADR and project units onto sailings that have their slot.
2. Perishables by deadline (R-07).
3. Waiting drivers by arrival (R-08).
4. Contract customers have first claim on their allotment share (45%) of every recovery sailing (R-09).
5. Everyone else in original booking order (R-10).

**Why S-02 agreed:** contract customers are never crowded out (R-09), are informed within the hour, and their account managers see the plan at 17:00 instead of 07:30. **Why S-03 agreed:** every line has a reason her agents can read out (US-06, US-13). **What it costs:** non-contract customers wait ±0.6 h longer on average than under pure booking order — the price of protecting perishables and drivers, and accepted as such.

Review: after the first real storm, using the storm report (US-14) and the override log (K-06).
