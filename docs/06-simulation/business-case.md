# Business case

> **What this is:** options, costs, benefits with a range, the riskiest assumptions and what the redesign cannot fix. **For:** sponsor (S-01), finance (S-12), steering. **Previous:** [results (generated)](results.md) · **Next:** [epics and stories](../07-backlog/epics-and-stories.md).

*Fictional operator, illustrative assumptions — not real company data. Every figure on this page comes from the generated [results](results.md); none is typed by hand except where marked as an input.*

## Options

| Option | What | Cost | Verdict |
|---|---|---|---|
| A. Do nothing | Next storm like the last | — | Baseline: ±€75k of influenceable cost per event, plus yard and driver hours that are not monetised |
| B. More agents on storm nights (customer service's request) | Double the night desk | ±€6k per event in standby and overtime | Answers calls faster; does nothing for the units nobody calls about, perishables, the yard or cut-off bumps |
| C. Key-account flag (Sales' request) | Account managers rebook flagged customers first, overnight | On-call allowance | The simulation of "key accounts first" spoils *more* perishables than today (23 vs 21) and pushes other customers to 25 h |
| **D. Recovery plan (this case)** | Detect, plan by agreed rules, approve, tell, learn — release 1 | Build €280k (A-41), run €40k/year (A-42) — *inputs* | Recommended |

## What D is worth

| Median of 200 nights | AS-IS | TO-BE | Counted in € |
|---|---|---|---|
| Perishables after deadline | 21 | 10 | yes — €2,500 goodwill per unit (A-37), not cargo value (D-07) |
| Units withdrawn by customers | 54 | 1 | yes — €420 margin per unit, this crossing only (A-39) |
| Customer service hours | ±16 | ±1 | yes — €54 per hour (A-38) |
| Hours to certainty (90% of units) | 17.1 | 0.8 | no |
| Driver waiting hours | 3,361 | 1,841 | no |
| Hours yard over capacity | 12.7 | 0 | no |
| Units bumped at cut-off | 15 | 0 | no |

| | P10 | P50 | P90 |
|---|---|---|---|
| Saving per disruption event | €34k | **€50k** | €64k |
| Saving per year (6 events, A-40) | €206k | **€301k** | €382k |
| 5-year NPV at 8% | €382k | **€763k** | €1,086k |
| Payback | | **±13 months** | |

Only three lines are monetised, and the largest — perishables — is counted at goodwill paid, not cargo value. Driver hours, yard safety and certainty are real, and left out on purpose: a case that survives finance without them is stronger than a case that needs them.

## The riskiest assumptions

From the [tornado](results.md#tornado-which-assumption-moves-the-answer-most), the three assumptions that move the NPV most:

| # | Assumption | Range → NPV | What we do about it |
|---|---|---|---|
| 1 | **A-40 Disruption events per year** (3–10, base 6) | €184k → €1,639k | Count the last three winters' events from the sailing history *before* the steering meeting. Below 3 a year, the case is marginal. |
| 2 | **A-37 Goodwill per late perishable** (€1,000–€5,000) | €379k → €1,626k | Ask finance for the credits actually paid after the last two storms (D-07). |
| 3 | **A-05 Share of perishables flagged in the booking** (50–95%) | €402k → €1,092k | This one we *control*: US-02 and D-05 make the flag mandatory. It is why US-02 is in release 1. |

**When every assumption is uncertain at once** (200 runs, each drawing all 44 assumptions from their ranges) the NPV is still positive in **93.5%** of runs — the chance of a negative NPV, **6.5%**, is the number to show the steering committee, not the P50. Current figures: [results](results.md#when-the-assumptions-themselves-are-wrong).

## What the redesign cannot fix

**The average delay stays at ±20 hours.** A storm removes three sailings' worth of capacity; no allocation rule creates a ship. Under every TO-BE policy the average delay is the same or slightly higher than AS-IS — because fewer customers give up and withdraw, more freight is still waiting to be carried.

Saying this in the business case was a deliberate choice: the first question from the operations director was "so the last trailer sails earlier?" — and the honest answer is *no, but you will know at 17:00 when it sails, and so will the customer*. Promising shorter delays would have set up release 1 to fail its own benefits review.

## What would make D better (not in this case)

- Rerouting via the Thames route and pull-forward offers (release 2, D-10) attack the average delay directly.
- A second relief vessel decision informed by the plan at 17:00 instead of the backlog at 06:00.
