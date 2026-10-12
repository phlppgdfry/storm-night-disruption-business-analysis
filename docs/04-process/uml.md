# UML — sequence, life cycle of a stranded unit, data

> **What this is:** the TO-BE in UML for the development team: who talks to whom, which states a unit goes through, and the data the rules need. **For:** developers, tester, architect (S-11). **Previous:** [TO-BE](to-be.md) · **Next:** [allocation rules](../05-rules/allocation-rules.md).

*Fictional systems. Drawn in Mermaid so the diagrams live next to the text and change in the same pull request.*

## Sequence — from cancellation to messages

```mermaid
sequenceDiagram
  autonumber
  participant BP as Booking platform
  participant RP as Recovery planner
  participant TOS as Terminal OS
  participant CB as Customs broker data
  actor DM as Duty manager
  participant MSG as Messaging
  actor C as Customer / driver
  BP->>RP: SailingsCancelled(TW-21, TW-23, TW-25)
  RP->>BP: get bookings on cancelled sailings
  RP->>TOS: gate-in status per unit
  RP->>CB: pre-lodgement status per unit
  RP->>BP: free capacity per recovery sailing (lm, plugs, ADR, deck) — D-03
  RP->>RP: buildPlan(policy = recommended)
  RP-->>DM: plan proposed (board, classes, escalations)
  DM->>RP: override(unit, sailing, reason)  [0..n]
  DM->>RP: approve(plan)
  RP->>BP: rebook units (one transaction per sailing)
  RP->>MSG: one message per customer, one text per driver contact
  MSG-->>C: new sailing / hold at origin until …
  loop every hour until no open units
    RP->>CB: pre-lodgement released?
    RP->>RP: buildPlan(open units, confirmed units fixed — R-11)
    RP->>BP: rebook new lines
    RP->>MSG: messages for new lines only
  end
```

**Error paths the team asked about in refinement:**

| What fails | Behaviour |
|---|---|
| Booking platform rejects a rebooking (capacity changed meanwhile) | The line returns to *open* and is planned in the next round; the duty manager sees a counter of failed lines |
| Messaging provider down | Plan stays approved; messages queue and retry; customer service sees "not yet sent" per customer |
| Customs data unavailable | Units are treated as *not pre-lodged* (held) — the safe side; the board shows "customs data stale since …" |
| Duty manager does not approve within 60 minutes | Escalation to the operations director on call; nothing is sent unapproved (D-02) |

## State machine — a stranded unit

```mermaid
stateDiagram-v2
  [*] --> Stranded: SailingsCancelled
  Stranded --> Held: no customs pre-lodgement (R-06)
  Held --> Stranded: pre-lodgement released
  Stranded --> Proposed: plan built
  Proposed --> Proposed: override (R-12)
  Proposed --> Confirmed: plan approved
  Confirmed --> Confirmed: moved to an earlier sailing (release 2 only)
  Confirmed --> Stranded: no-show at departure
  Confirmed --> Sailed: departed
  Stranded --> Withdrawn: customer withdraws
  Confirmed --> Withdrawn: customer withdraws
  Sailed --> [*]
  Withdrawn --> [*]
```

*Confirmed → later sailing* does not exist: that is R-11.

## Data the rules need

```mermaid
classDiagram
  class Sailing {
    id
    departs
    freeLaneMetres
    freeReeferPlugs
    freeAdrSlots
    highDeck
    cutOff = departs - 90 min
  }
  class Unit {
    id
    type
    laneMetres
    originalSailing
    bookedAt
    gateInAt
    contract
  }
  class ReeferDetails {
    commodityCode
    deliverBy
    perishable()
  }
  class CustomsStatus {
    preLodged
    checkedAt
  }
  class PlanLine {
    unit
    sailing
    status
    class
    reasons[]
    escalate
  }
  class Override {
    unit
    sailing
    reasonCode
    by
    at
  }
  class Customer {
    id
    contract
    allotmentShare
    messageContact
    driverContact
  }
  Unit "1" --> "0..1" ReeferDetails
  Unit "1" --> "1" CustomsStatus
  Unit "*" --> "1" Customer
  PlanLine "1" --> "1" Unit
  PlanLine "*" --> "0..1" Sailing
  Override "0..1" --> "1" PlanLine
```

**New data in release 1:** `Sailing.freeReeferPlugs / freeAdrSlots / highDeck` (D-03), `ReeferDetails.commodityCode / deliverBy` (D-05), `Customer.driverContact` (D-09), `Override` (US-09).
