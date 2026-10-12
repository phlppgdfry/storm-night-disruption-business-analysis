# Epics and user stories

> **What this is:** the backlog for release 1 (and what waits for release 2), with acceptance criteria. **For:** Product Owner (S-07), developers, tester. **Previous:** [business case](../06-simulation/business-case.md) · **Next:** [prioritisation](prioritisation.md).

*Fictional backlog. Allocation behaviour is specified once, as executable examples in [`allocation.feature`](../05-rules/features/allocation.feature); stories refer to those examples instead of repeating them. Each story's goals, rules, examples and BAT cases are in the [traceability model](../../model/trace.json), and the build fails if a release-1 story has neither an example nor a BAT case.*

## Story map

| Detect & size | Plan | Decide | Tell | Learn |
|---|---|---|---|---|
| **US-01** stranded-unit list | **US-03** plan with the policy | **US-08** review and approve | **US-11** customer message | **US-14** storm report |
| **US-02** perishable flag + deliver-by | **US-04** plugs, ADR, deck | **US-09** override with reason | **US-12** driver text | *US-15 policy parameters (R2)* |
| | **US-05** customs hold | **US-10** replan without moving confirmed units | **US-13** customer-service view | |
| | **US-06** explain every allocation | | *US-16 reroute offer (R2)* | |
| | **US-07** escalate late perishables | | | |
| | *US-17 pull-forward offer (R2)* | | | |

Bold = release 1 (pilot before winter, D-08). Italics = release 2 (D-10).

---

## Detect & size

### US-01 Stranded-unit list on cancellation
**As** the duty manager **I want** every unit on a cancelled sailing listed with its type, lane metres, customer, arrival status, customs status and perishable deadline **within 15 minutes of the cancellation** **so that** I know the size and shape of the backlog before anyone calls (P-01).

- Given sailings are cancelled in the booking platform, when the cancellation is saved, then within 15 minutes the board lists every booked unit on those sailings.
- The count per type matches the booking platform's count for the same sailings (BAT-01).
- A unit whose gate-in or customs status could not be read shows "unknown", never "ok".
- Cancelling a sailing that is later reinstated removes its units from the list and from any unapproved plan.

### US-02 Perishable flag and deliver-by time in every reefer booking
**As** the duty manager **I want** each reefer booking to carry a commodity code and a deliver-by time **so that** the plan can protect perishables (P-09, R-07).

- Given a customer books a reefer in the portal, when no commodity code is chosen, then the booking cannot be submitted, and the message says why.
- Given a reefer booking arrives by EDI without commodity code, then it is accepted with a warning to the customer for 3 months, and refused after that date (D-05).
- The commodity list maps each code to *perishable yes/no*; the mapping is owned by Sales and editable without a release.
- Existing future reefer bookings without a code are listed for customer service to complete.

*Why in release 1:* without it the policy protects the wrong reefers — third-largest swing in the business case (A-05).

## Plan

### US-03 Build a recovery plan with the agreed policy
**As** the duty manager **I want** all stranded units planned onto the recovery sailings by the agreed policy **so that** every customer gets an answer within the hour (G-01) in an order we can defend (G-04).

- Behaviour: examples SC-01, SC-02, SC-07 – SC-13, SC-17, SC-19 (rules R-01, R-02, R-07 – R-10, R-13, R-15).
- The plan for ±900 units is proposed within 20 minutes of the cancellation (A-29).
- Building the plan twice on the same data gives the same plan.
- No sailing is ever planned over its lane metres (SC-02).

### US-04 Respect reefer plugs, ADR slots and deck height
**As** the load planner **I want** the plan to respect plugs, ADR slots and deck height per sailing **so that** I do not bump units at cut-off (P-03).

- Behaviour: SC-03, SC-04, SC-05 (R-03 – R-05).
- Plugs, ADR slots and high deck are attributes of each sailing, maintained by load planning (D-03); a change takes effect in the next plan or replan.
- If an attribute is missing for a sailing, that sailing gets no reefers / ADR / project units, and the board says why.

### US-05 Hold units without a customs pre-lodgement
**As** the customs desk **I want** units without a pre-lodgement held instead of planned **so that** they do not take recovery slots (P-07).

- Behaviour: SC-06 (R-06).
- A held unit appears on the board with "held — customs" and in the customer's message as "we will confirm your sailing once the UK import pre-lodgement is received".
- When the pre-lodgement arrives, the unit is planned in the next replan round.

### US-06 Explain every allocation
**As** a customer service agent **I want** every plan line to show why the unit is on that sailing **so that** I can explain it on the phone instead of arguing (Q-11, Q-17).

- Every plan line has at least one reason that names a rule (R-xx) in plain words.
- Skipped sailings are shown with the reason they were skipped (examples SC-01, SC-03, SC-17).
- Overrides show the reason code and who made them (SC-15, SC-16).
- An agent can explain three random allocations to a test customer using only the why-panel (BAT-03).

### US-07 Escalate perishables that will miss their deadline
**As** customer service **I want** perishables that cannot sail before their deadline flagged to us **so that** we call the customer before the goods are lost (R-14).

- Behaviour: SC-14, SC-18.
- Escalated units appear in a separate list with the deadline and the planned sailing; the list is sorted by deadline.

## Decide

### US-08 Review and approve the recovery plan
**As** the duty manager **I want** to review the plan by class and sailing and approve it in one action **so that** a person owns the plan (D-02) and customers hear within the hour.

- The board shows per sailing: lane metres, plugs and ADR slots used/free; per class: number of units; escalations; held units.
- Nothing is sent to customers before approval.
- Approval records who and when. If no approval within 60 minutes, the operations director on call is alerted.
- In the storm drill the duty manager reviews and approves a 900-unit plan within 30 minutes (BAT-04).

### US-09 Override a unit with a reason code
**As** the duty manager **I want** to move a unit to another sailing with a reason code **so that** I can handle what the rules do not know (live animals, a stowage instruction).

- Behaviour: SC-15, SC-16 (R-12). An override can never break R-01 – R-05 or R-13; the board says which rule refused it.
- Reason codes: OV-1 contractual commitment, OV-2 live animals or medical urgency, OV-3 stowage instruction, OV-4 keep a customer's units together.
- Every override is logged; the override rate per storm is reported (K-06).

### US-10 Replan rounds that never move a confirmed unit
**As** a customer **I want** my confirmed sailing to stay confirmed **so that** I can plan my haulier.

- Behaviour: SC-14 (R-11); SC-23 (R-16) for a sailing that loses capacity after units were confirmed — added after the storm drill (F-5).
- Every 60 minutes after approval, open units (customs released, no-shows, failed rebookings) are planned on remaining capacity.
- Only new or changed lines produce a message.

## Tell

### US-11 Message the customer the new sailing per unit
**As** a customer **I want** one message listing each of my units with its new sailing **so that** I do not have to call (G-01, G-06).

- One message per customer, not per unit; sent on approval.
- Each unit: reference, new sailing and departure time, latest arrival at the terminal, or "held — customs" / "we will call you" for escalations.
- Contract customers' account manager receives a copy.
- Content and timing tested with two customers (BAT-05).

### US-12 Text the driver or haulier: hold at origin until the new slot
**As** a haulier **I want** a text to the driver contact with the new arrival window **so that** drivers do not wait at a full terminal (Q-18).

- Sent on approval for every unit not yet at the terminal: "Sailing TW-23 cancelled. New sailing TWX-1 Fri 10:00. Arrive between 06:00 and 09:00, not before."
- Uses the booking contact number (D-09); if none, the haulier's office e-mail, and the unit is counted as "not reached".
- Phone numbers are deleted 30 days after the sailing.

### US-13 Customer service sees the plan and the reason per unit
**As** an agent **I want** to search a unit or customer and see its plan line, reasons and the message sent **so that** a call takes minutes and the answer matches the message.

- Search by unit, booking or customer.
- Shows plan line, reasons (US-06), message sent and time, escalation status.

## Learn

### US-14 Storm report: the KPIs after every event
**As** the operations director **I want** the KPIs of every disruption event **so that** we can see whether the plan delivers and adjust the policy (benefits review).

- Within 24 hours of the last stranded unit sailing: K-01 – K-10 for the event, next to the previous events.
- Figures match a manual count on one event (BAT-07).

## Release 2 (not specified in detail yet)

| Story | Why later |
|---|---|
| US-15 Policy parameters owned by Operations (allotment share, class order) — examples SC-20 – SC-22 show the alternatives | Needs a governance process for changing a policy that affects customers |
| US-16 Offer a reroute via the Thames route | Needs customer consent and the Thames route's capacity data (D-10) |
| US-17 Offer pull-forward when space frees up | Needs consent for units on the road; R-11 must be refined to allow earlier sailings with consent |
