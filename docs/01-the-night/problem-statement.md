# Problem statement

> **What this is:** the problem in one page, before any solution. **For:** sponsor (S-01), Product Owner (S-07), finance (S-12). **Previous:** [reconstruction](storm-kestrel-reconstruction.md) · **Next:** [context](../02-discovery/context.md).

*Fictional operator, illustrative figures.*

## What was asked

Three requests reached the backlog after Storm Kestrel, each with a solution attached:

| From | Request |
|---|---|
| Customer service (S-03) | "More agents on storm nights, and a callback button on the website." |
| Sales (S-02) | "A key-account flag so contract customers are rebooked first." |
| Load planning (S-05) | "Customer service must check plugs and ADR with me before booking reefers and dangerous goods." |

Each would help its requester, and none of them would have changed the night much: the [reconstruction](storm-kestrel-reconstruction.md) shows most units had *nobody* working on them for fifteen hours, because rebooking waits for the customer to call.

## Five whys

1. Why did 20 perishables sail after their deadline? — *They were rebooked in the order customers called, not by deadline.*
2. Why in calling order? — *Rebooking only happens when a customer calls or an account manager phones them.*
3. Why does it wait for a call? — *Nobody has the full list of stranded units with what each one needs, so nobody can plan them all at once.*
4. Why is there no such list? — *The booking platform knows units and lane metres, but not which reefers are perishable, nor the plugs, ADR slots and deck of each sailing; those live in remarks fields and a spreadsheet.*
5. Why was that never fixed? — *On a normal day the load planner catches it at cut-off. It only hurts when 900 units must be re-planned at once — a few nights a year.*

## Problem

> When sailings are cancelled, Tidewell rebooks stranded units one phone call at a time, in the order customers happen to call, without seeing which units are perishable or which sailings can take reefers, dangerous goods or oversized cargo. Half the units wait about fifteen hours for an answer; perishables spoil while frozen cargo sails first; drivers and hauliers drive to a full terminal; and one in sixteen units is taken to a competitor.

## Opportunity

Plan **all** stranded units at once, within the hour, with one agreed set of rules, and tell every customer and driver their new sailing before they think of calling.

## What we will not promise

The storm takes capacity away. **The average delay will not go down** — the [simulation](../06-simulation/results.md) shows it stays around 20 hours whatever the process. The value is in certainty, in protecting what spoils, in a terminal that keeps flowing and in customers who stay. Saying this up front keeps the business case honest ([D-07](../03-workshops/decision-log.md)).

## Goals and how we will know

| Goal | Measure (simulated median, AS-IS → TO-BE) |
|---|---|
| G-01 Certainty fast | K-01 hours until 90% of units are confirmed: 17.1 → 0.8 |
| G-02 Use the recovery capacity | K-03 bumps at cut-off: 15 → 0 · K-04 lane metres empty while units wait: 304 → 50 |
| G-03 Protect what spoils | K-05 perishables after their deadline: 21 → 10 (→ 2 with complete booking data) |
| G-04 One explainable policy | K-06 override rate, measured in production: < 5% |
| G-05 Keep the terminal flowing | K-07 hours over yard capacity: 12.7 → 0 · K-08 driver waiting hours: 3,361 → 1,841 |
| G-06 Answer before they call | K-09 units withdrawn: 54 → 1 · K-10 calls: 116 → 20 |

Figures come from [results.md](../06-simulation/results.md), which is generated; the [full KPI tree with targets](../../model/trace.json) is part of the traceability model.

## Scope of release 1

Detect and size (US-01, US-02) · plan with the agreed policy (US-03 – US-07) · duty manager approves and overrides (US-08 – US-10) · tell customers, drivers and customer service (US-11 – US-13) · storm report (US-14). Rerouting and pull-forward offers wait for release 2 ([D-10](../03-workshops/decision-log.md)).
