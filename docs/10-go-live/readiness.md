# Go-live readiness — go/no-go, rollback, hypercare, communication, support

> **What this is:** everything that must be true before the recovery plan is switched on for a real storm, and what happens if it goes wrong. **For:** sponsor, PO, support, key users. **Previous:** [pre-mortem](premortem.md) · **Next:** [benefits review](../11-measure/benefits-review.md).

*Fictional release.*

## Switch-on in three steps

| Step | What | Until |
|---|---|---|
| 1. **Shadow mode** | On a cancellation the plan is built and shown on the board; nothing is sent; customer service works as today. The duty manager compares the plan with what happens. | Release 1 deployed; storm drill passed |
| 2. **Pilot** | Humber route only, feature toggle per route: plan approved and sent | Go/no-go below signed |
| 3. **All routes** | Toggle on for all routes | First real storm handled; storm report reviewed |

## Go/no-go checklist

| # | Criterion | Evidence | Owner |
|---|---|---|---|
| 1 | All release-1 stories done; 23 allocation examples and all tests green | CI run | PO |
| 2 | Storm drill passed; F-5 and F-2 fixed and re-tested | [Storm drill](../09-acceptance/storm-drill.md) | Duty manager |
| 3 | Plugs, ADR slots, deck attributes loaded for all Humber sailings; values signed off by load planning | Attribute report | Load planner |
| 4 | ≥ 90% of future reefer bookings have a commodity code (X-01) | Booking data report | Customer service lead |
| 5 | ≥ 80% of hauliers on the route have a driver contact number (X-05) | Contact completeness report | Architect |
| 6 | Duty managers (all four) trained and have approved a plan in the drill environment | Training log | Operations |
| 7 | Customer service trained on the why-panel; KB article published | KB link | Customer service lead |
| 8 | Message templates approved by Sales and customer service | Signed templates | Sales |
| 9 | Rollback tested (below) | Test log | Support lead |
| 10 | Hypercare roster for the first two storms | Roster | Operations |

## Rollback

The recovery plan only writes rebookings through the booking platform's normal interface; switching it off returns the night to today's process.

| Situation | Action | Who |
|---|---|---|
| Plan cannot be built or is clearly wrong | Toggle off for the route; customer service works as today; the plan (if any) is exported as a list for the duty manager | Duty manager |
| Plan approved, messages wrong | Stop messaging queue; send one correction message per affected customer from the template "correction"; rebookings stay | Duty manager + customer service lead |
| Booking platform rejects rebookings | Lines return to *open* (see [UML error paths](../04-process/uml.md#sequence--from-cancellation-to-messages)); if > 10% fail, toggle off | Duty manager, on-call developer |

## Hypercare — the first two storms

| | |
|---|---|
| Who | BA and a developer on call from cancellation until the last stranded unit sails; PO on call |
| Thresholds to call the BA | Override rate > 10% · more than 5 failed rebookings · any unit confirmed on a sailing over capacity · customer-service calls > 50% of AS-IS |
| After each storm | Storm report (US-14) reviewed within 2 working days; policy questions to the next steering |

## Communication

| Audience | Message | When | Channel | From |
|---|---|---|---|---|
| Contract customers | "Next storm you will hear from us within the hour, with every unit's new sailing. Your allotment share holds on every recovery sailing." | 3 weeks before pilot | Account manager visit / call | Sales |
| All customers on the route | What changes, what the message looks like, why reefer bookings now need a commodity code | 3 weeks before; reminder 1 week before | E-mail + portal banner | Customer service |
| Hauliers | Drivers will get a text; please keep the driver contact in the booking up to date | 3 weeks before | E-mail + gate leaflet | Yard manager |
| Customer service | How to read the why-panel; what to say when a customer disagrees | Training, 2 weeks before | Session + KB | BA + customer service lead |
| Duty managers | Drill, approval, overrides, rollback | 2 weeks before | Drill | BA + operations |
| Load planning | Maintaining sailing attributes; vessel swaps (R-16) | 2 weeks before | Session | BA + PO |

## Support handover — knowledge-base article

**Storm mode: "the plan says X, the customer says Y"**

1. Search the unit in the customer-service view (US-13). Read the plan line and its reasons **as they are written**.
2. "Why not the earlier sailing?" — the why-panel lists each skipped sailing and the rule that skipped it.
3. "Why does my competitor's trailer go first?" — explain the order: dangerous goods and oversized cargo where their slots are, perishables by deadline, waiting drivers, contract allotment, then booking order. Never discuss another customer's unit.
4. "I need it earlier" — escalate to the duty manager with the reason; only they can override (reason codes OV-1 – OV-4).
5. **Rule or bug?** If a plan line breaks a hard rule (a reefer on a sailing without a free plug, a unit planned on a sailing whose cut-off has passed), it is a bug: priority 1 to the on-call developer, and tell the duty manager.
