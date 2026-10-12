// The documents quote numbers. This test recomputes them from the model and fails if a document says something else.
// A change to an assumption or a rule therefore forces the prose to be updated in the same commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simulate } from "../site/assets/lib/simulate.mjs";
import { buildScenario } from "../site/assets/lib/scenario.mjs";
import { buildPlan } from "../site/assets/lib/allocate.mjs";
import { paramsFrom, fmt } from "../site/assets/lib/util.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));
const R = json("site/data/results.json");
const storm = json("model/storm-night.json");
const P = paramsFrom(json("model/assumptions.json"));
const n = (v) => Math.round(v).toLocaleString("en-GB");
const m = (key) => [R.asis[key].p50, R.tobe[key].p50];
const k = (v) => `€${Math.round(v / 1000).toLocaleString("en-GB")}k`;

function claims(file, list) {
  test(`${file} quotes the model's numbers`, () => {
    const text = read(file);
    for (const c of list) assert.ok(text.includes(c), `${file} should contain "${c}"`);
  });
}

const [c90a, c90t] = m("certaintyP90H");
const [pla, plt] = m("perishablesLate");
const [ba, bt] = m("lateBumps");
const [ea, et] = m("emptyLmWhileWaiting");
const [ya, yt] = m("yardHoursOver");
const [da, dt] = m("driverHours");
const [wa, wt] = m("withdrawn");
const [ca, ct] = m("callsOffered");

claims("docs/01-the-night/problem-statement.md", [
  `${c90a} → ${c90t}`, `${ba} → ${bt}`, `${ea} → ${et}`, `${pla} → ${plt}`, `${ya} → ${yt}`, `${n(da)} → ${n(dt)}`, `${wa} → ${wt}`, `${ca} → ${ct}`,
]);
claims("docs/11-measure/benefits-review.md", [`${c90a} → ${c90t}`, `${ba} → ${bt}`, `${ea} → ${et}`, `${pla} → ${plt}`, `${n(da)} → ${n(dt)}`, `${wa} → ${wt}`, `${ca} → ${ct}`]);

const pol = R.policies;
const row = (key, f = (x) => x) => `| ${f(pol.fifo[key].p50)} | ${f(pol.keyAccountsFirst[key].p50)} | ${f(pol.perishablesFirst[key].p50)} |`;
claims("docs/05-rules/conflicts.md", [row("perishablesLate"), row("driverHours", n)]);
claims("docs/03-workshops/policy-workshop.md", [row("perishablesLate"), `**${n(pol.recommended.driverHours.p50)}**`]);

const bc = R.businessCase;
claims("docs/06-simulation/business-case.md", [
  `**${k(bc.perEvent.p50)}**`, `**${k(bc.perYear.p50)}**`, `**${k(bc.npv.p50)}**`, `| ${n(da)} | ${n(dt)} | no |`, `| ${wa} | ${wt} |`,
  `**${Math.round(R.uncertainty.probabilityNegative * 1000) / 10}%**`,
]);

// The reconstruction is night #showcase, AS-IS.
const night = simulate({ storm, params: P, seed: R.showcaseSeed, mode: "asis", record: true });
claims("docs/01-the-night/storm-kestrel-reconstruction.md", [
  `**${night.units} units**`, `**${night.perishablesLate}** of ${night.perishables}`, `**${night.withdrawn}**`, `${night.callsOffered} / ${night.callsAbandoned}`,
  `**${n(night.driverHours)} h**`, `peak ${night.yardPeak} units`, `| ${night.lateBumps} |`, `**${Math.round(night.certaintyP50H * 10) / 10} h**`,
]);

// The example plan lines quoted in the rules document come from the plan built at approval on that night.
test("allocation-rules.md quotes real plan lines", () => {
  const now = storm.cancelDecisionAt + P.planBuildMin + P.approvalMin;
  const { units } = buildScenario(storm, P, R.showcaseSeed);
  const input = units.map((u) => ({ ...u, perishable: u.flagged, deadline: u.flagged ? u.deadline : null, customsOk: u.customsOk || u.customsFixAt <= now, availableAt: u.eta }));
  const { lines } = buildPlan({ units: input, sailings: storm.recovery, now, cutoffMin: P.cutoffMin, contractShare: P.contractShare });
  const text = read("docs/05-rules/allocation-rules.md");
  for (const id of ["U-0016", "U-0203"]) {
    for (const reason of lines.find((l) => l.unitId === id).reasons) assert.ok(text.includes(reason), `missing: ${reason}`);
  }
  assert.ok(text.includes(`deliver by ${fmt(units.find((u) => u.id === "U-0016").deadline)}`));
});

claims("README.md", [
  `| ${c90a} | **${c90t}** |`, `| ${pla} | **${plt}**`, `| ${ya} | **${yt}** |`, `| ${n(da)} | **${n(dt)}** |`, `| ${wa} | **${wt}** |`,
  `**${k(bc.npv.p50)} · ${Math.round(R.uncertainty.probabilityNegative * 1000) / 10}%**`,
]);
