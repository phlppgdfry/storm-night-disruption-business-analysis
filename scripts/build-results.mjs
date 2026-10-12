#!/usr/bin/env node
// Runs the storm night many times and writes every number the case quotes.
//   site/data/results.json            read by the site
//   site/data/storm-night.json        copy of model/ for the browser
//   site/data/assumptions.json        copy of model/ for the browser
//   docs/06-simulation/results.md     generated tables (do not edit by hand)
// CI runs this again and fails if anything changed, so a quoted number can never drift from the model.
// Run: node scripts/build-results.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simulate } from "../site/assets/lib/simulate.mjs";
import { businessCase, npv } from "../site/assets/lib/business-case.mjs";
import { POLICIES } from "../site/assets/lib/allocate.mjs";
import { paramsFrom, quantile, round, rng } from "../site/assets/lib/util.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const storm = read("model/storm-night.json");
const assumptionsDoc = read("model/assumptions.json");
const base = paramsFrom(assumptionsDoc);

const SEEDS = 200; // night-to-night randomness, assumptions fixed
const UNCERTAIN = 200; // assumptions drawn from their ranges as well
const TORNADO_SEEDS = 16;

const seeds = (n, from = 1) => Array.from({ length: n }, (_, i) => from + i);
const run = (params, seed, mode, policy = "recommended") => simulate({ storm, params, seed, mode, policy });

const KPIS = [
  ["certaintyP50H", "Hours until half of the stranded units have a confirmed sailing", 1],
  ["certaintyP90H", "Hours until 90% of the stranded units have a confirmed sailing", 1],
  ["certaintyContractP50H", "Hours until half of the contract customers' units have a confirmed sailing", 1],
  ["perishablesLate", "Perishable units sailing after their deadline", 0],
  ["delayContractH", "Average delay, contract customers (hours)", 1],
  ["delayOtherH", "Average delay, other customers (hours)", 1],
  ["delayOtherP95H", "95th percentile delay, other customers (hours)", 1],
  ["driverHours", "Hours drivers of accompanied units wait at the terminal", 0],
  ["yardPeak", "Peak stranded units in the yard", 0],
  ["yardHoursOver", "Hours the yard is over capacity", 1],
  ["callsOffered", "Calls offered to customer service", 0],
  ["callsAbandoned", "Calls abandoned", 0],
  ["lateBumps", "Units bumped at the load-planning cut-off", 0],
  ["emptyLmWhileWaiting", "Lane metres sailed empty while usable units waited in the yard", 0],
  ["withdrawn", "Units withdrawn by customers", 0],
];

function summarise(results) {
  const out = {};
  for (const [key, , d] of KPIS) {
    const xs = results.map((r) => r[key]).sort((a, b) => a - b);
    out[key] = { p10: round(quantile(xs, 0.1), d), p50: round(quantile(xs, 0.5), d), p90: round(quantile(xs, 0.9), d) };
  }
  const cost = results.map((r) => r.cost.total).sort((a, b) => a - b);
  out.costTotal = { p10: Math.round(quantile(cost, 0.1)), p50: Math.round(quantile(cost, 0.5)), p90: Math.round(quantile(cost, 0.9)) };
  return out;
}

const roundCase = (bc) => ({
  runs: bc.runs,
  perEvent: Object.fromEntries(Object.entries(bc.perEvent).map(([k, v]) => [k, Math.round(v)])),
  perYear: Object.fromEntries(Object.entries(bc.perYear).map(([k, v]) => [k, Math.round(v)])),
  byLine: Object.fromEntries(Object.entries(bc.byLine).map(([k, v]) => [k, Math.round(v)])),
  npv: Object.fromEntries(Object.entries(bc.npv).map(([k, v]) => [k, Math.round(v)])),
  paybackMonthsP50: round(bc.paybackMonthsP50, 1),
  shareNegative: round(bc.shareNegative, 3),
});

// 1. Night-to-night randomness with the agreed assumptions.
const asis = seeds(SEEDS).map((s) => run(base, s, "asis"));
const policies = {};
for (const pol of Object.keys(POLICIES)) policies[pol] = seeds(SEEDS).map((s) => run(base, s, "tobe", pol));
const tobe = policies.recommended;
const bc = roundCase(businessCase(asis, tobe, base));

// The storm night shown in the war room: the seed whose AS-IS cost is closest to the median.
const medianCost = quantile(asis.map((r) => r.cost.total).sort((a, b) => a - b), 0.5);
const showcase = asis.reduce((best, r) => (Math.abs(r.cost.total - medianCost) < Math.abs(best.cost.total - medianCost) ? r : best)).seed;

// 2. Uncertainty: every assumption drawn from a triangular distribution (low, value, high).
function triangular(r, lo, mode, hi) {
  if (hi === lo) return mode;
  const u = r.next();
  const c = (mode - lo) / (hi - lo);
  return u < c ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
}
const INTEGER = new Set(["unitsPerSailing", "customers", "contractCustomers", "yardCapacity", "agentsEvening", "agentsNight", "agentsDay", "accountManagers", "eventsPerYear", "years", "cutoffMin", "replanEveryMin", "amStartMin"]);
const draw = rng(20261011);
const npvs = [];
for (const s of seeds(UNCERTAIN, 10001)) {
  const p = { ...base };
  for (const a of assumptionsDoc.assumptions) {
    const v = triangular(draw, a.low, a.value, a.high);
    p[a.key] = INTEGER.has(a.key) ? Math.round(v) : v;
  }
  if (p.replanEveryMin % 10) p.replanEveryMin = Math.round(p.replanEveryMin / 10) * 10;
  const saving = run(p, s, "asis").cost.total - run(p, s, "tobe").cost.total;
  npvs.push(npv(saving * p.eventsPerYear, p));
}
npvs.sort((a, b) => a - b);
const uncertainty = {
  runs: UNCERTAIN,
  npv: { p10: Math.round(quantile(npvs, 0.1)), p50: Math.round(quantile(npvs, 0.5)), p90: Math.round(quantile(npvs, 0.9)) },
  probabilityNegative: round(npvs.filter((v) => v < 0).length / npvs.length, 3),
};

// 3. Tornado: one assumption at a time to its low and high value.
const BUSINESS_ONLY = new Set(["eventsPerYear", "buildCost", "runCost", "discountRate", "years", "perishableLateCost", "agentCostPerHour", "marginPerUnit"]);
const tseeds = seeds(TORNADO_SEEDS);
const baseA = tseeds.map((s) => asis[s - 1]);
const baseT = tseeds.map((s) => tobe[s - 1]);
const recost = (r, p) => {
  const perishables = r.perishablesLate * p.perishableLateCost;
  const calls = r.agentHours * p.agentCostPerHour;
  const withdrawn = r.withdrawn * p.marginPerUnit;
  return { ...r, cost: { perishables, calls, withdrawn, total: perishables + calls + withdrawn } };
};
const npvAt = (p, rerun) => {
  const A = tseeds.map((s, i) => (rerun ? run(p, s, "asis") : recost(baseA[i], p)));
  const T = tseeds.map((s, i) => (rerun ? run(p, s, "tobe") : recost(baseT[i], p)));
  return businessCase(A, T, p).npv.p50;
};
const npvBase = npvAt(base, false);
const tornado = [];
for (const a of assumptionsDoc.assumptions) {
  const rerun = !BUSINESS_ONLY.has(a.key);
  const fix = (v) => (INTEGER.has(a.key) ? Math.round(v) : v);
  const lo = npvAt({ ...base, [a.key]: fix(a.low) }, rerun);
  const hi = npvAt({ ...base, [a.key]: fix(a.high) }, rerun);
  tornado.push({ id: a.id, key: a.key, label: a.label, low: a.low, high: a.high, npvLow: Math.round(lo), npvHigh: Math.round(hi), swing: Math.round(Math.abs(hi - lo)) });
}
tornado.sort((x, y) => y.swing - x.swing);

// 4. Write.
const results = {
  _note: "Generated by scripts/build-results.mjs — do not edit. Fictional operator, illustrative assumptions.",
  runs: { nights: SEEDS, uncertainty: UNCERTAIN, tornadoNights: TORNADO_SEEDS },
  showcaseSeed: showcase,
  kpiLabels: Object.fromEntries(KPIS.map(([k, label]) => [k, label])),
  asis: summarise(asis),
  tobe: summarise(tobe),
  policies: Object.fromEntries(Object.entries(policies).map(([k, rs]) => [k, summarise(rs)])),
  businessCase: bc,
  uncertainty,
  tornado: { npvBase: Math.round(npvBase), bars: tornado.slice(0, 12) },
};
fs.mkdirSync(path.join(ROOT, "site/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "site/data/results.json"), JSON.stringify(results, null, 1) + "\n");
fs.copyFileSync(path.join(ROOT, "model/storm-night.json"), path.join(ROOT, "site/data/storm-night.json"));
fs.copyFileSync(path.join(ROOT, "model/assumptions.json"), path.join(ROOT, "site/data/assumptions.json"));

// Markdown
const eur = (v) => `€${Math.round(v).toLocaleString("en-GB")}`;
const k = (v) => (Math.abs(v) >= 1000 ? `€${round(v / 1000, 0).toLocaleString("en-GB")}k` : eur(v));
const range = (o, f = (x) => x) => `${f(o.p50)} <sub>(${f(o.p10)}–${f(o.p90)})</sub>`;
const lines = [];
lines.push("# Simulation results (generated)");
lines.push("");
lines.push("> **Generated by `node scripts/build-results.mjs` — do not edit.** CI regenerates this file and fails if it changed, so every number quoted in the case comes from the model and the [assumptions](../../model/assumptions.json). **Previous:** [how the model works](model.md) · **Next:** [business case](business-case.md).");
lines.push("");
lines.push("*Fictional operator, illustrative assumptions — not real company data.*");
lines.push("");
lines.push(`Each line is the **median over ${SEEDS} simulated storm nights**, with the 10th–90th percentile in small print. AS-IS and TO-BE run on the *same* freight each night (same seed), so the difference is the process, not luck.`);
lines.push("");
lines.push("## AS-IS vs TO-BE");
lines.push("");
lines.push("| KPI | AS-IS: phones and account managers | TO-BE: recovery plan (recommended policy) |");
lines.push("|---|---|---|");
for (const [key, label] of KPIS) lines.push(`| ${label} | ${range(results.asis[key])} | ${range(results.tobe[key])} |`);
lines.push(`| Cost of the night that the redesign can influence | ${range(results.asis.costTotal, k)} | ${range(results.tobe.costTotal, k)} |`);
lines.push("");
lines.push("**What does not change:** the average delay. A storm removes capacity, and no allocation rule creates a ship. The redesign changes *who* waits, *how long they wait without knowing*, and *what spoils* — see [what this cannot fix](business-case.md#what-the-redesign-cannot-fix).");
lines.push("");
lines.push("## Policy lab: the four allocation policies on the same nights");
lines.push("");
lines.push("| KPI | " + Object.values(POLICIES).map((p) => `${p.label}<br><sub>${p.owner}</sub>`).join(" | ") + " |");
lines.push("|---|" + Object.keys(POLICIES).map(() => "---").join("|") + "|");
for (const key of ["perishablesLate", "certaintyContractP50H", "delayContractH", "delayOtherH", "delayOtherP95H", "driverHours", "emptyLmWhileWaiting"]) {
  lines.push(`| ${results.kpiLabels[key]} | ` + Object.keys(POLICIES).map((p) => range(results.policies[p][key])).join(" | ") + " |");
}
lines.push("");
lines.push("Read with the [conflict resolution](../05-rules/conflicts.md): the recommended policy keeps Operations' gain on perishables, gives contract customers the same delay as everyone else instead of the AS-IS penalty, and fixes the ADR drift that the Operations proposal shows in its 90th percentile.");
lines.push("");
lines.push("## Business case");
lines.push("");
lines.push("| | P10 | P50 | P90 |");
lines.push("|---|---|---|---|");
lines.push(`| Saving per disruption event | ${k(bc.perEvent.p10)} | ${k(bc.perEvent.p50)} | ${k(bc.perEvent.p90)} |`);
lines.push(`| Saving per year (× ${base.eventsPerYear} events) | ${k(bc.perYear.p10)} | ${k(bc.perYear.p50)} | ${k(bc.perYear.p90)} |`);
lines.push(`| ${base.years}-year NPV at ${base.discountRate * 100}% (build ${k(base.buildCost)}, run ${k(base.runCost)}/year) | ${k(bc.npv.p10)} | ${k(bc.npv.p50)} | ${k(bc.npv.p90)} |`);
lines.push("");
lines.push(`Payback at P50: **${bc.paybackMonthsP50} months**. Median saving per event by line: perishables ${k(bc.byLine.perishables)}, withdrawn units ${k(bc.byLine.withdrawn)}, call handling ${k(bc.byLine.calls)}.`);
lines.push("");
lines.push("## When the assumptions themselves are wrong");
lines.push("");
lines.push(`${UNCERTAIN} more runs, each drawing **every** assumption from a triangular distribution between its low, base and high value:`);
lines.push("");
lines.push(`| NPV P10 | NPV P50 | NPV P90 | Chance the NPV is negative |`);
lines.push(`|---|---|---|---|`);
lines.push(`| ${k(uncertainty.npv.p10)} | ${k(uncertainty.npv.p50)} | ${k(uncertainty.npv.p90)} | **${round(uncertainty.probabilityNegative * 100, 1)}%** |`);
lines.push("");
lines.push("## Tornado: which assumption moves the answer most");
lines.push("");
lines.push(`NPV P50 with every assumption at its base value: **${k(results.tornado.npvBase)}** (${TORNADO_SEEDS} nights). One assumption at a time set to its low and high value:`);
lines.push("");
lines.push("| Assumption | Low → NPV | High → NPV | Swing |");
lines.push("|---|---|---|---|");
for (const t of results.tornado.bars) lines.push(`| ${t.id} ${t.label} | ${t.low} → ${k(t.npvLow)} | ${t.high} → ${k(t.npvHigh)} | ${k(t.swing)} |`);
lines.push("");
lines.push(`The storm night replayed in the [war room](https://phlppgdfry.github.io/storm-night-disruption-business-analysis/war-room/?tour) is night #${showcase}: the one whose AS-IS cost is closest to the median.`);
lines.push("");
fs.mkdirSync(path.join(ROOT, "docs/06-simulation"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/06-simulation/results.md"), lines.join("\n"));
console.log(`results: showcase night ${showcase}, NPV P50 ${k(bc.npv.p50)}, P(NPV<0) ${uncertainty.probabilityNegative}, saving/event P50 ${k(bc.perEvent.p50)}`);
