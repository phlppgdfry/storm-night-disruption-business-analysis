// Runs every example in docs/05-rules/features/allocation.feature against the allocation module.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeature, parseTime } from "./gherkin.mjs";
import { buildPlan } from "../site/assets/lib/allocate.mjs";
import { LANE_METRES } from "../site/assets/lib/scenario.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storm = JSON.parse(fs.readFileSync(path.join(ROOT, "model/storm-night.json"), "utf8"));
const ORIGINAL = Object.fromEntries(storm.cancelled.map((s) => [s.id, s.departs]));

function makeUnit(id, type, row = {}) {
  const kind = type === "perishable" ? "reefer" : type;
  const original = row["original sailing"] || "TW-21";
  return {
    id,
    customer: row.customer || `C-${id}`,
    contract: row.contract === "yes",
    type: kind,
    lm: LANE_METRES[kind],
    reefer: kind === "reefer",
    adr: kind === "adr",
    project: kind === "project",
    accompanied: kind === "accompanied",
    perishable: type === "perishable",
    deadline: row.deadline ? parseTime(row.deadline) : null,
    customsOk: (row.customs || "ok") === "ok",
    originalSailing: original,
    originalDeparture: ORIGINAL[original],
    bookedAt: row.booked ? parseTime(row.booked) : parseTime("Mon 09:00"),
    availableAt: row["at terminal"] ? parseTime(row["at terminal"]) : parseTime("Thu 15:00"),
  };
}

function run(scenario) {
  const ctx = { now: 0, cutoffMin: 90, contractShare: 0.45, policy: "recommended", sailings: [], units: [], overrides: new Map(), confirmed: [], plan: null };
  const line = (id) => {
    const l = ctx.plan.lines.find((x) => x.unitId === id);
    assert.ok(l, `no plan line for ${id}`);
    return l;
  };
  for (const step of scenario.steps) {
    const t = step.text;
    let m;
    if ((m = t.match(/^it is "(.+)"$/))) ctx.now = parseTime(m[1]);
    else if ((m = t.match(/^the contract allotment share is (\d+)%$/))) ctx.contractShare = Number(m[1]) / 100;
    else if ((m = t.match(/^the policy is "(.+)"$/))) ctx.policy = m[1];
    else if (t === "these recovery sailings:") {
      ctx.sailings = step.table.map((r) => ({
        id: r.sailing,
        departs: parseTime(r.departs),
        lm: Number(r["lane metres"]),
        plugs: r.plugs ? Number(r.plugs) : 10,
        adr: r.adr ? Number(r.adr) : 10,
        project: (r["high deck"] || "yes") === "yes",
      }));
    } else if (t === "these stranded units:") {
      ctx.units = step.table.map((r) => makeUnit(r.unit, r.type, r));
    } else if ((m = t.match(/^"(.+)", an? (\w+), is already confirmed on "(.+)"$/))) {
      ctx.confirmed.push({ unit: makeUnit(m[1], m[2]), sailing: m[3] });
    } else if ((m = t.match(/^the duty manager overrides "(.+)" to "(.+)" with reason "(.+)"$/))) {
      ctx.overrides.set(m[1], { sailing: m[2], reason: m[3] });
    } else if (t === "the recovery plan is built") {
      ctx.plan = buildPlan({ units: ctx.units, sailings: ctx.sailings, now: ctx.now, cutoffMin: ctx.cutoffMin, contractShare: ctx.contractShare, policy: ctx.policy, overrides: ctx.overrides, confirmed: ctx.confirmed });
    } else if ((m = t.match(/^"(.+)" is planned on "(.+)"$/))) {
      assert.equal(line(m[1]).sailing, m[2], `${m[1]}: ${line(m[1]).reasons.join(" | ")}`);
    } else if (t === "the plan is:") {
      for (const r of step.table) {
        const l = line(r.unit);
        const got = l.status === "hold-customs" ? "HOLD" : l.sailing ?? "NONE";
        assert.equal(got, r.sailing, `${r.unit}: ${l.reasons.join(" | ")}`);
      }
    } else if ((m = t.match(/^"(.+)" is held for customs$/))) {
      assert.equal(line(m[1]).status, "hold-customs");
    } else if ((m = t.match(/^"(.+)" is escalated$/))) {
      assert.equal(line(m[1]).escalate, true, line(m[1]).reasons.join(" | "));
    } else if ((m = t.match(/^the reasons for "(.+)" mention "(.+)"$/))) {
      const reasons = line(m[1]).reasons.join(" | ");
      assert.ok(reasons.includes(m[2]), `expected "${m[2]}" in: ${reasons}`);
    } else if (t === "no sailing is over its lane metres, plugs or ADR slots") {
      for (const s of ctx.plan.left) {
        assert.ok(s.lm >= 0 && s.plugs >= 0 && s.adr >= 0, `${s.id} over capacity`);
      }
    } else {
      throw new Error(`No step definition for: ${t}`);
    }
  }
}

const scenarios = parseFeature(path.join(ROOT, "docs/05-rules/features/allocation.feature"));
for (const s of scenarios) {
  const id = s.tags.find((x) => x.startsWith("SC-"));
  test(`${id} ${s.name}`, () => run(s));
}
