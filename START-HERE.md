# Start here — five minutes

*Fictional operator; illustrative figures.*

| Minutes | Open | You will see |
|---|---|---|
| 2 | **[War room, guided tour](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/war-room/?tour)** | The same storm night twice, AS-IS above TO-BE; the duty manager's board on real data; four policies on 200 nights |
| 1 | **[Policy workshop](docs/03-workshops/policy-workshop.md)** | How a three-way conflict between Sales, customer service and operations became one decision — with the trade-offs on the table |
| 1 | **[Storm drill](docs/09-acceptance/storm-drill.md)** | Business acceptance run as a drill, a severity-1 defect in my own rules, and how it became rule R-16 and an executable example |
| 1 | **[Business case](docs/06-simulation/business-case.md)** | A range instead of a number, the three assumptions to verify first, and what the redesign cannot fix |

If you have ten more minutes: the [reconstruction of the night](docs/01-the-night/storm-kestrel-reconstruction.md), the [allocation rules](docs/05-rules/allocation-rules.md) with their [examples](docs/05-rules/features/allocation.feature), and the [trace explorer](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/trace/?id=Q-05).

Questions worth asking me about this case:

- Why measure *time to certainty* and not rebooking speed? ([D-01](docs/03-workshops/decision-log.md))
- Why does the average delay not go down, and why say so in the business case?
- Why does the duty manager approve the plan instead of the system sending it? ([D-02](docs/03-workshops/decision-log.md))
- What would you check first if this went to a steering committee next week? ([riskiest assumptions](docs/06-simulation/business-case.md#the-riskiest-assumptions))
- Where did your own rules fail, and what did you change? ([F-5 → R-16](docs/09-acceptance/storm-drill.md#triage))
