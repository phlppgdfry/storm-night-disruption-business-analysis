# Prioritisation and release slicing

> **What this is:** how the PO and I ordered the backlog, what we cut, and the definitions of ready and done. **For:** Product Owner (S-07), team, sponsor. **Previous:** [epics and stories](epics-and-stories.md) · **Next:** [recovery board design](../08-design/recovery-board.md).

*Fictional. Scores are relative (Fibonacci), agreed in refinement with the PO; the PO decides.*

## Constraint that shaped everything

**Winter.** Storm season starts in November. A release that lands in February misses most of the value (A-40 counts events per year, most of them in winter). The PO's question was therefore not "what is most valuable?" but "what is the smallest slice that gets through a storm night better than today?"

## WSJF

Cost of delay = business value + time criticality + risk reduction / opportunity enablement. WSJF = cost of delay ÷ job size.

| Story | Value | Time crit. | Risk red. | CoD | Size | WSJF | Release |
|---|---|---|---|---|---|---|---|
| US-01 Stranded-unit list | 8 | 13 | 8 | 29 | 3 | **9.7** | R1 |
| US-02 Perishable flag + deliver-by | 8 | 13 | 13 | 34 | 5 | **6.8** | R1 |
| US-03 Plan with the policy | 13 | 13 | 8 | 34 | 8 | **4.3** | R1 |
| US-04 Plugs, ADR, deck | 8 | 8 | 13 | 29 | 5 | **5.8** | R1 |
| US-05 Customs hold | 5 | 5 | 5 | 15 | 2 | **7.5** | R1 |
| US-06 Explain every allocation | 8 | 8 | 13 | 29 | 3 | **9.7** | R1 |
| US-07 Escalate late perishables | 5 | 8 | 5 | 18 | 2 | **9.0** | R1 |
| US-08 Review and approve | 13 | 13 | 8 | 34 | 5 | **6.8** | R1 |
| US-09 Override with reason | 5 | 8 | 8 | 21 | 3 | **7.0** | R1 |
| US-10 Replan rounds | 5 | 8 | 5 | 18 | 5 | **3.6** | R1 |
| US-11 Customer message | 13 | 13 | 5 | 31 | 5 | **6.2** | R1 |
| US-12 Driver text | 8 | 8 | 5 | 21 | 3 | **7.0** | R1 |
| US-13 Customer-service view | 5 | 8 | 5 | 18 | 3 | **6.0** | R1 |
| US-14 Storm report | 3 | 5 | 8 | 16 | 3 | **5.3** | R1 |
| US-15 Policy parameters | 3 | 1 | 3 | 7 | 5 | 1.4 | R2 |
| US-16 Reroute offer | 8 | 2 | 3 | 13 | 13 | 1.0 | R2 |
| US-17 Pull-forward offer | 5 | 2 | 2 | 9 | 8 | 1.1 | R2 |

## Where the PO overruled the ranking

- **US-10 (replan, WSJF 3.6) stays in release 1.** Low score, but without it customs releases and no-shows fall back to phone calls overnight. The PO: "a plan that is right at 17:00 and wrong at 03:00 is not a plan."
- **US-14 (storm report) stays in release 1** although nobody asked for it. Without it there is no benefits review and no evidence for the policy review promised to Sales in D-04.
- **US-16 (reroute) out, despite Sales asking for it.** It is the only story that reduces the average delay, but it needs the Thames route's capacity data, which is not in the platform. Release 2, decision D-10.

## Release plan

| | Sprints | Content | Exit |
|---|---|---|---|
| **R1 pilot** | 4 × 2 weeks | US-01 – US-14, Humber route only, behind a feature toggle | Storm drill passed (BAT-08), go/no-go signed ([readiness](../10-go-live/readiness.md)) |
| R1 general | +1 sprint | All routes | First real storm handled; storm report reviewed |
| R2 | after winter | US-15 – US-17 | Policy review with Sales and customer service |

## Definition of ready (story)

- Linked to a goal, with the pain and the voice behind it traceable ([trace](../../model/trace.json)).
- Acceptance criteria written; allocation behaviour as tagged examples in the feature file.
- Data it needs is available, or a story exists to make it available.
- Sized by the team; dependencies named.

## Definition of done (story)

- Acceptance criteria and tagged examples pass in CI.
- `check-trace` green: no orphan, no dangling ID.
- Demo-ed to the user role in the story (the duty manager for US-08, an agent for US-13).
- Support knowledge base updated if the behaviour is visible to customers.
