# Pre-mortem — it is March, and the recovery plan failed

> **What this is:** a pre-mortem held before go-live: imagine release 1 failed in its first real storm, write down why, and turn each story into a mitigation. **For:** sponsor, PO, key users. **Previous:** [storm drill](../09-acceptance/storm-drill.md) · **Next:** [go-live readiness](readiness.md).

*Fictional session.*

## How it was run

45 minutes, same people as the storm drill plus Sales and finance. Prompt: *"It is March. In the first big storm the recovery plan made things worse and was switched off at 22:00. Write the headline and what happened."* Ten minutes silent writing, then each story read out, clustered, and given an owner.

## What people wrote

| ID | Failure story | Written by | Likelihood · impact | Mitigation | Owner |
|---|---|---|---|---|---|
| X-01 | "The plan protected frozen fish and let strawberries rot" — perishables not flagged in bookings | Fresh forwarder (role-played by the BA), duty manager | high · high | US-02 and D-05 mandatory fields; BAT-02; before go-live, customer service completes codes on all future reefer bookings | PO |
| X-02 | "The duty manager did not trust it and moved 200 units by hand" | Customer service lead | medium · high | US-06 why-panel; BAT-04 approval drill; override rate K-06 on the storm report | Duty manager |
| X-03 | "Sales phoned the night desk and had key accounts moved" | Sales (!) | medium · medium | D-04 agreed with Sales in the room; overrides only with a reason code (US-09); K-06 shows who | Sponsor |
| X-04 | "Customers ignored the message and called anyway" | Customer service agent | medium · low | One clear message per customer (US-11); agents see the same text (US-13) | Customer service |
| X-05 | "Drivers never got the text — contact data was the office landline" | Yard manager | high · medium | D-09; BAT-06; before go-live, contact completeness report per haulier; office e-mail fallback | Architect |
| X-06 | "The plan put reefers on a ship whose plugs were wrong in the system" | Load planner | medium · high | D-03 ownership with load planning; R-16 for vessel swaps (D-11); constraint values checked in BAT-08 | Load planner |
| X-07 | "The first storm came in October, before go-live" | Operations director | medium · medium | D-08 pilot before winter; if a storm comes first, the plan runs in *shadow mode*: built and shown, not sent — the duty manager uses it as a checklist | Sponsor |
| X-08 | "Finance found the saving was half of what we promised" | Finance controller | medium · medium | Business case counts only goodwill paid (D-07); benefits review after the first three events (US-14) | BA |

## What changed because of it

- **Shadow mode** (X-07) was added to the go-live plan: it costs nothing and turns an early storm into a free test.
- **A contact-completeness report** (X-05) became a go-live criterion, not a nice-to-have.
- **Sales wrote X-03 about themselves.** That was the moment the policy decision (D-04) became theirs too.
