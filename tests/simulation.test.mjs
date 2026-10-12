// Invariants of the storm-night simulation. If one of these fails, the numbers in the case cannot be trusted.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simulate } from "../site/assets/lib/simulate.mjs";
import { businessCase } from "../site/assets/lib/business-case.mjs";
import { paramsFrom, trackedParams } from "../site/assets/lib/util.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const storm = read("model/storm-night.json");
const doc = read("model/assumptions.json");
const base = paramsFrom(doc);

test("same seed, same night: the simulation is deterministic", () => {
  const a = simulate({ storm, params: base, seed: 5, mode: "asis" });
  const b = simulate({ storm, params: base, seed: 5, mode: "asis" });
  assert.deepEqual(a, b);
});

for (const mode of ["asis", "tobe"]) {
  test(`${mode}: no sailing carries more than its lane metres, plugs, ADR slots or deck allow`, () => {
    for (const seed of [1, 2, 3]) {
      const r = simulate({ storm, params: base, seed, mode, record: true });
      const sailed = new Map();
      for (const u of r.unitLog) {
        if (!u.log.some(([, s]) => s === "departed")) continue;
        const list = sailed.get(u.sailing) ?? [];
        list.push(u);
        sailed.set(u.sailing, list);
      }
      for (const s of storm.recovery) {
        const us = sailed.get(s.id) ?? [];
        assert.ok(us.reduce((t, u) => t + u.lm, 0) <= s.lm, `${s.id} lane metres`);
        assert.ok(us.filter((u) => u.type === "reefer").length <= s.plugs, `${s.id} plugs`);
        assert.ok(us.filter((u) => u.type === "adr").length <= s.adr, `${s.id} ADR`);
        if (!s.project) assert.equal(us.filter((u) => u.type === "project").length, 0, `${s.id} deck`);
      }
    }
  });

  test(`${mode}: every unit ends the weekend sailed or withdrawn`, () => {
    const r = simulate({ storm, params: base, seed: 7, mode, record: true });
    const open = r.unitLog.filter((u) => !["departed", "withdrawn"].includes(u.log[u.log.length - 1][1]));
    assert.equal(open.length, 0, open.map((u) => u.id).join(","));
  });
}

test("G-01: in TO-BE, 90% of units have a confirmed sailing within 2 hours, on every night", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const r = simulate({ storm, params: base, seed, mode: "tobe" });
    assert.ok(r.certaintyP90H <= 2, `night ${seed}: ${r.certaintyP90H} h`);
  }
});

test("G-03: TO-BE never lets more perishables miss their deadline than AS-IS on the same night", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const a = simulate({ storm, params: base, seed, mode: "asis" });
    const t = simulate({ storm, params: base, seed, mode: "tobe" });
    assert.ok(t.perishablesLate <= a.perishablesLate, `night ${seed}: ${t.perishablesLate} vs ${a.perishablesLate}`);
  }
});

test("G-03: with perfect booking data (A-05 = 100%) the recommended policy protects nearly every perishable", () => {
  const r = simulate({ storm, params: { ...base, perishableFlagged: 1 }, seed: 1, mode: "tobe" });
  assert.ok(r.perishablesLate <= 3, `${r.perishablesLate} late`);
});

test("every documented assumption is read by the model, and nothing undocumented is", () => {
  const { params, seen } = trackedParams(base);
  const a = [simulate({ storm, params, seed: 1, mode: "asis" })];
  const t = [simulate({ storm, params, seed: 1, mode: "tobe" })];
  businessCase(a, t, params);
  const unused = doc.assumptions.map((x) => x.key).filter((k) => !seen.has(k));
  assert.deepEqual(unused, [], `documented but never used: ${unused.join(", ")}`);
});

test("assumption ids are unique and numbered without gaps", () => {
  const ids = doc.assumptions.map((a) => a.id);
  ids.forEach((id, i) => assert.equal(id, `A-${String(i + 1).padStart(2, "0")}`));
});
