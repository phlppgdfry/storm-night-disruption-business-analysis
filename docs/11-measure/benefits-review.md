# Benefits review plan

> **What this is:** how we will know, after real storms, whether the recovery plan delivers what the business case promised — and what we do if it does not. **For:** sponsor, finance, PO. **Previous:** [go-live readiness](../10-go-live/readiness.md) · **Next:** [traceability](../traceability.md).

*Fictional plan.*

## What we measure, from where

| KPI | Target | Simulated (median, AS-IS → TO-BE) | Real source after go-live |
|---|---|---|---|
| K-01 Hours until 90% of units confirmed | ≤ 2 h | 17.1 → 0.8 | Plan approval time and confirmation timestamps |
| K-02 Hours until half of contract units confirmed | ≤ 1 h | 16 → 0.8 | same, filtered on contract |
| K-03 Bumps at cut-off | 0 | 15 → 0 | Load planning bump log |
| K-04 Lane metres empty while usable units wait | −75% | 304 → 50 | Departure lists vs yard at departure |
| K-05 Perishables after deadline | −50% | 21 → 10 | Deliver-by vs actual departure (needs US-02) |
| K-06 Override rate | < 5% | not simulated | Override log (US-09) |
| K-07 Hours yard over capacity | 0 | 12.7 → 0 | Terminal OS yard counts |
| K-08 Driver waiting hours | −40% | 3,361 → 1,841 | Gate-in to load time, accompanied units |
| K-09 Units withdrawn | −80% | 54 → 1 | Cancelled bookings within 48 h of a cancellation |
| K-10 Calls offered | −70% | 116 → 20 | Telephony |

All ten are produced by the storm report (US-14) within 24 hours of an event.

## When

| Moment | What | Decision |
|---|---|---|
| After the first storm | Storm report + hypercare notes | Fix, tune or roll back |
| After three storms | KPIs vs simulation; **re-run the simulation with the measured values** in place of assumptions (A-05 flag share, A-34 hold-at-origin share, A-32 call share) | Is the business case still positive? |
| End of first winter | Benefits review with finance: goodwill credits paid vs last winter (D-07); events counted (A-40) | Release 2 go / no-go; policy review with Sales (D-04) |

## If the numbers disappoint

| If | Then look at first |
|---|---|
| K-05 not halved | A-05: are perishables flagged? (the tornado's third bar) |
| K-06 above 5% | Which reason codes? Repeated OV-1 means a contractual promise the policy does not know about |
| K-10 not down | Message reach (US-11) and whether agents use the why-panel |
| K-08 not down | Driver text reach (X-05) and hold-at-origin compliance (A-34) |

The point of the simulation was never the exact number. It is a model whose assumptions can be replaced, one by one, by what we measure — and then it tells us whether we were right.
