# How the simulation works — and why an analyst built one

> **What this is:** the storm-night model in plain language: what it simulates, what it ignores, how it was checked. **For:** sponsor, finance (S-12), anyone who should not trust a number they cannot trace. **Previous:** [conflicts](../05-rules/conflicts.md) · **Next:** [results (generated)](results.md).

*Fictional operator; every number comes from [`model/assumptions.json`](../../model/assumptions.json) (44 assumptions, each with a low, base and high value and a reason).*

## Why simulate at all

Three things in this case could not be settled by argument:

1. **The policy conflict (C-1).** Each proposal sounded fair. Only running them on the same nights showed what each one costs the others.
2. **The business case.** "Rebooking faster saves money" is a hope. How much, in which lines, and with what spread?
3. **Rules that look right on paper.** The Operations proposal had a flaw (ADR units drifting to Sunday) that nobody found in the workshop. The first simulation run found it in a second (D-06).

A spreadsheet can multiply averages. It cannot show that the first recovery sailing is full before anyone in the ordinary queue gets a turn, or that a driver waits nineteen hours because of the order in which other people called. That needs time, order and capacity — so: a small simulation.

## What it is

A minute-by-minute simulation of one storm night, from the cancellation decision (Thursday 16:00) until the last stranded unit sails or is withdrawn. Code: [`simulate.mjs`](../../site/assets/lib/simulate.mjs), ±400 lines of plain JavaScript, no dependencies; it runs in the browser (the [war room](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/war-room/)) and in CI.

| Part | AS-IS | TO-BE |
|---|---|---|
| **Freight** | ±870 units from three cancelled sailings, with type, customer, contract, arrival time, perishable deadline and customs status ([`scenario.mjs`](../../site/assets/lib/scenario.mjs)). Same freight in both modes for the same night. | same |
| **Capacity** | Recovery sailings every four hours plus a relief vessel, each with free lane metres, plugs, ADR slots and deck ([`storm-night.json`](../../model/storm-night.json)) | same |
| **Who rebooks** | Customers call (some the same evening, most when the office opens); agents answer by shift (4 / 2 / 9); callers hang up and retry; account managers phone key accounts from 07:30 | The [allocation rules](../05-rules/allocation-rules.md) plan all units at +20 min; the duty manager approves at +50 min; replan every hour |
| **How they book** | Earliest sailing with lane metres free (the screen shows nothing else) | `buildPlan()` — the same module the examples test |
| **Cut-off** | The load planner bumps units that break plugs, ADR, deck or customs; the space is lost | Nothing to bump: constraints were applied when planning |
| **Hauliers** | All drive in at their original time | A share hold at origin when texted (A-34) |
| **Customers** | Without an answer after 8 h, some withdraw units (A-35, A-36) | same rule — few are still without an answer |
| **Booking data** | — | Only perishables with a usable commodity code are visible to the rules (A-05) |

## What it measures

Fifteen KPIs per night, linked to the goals in the [traceability model](../../model/trace.json): time to certainty (all units, contract units), perishables after deadline, delay per customer group, driver waiting hours, yard peak and hours over capacity, calls offered and abandoned, cut-off bumps, lane metres sailed empty while usable units waited, units withdrawn, and the cost lines the redesign can influence.

## What it ignores — on purpose

| Not modelled | Why that is acceptable here | Where it could bite |
|---|---|---|
| Stowage itself (weights, axle loads, lane-by-lane) | Lane metres, plugs, ADR and deck are the constraints that drive rebooking decisions | A real plan may lose some lane metres to stowage; both modes would lose them |
| The cancellation decision | Out of scope | — |
| Rerouting via the Thames route | Release 2 (D-10) | TO-BE is conservative |
| Goodwill beyond the night (repeat business) | Hard to estimate honestly; finance asked not to (D-07) | Benefit understated |
| Staff stress, safety on the access road | Not monetised | Shown only as yard hours and driver hours |
| Agents making mistakes | Kept the AS-IS generous | AS-IS looks better than it is |

## How it was checked

| Check | How | Where |
|---|---|---|
| **Same night, same answer** | A fixed seed gives an identical night, in Node and in the browser | test: *deterministic* |
| **No ship overloaded** | For every sailing: lane metres, plugs, ADR, deck within limits, in both modes | test: *no sailing carries more than …* |
| **Nobody forgotten** | Every unit ends the weekend sailed or withdrawn | test: *every unit ends …* |
| **Every assumption used** | The model's parameters are wrapped in a proxy that records every read; the test fails if an assumption is documented but unused, or used but undocumented | test: *every documented assumption …* |
| **The rules are the tested rules** | TO-BE calls the same `buildPlan()` as the 23 examples | [`allocation.feature`](../05-rules/features/allocation.feature) |
| **Face validity** | Night #12 replayed step by step with the duty manager and the load planner, against their memory of the last storm: "the 07:30 account-manager wave is exactly right"; "too few bumps — on a real night it's more" (so the AS-IS is, if anything, too kind) | [reconstruction](../01-the-night/storm-kestrel-reconstruction.md) |
| **Quoted numbers cannot drift** | `scripts/build-results.mjs` regenerates [results.md](results.md) and `site/data/results.json`; CI fails if they changed | CI |

## How to read the results

- **Medians over 200 nights**, with the 10th–90th percentile. One night is an anecdote.
- **Paired comparison**: AS-IS and TO-BE get the same freight each night, so the difference is the process.
- **Two kinds of uncertainty, kept apart:** night-to-night randomness (200 nights, assumptions fixed) and *being wrong about the assumptions* (200 more runs drawing every assumption from its range). The second is the honest one for the business case.
- **A tornado** shows which single assumption moves the answer most — the list of things to verify first.

Results: [results.md](results.md) · Business case: [business-case.md](business-case.md).
