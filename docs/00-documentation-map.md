# Documentation map

> **What this is:** every document in the case, in the order an analyst would produce them. **For:** anyone who wants the full route instead of the [5-minute one](../START-HERE.md).

*Independent portfolio case study based on a fictional organisation. It contains no confidential information from any real employer or the hiring company. All figures are illustrative assumptions — not real company data.*

| # | Stage | Document | What it shows |
|---|---|---|---|
| 1 | The night | [Storm Kestrel reconstruction](01-the-night/storm-kestrel-reconstruction.md) | The AS-IS as an incident timeline, so everyone argues about the same night |
| | | [Problem statement](01-the-night/problem-statement.md) | Three requested solutions, five whys, the problem, goals — and what we will not promise |
| 2 | Discovery | [Context](02-discovery/context.md) | Tidewell, the route, systems, scope, glossary |
| | | [Stakeholders](02-discovery/stakeholders.md) | Twelve people, a map, three conflicts |
| | | [Interviews](02-discovery/interviews.md) | Eighteen voices, the contradictions kept, nine pains |
| 3 | Workshops | [Event storming](03-workshops/event-storming.md) | Big-picture board, hotspots with owners |
| | | [Policy workshop](03-workshops/policy-workshop.md) | Who sails first — decided with the simulation in the room |
| | | [Decision log](03-workshops/decision-log.md) | Eleven decisions, owners, what was given up |
| 4 | Process | [AS-IS](04-process/as-is.md) · [TO-BE](04-process/to-be.md) | BPMN 2.0 (valid `.bpmn` files), pains and goals marked on the steps |
| | | [UML](04-process/uml.md) | Sequence with error paths, state machine of a unit, data model |
| 5 | Rules | [Allocation rules](05-rules/allocation-rules.md) | Sixteen rules, a decision table, explanations per unit |
| | | [Executable examples](05-rules/features/allocation.feature) | 23 Given/When/Then examples, run in CI |
| | | [Conflicts](05-rules/conflicts.md) | Who sails first · who owns the data · who presses send |
| 6 | Simulation | [How the model works](06-simulation/model.md) | Why an analyst built one, what it ignores, how it was checked |
| | | [Results](06-simulation/results.md) *(generated)* | AS-IS vs TO-BE, policy lab, NPV range, tornado |
| | | [Business case](06-simulation/business-case.md) | Options, a range instead of a number, riskiest assumptions, what it cannot fix |
| 7 | Backlog | [Epics and stories](07-backlog/epics-and-stories.md) | 17 stories, acceptance criteria, release split |
| | | [Prioritisation](07-backlog/prioritisation.md) | WSJF, where the PO overruled it, DoR / DoD |
| 8 | Design | [Recovery board](08-design/recovery-board.md) | Five screens, design decisions, four validation rounds |
| 9 | Acceptance | [Storm drill](09-acceptance/storm-drill.md) | BAT as a drill, a severity-1 finding in my own rules, conditional sign-off |
| 10 | Go-live | [Pre-mortem](10-go-live/premortem.md) | "It is March and it failed" — eight stories, eight mitigations |
| | | [Readiness](10-go-live/readiness.md) | Shadow mode, go/no-go, rollback, hypercare, communication, KB article |
| 11 | Measure | [Benefits review](11-measure/benefits-review.md) | How the model's assumptions get replaced by measurements |
| — | Thread | [Traceability](traceability.md) | Pull any thread from a voice to a test; what the build refuses |
