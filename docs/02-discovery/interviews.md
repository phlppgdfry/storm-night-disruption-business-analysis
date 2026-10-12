# Interviews — what people said, and what it became

> **What this is:** the interview plan, the voices that shaped the case and where each one went. **For:** anyone who wants to check that a requirement came from someone. **Previous:** [stakeholders](stakeholders.md) · **Next:** [event storming](../03-workshops/event-storming.md).

*Fictional interviews. Every quote below has an ID in the [traceability model](../../model/trace.json); the build fails if a pain has no voice behind it, or a voice leads nowhere without a reason.*

## Plan

| | |
|---|---|
| Format | 45 minutes, one person, at their workplace where possible (the load planner during a cut-off, the yard manager on a site walk, a haulier at the gate) |
| Opening | "Walk me through the last storm night, from the moment you heard." — with the [reconstruction](../01-the-night/storm-kestrel-reconstruction.md) on the table |
| Probes | What did you know, when? Who did you wait for? What did you do that nobody asked you to? What would you never want a system to decide? |
| Close | "If one thing were different next storm, what?" — then: "And what would that cost someone else?" |
| Rule for myself | Write down the words, not my summary. Solutions get noted, then traced back to the need underneath. |

## The voices

| ID | Who | What they said | Became |
|---|---|---|---|
| Q-01 | Duty manager (S-04) | "At four o'clock I know three sailings are gone. At eleven I still don't know how many units that is, or which of them are reefers." | P-01 |
| Q-02 | Customer service (S-03) | "Six of us, a hundred and twenty calls, and every call is the same question. We rebook whoever gets through." | P-02, P-06 |
| Q-03 | Sales (S-02) | "Last storm our biggest customer had forty trailers waiting until Saturday night, because they waited for their account manager — while a one-off customer who called at five sailed on Friday morning." | P-02 |
| Q-04 | Load planner (S-05) | "At cut-off I find nine reefers booked on a sailing with four free plugs. Then I'm the one bumping them." | P-03 |
| Q-05 | Fresh forwarder (S-09) | "Weather is weather. What I can't explain to the supermarket is that nobody told me my strawberries would sail on Saturday." | P-04, P-01 |
| Q-06 | Yard manager (S-06) | "Every haulier still drives to the terminal, because nobody told them not to. At one in the morning trailers were parked on the access road." | P-05 |
| Q-07 | Haulier (S-10) | "My driver waited nineteen hours in his cab. He'd have stayed home if anyone had told him his new sailing." | P-05 |
| Q-08 | Customs desk (S-08) | "Every storm someone books units that have no customs pre-lodgement. They take a slot, get refused at check-in, and the slot is gone." | P-07 |
| Q-09 | Operations (S-01) | "Each storm the rules are reinvented by whoever is on duty. I want this to be boring." | P-08 |
| Q-10 | PO (S-07) | "We can't build 'be fair'. Give me rules a developer can test." | P-08 |
| Q-11 | Customer service (S-03) | "Fair is first come, first served. Anything else and my agents have to defend it on the phone." | P-08 → conflict C-1 |
| Q-12 | Sales (S-02) | "Contract customers pay for capacity all year. In a storm they come first. Full stop." | P-08 → conflict C-1 |
| Q-13 | Load planner (S-05) | "Perishables and drivers first. The rest can wait a few hours — it won't rot." | P-08, P-04 → conflict C-1 |
| Q-14 | Finance (S-12) | "Weather is force majeure. Show me a saving that isn't a claim we'd reject anyway." | *Parked* — not a pain; it set how the business case counts (D-07) |
| Q-15 | Architect (S-11) | "The booking system knows lane metres. Plugs and ADR slots live in the load planner's spreadsheet." | P-03 |
| Q-16 | Fresh forwarder (S-09) | "Our commodity code in the booking? We type 'fresh' in the remarks. Sometimes." | P-09 |
| Q-17 | Duty manager (S-04) | "If the system plans nine hundred units, I need to see why a unit is where it is. Otherwise I won't sign it." | P-08 |
| Q-18 | Haulier (S-10) | "Text the driver. Not an e-mail to our office that nobody reads at night." | P-05 |

## Contradictions I kept, not smoothed over

- **Sales believed key accounts were handled first (Q-12); the data says last.** In the reconstruction, half the contract customers' units waited 16 hours for an answer — their account managers start at 07:30. Showing this to S-02 changed the conversation from "first" to "never last, and informed early".
- **Customer service asked for more agents (problem statement); the agents were not the bottleneck.** Calls were answered within minutes. The units nobody called about were the problem.
- **The load planner asked to approve every reefer booking by phone (Q-04) — at 2 a.m. she is asleep.** The real need is the constraint data in the platform (D-03), not a person in the loop.
- **Q-16 surfaced late, in a customer interview, and turned out to matter most.** Without a usable perishable flag the best policy protects the wrong reefers; it is the third-largest swing in the [tornado](../06-simulation/results.md#tornado-which-assumption-moves-the-answer-most) and became US-02 and D-05.

## Pains

| ID | Pain | Voiced by |
|---|---|---|
| P-01 | Nobody knows the size and shape of the backlog until the next morning | Q-01, Q-05 |
| P-02 | The rebooking order is decided by who gets through, or who knows an account manager | Q-02, Q-03 |
| P-03 | Plug, ADR and deck limits are discovered at cut-off: late bumps, empty space | Q-04, Q-15 |
| P-04 | Perishables miss their deadline because nobody knows which reefers are perishable | Q-05, Q-13 |
| P-05 | Hauliers and drivers come to a terminal that cannot load them | Q-06, Q-07, Q-18 |
| P-06 | Calls are abandoned and repeated | Q-02 |
| P-07 | Units without customs pre-lodgement take recovery slots | Q-08 |
| P-08 | No agreed, explainable allocation policy | Q-09, Q-10, Q-11, Q-12, Q-13, Q-17 |
| P-09 | Booking data cannot tell a perishable reefer from a frozen one | Q-16 |
