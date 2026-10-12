# Traceability — pull any thread

> **What this is:** how every requirement in this case can be followed from the person who asked for it to the test that proves it, and how the build enforces that. **For:** reviewers, auditors, the next analyst. **Previous:** [benefits review](11-measure/benefits-review.md) · **Next:** back to the [documentation map](00-documentation-map.md).

*Interactive version: [trace explorer](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/trace/) — click any node to light up everything upstream and downstream.*

## The chain

```text
stakeholder (S) → said (Q) → pain (P) → goal (G) → KPI (K)
                                         ↓
                                       rule (R) → story (US) → executable example (SC) / BAT case (BAT) → screen (SCR)
assumptions (A) feed the simulation that measures the KPIs; decisions (D) and risks (X) cite all of the above.
```

All of it lives in one file, [`model/trace.json`](../model/trace.json), plus the rules in [`allocate.mjs`](../site/assets/lib/allocate.mjs), the examples in [`allocation.feature`](05-rules/features/allocation.feature) and the assumptions in [`assumptions.json`](../model/assumptions.json).

## What the build refuses

[`scripts/check-trace.mjs`](../scripts/check-trace.mjs) runs in CI and fails on:

| Orphan or dangling link | Why it matters |
|---|---|
| A pain no stakeholder voiced | A requirement nobody asked for |
| A quote that leads nowhere and is not *parked* with a reason | Somebody was heard and then ignored |
| A goal without a KPI, or without a story | A goal nobody measures or delivers |
| A rule in the code that is not in the trace, or the reverse | The documentation and the system disagree |
| A rule without an executable example tagged with its ID | A rule nobody tested |
| A release-1 story without an example or a BAT case | A story nobody accepts |
| An example that belongs to no story | A test for something nobody asked for |
| A KPI the simulation does not produce and nobody measures | A target that cannot be checked |
| A risk without a mitigation, or with a mitigation that does not exist | A risk register as decoration |
| **Any ID in any document that does not exist** | The documents cannot quietly drift from the model |

And [`tests/simulation.test.mjs`](../tests/simulation.test.mjs) adds the same for numbers: **an assumption that is documented but not used by the model, or used but not documented, fails the build.**

## Pull one thread: the strawberries

| Step | ID | What |
|---|---|---|
| Voice | Q-05 | "What I can't explain to the supermarket is that nobody told me my strawberries would sail on Saturday." — fresh forwarder (S-09) |
| Pain | P-04 | Perishables miss their deadline because nobody knows which reefers are perishable |
| Goal | G-03 | At least halve the perishables that sail after their deadline |
| KPI | K-05 | Perishables after deadline: 21 → 10 (median of 200 nights) |
| Rule | R-07 | Class 1: perishable reefers, earliest deadline first |
| Examples | SC-07, SC-08 | Run in CI against the allocation module |
| Story | US-03 | Build a recovery plan with the agreed policy |
| Second voice | Q-16 | "We type 'fresh' in the remarks. Sometimes." |
| Second pain | P-09 | Booking data cannot tell perishable from frozen |
| Story | US-02 | Perishable flag and deliver-by time in every reefer booking — BAT-02 |
| Assumption | A-05 | Share of perishables flagged: third-largest swing in the business case |
| Decision | D-05 | Mandatory commodity code for reefers |
| Risk | X-01 | "The plan protected frozen fish and let strawberries rot" |
| Screen | SCR-02 | Why-panel: "R-07 class 1: perishable, deadline Fri 17:52" |
