#!/usr/bin/env node
// Checks the traceability chain end to end and writes the graph the site draws.
//   voice (Q) → pain (P) → goal (G) → KPI (K) → rule (R) → story (US) → example (SC) / BAT → screen (SCR)
// Fails (exit 1) on any orphan or dangling ID. Writes site/data/trace.json.
// Run: node scripts/check-trace.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULES } from "../site/assets/lib/allocate.mjs";
import { parseFeature } from "../tests/gherkin.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

export function checkTrace() {
  const tr = read("model/trace.json");
  const assumptions = read("model/assumptions.json").assumptions;
  const results = fs.existsSync(path.join(ROOT, "site/data/results.json")) ? read("site/data/results.json") : null;
  const scenarios = parseFeature(path.join(ROOT, "docs/05-rules/features/allocation.feature")).map((s) => ({
    id: s.tags.find((t) => t.startsWith("SC-")),
    name: s.name,
    rules: s.tags.filter((t) => t.startsWith("R-")),
    policy: s.tags.includes("policy"),
  }));
  const errors = [];
  const fail = (msg) => errors.push(msg);

  const ids = new Map();
  const reg = (kind, id) => {
    if (ids.has(id)) fail(`duplicate id ${id}`);
    ids.set(id, kind);
  };
  tr.stakeholders.forEach((x) => reg("stakeholder", x.id));
  tr.quotes.forEach((x) => reg("quote", x.id));
  tr.pains.forEach((x) => reg("pain", x.id));
  tr.goals.forEach((x) => reg("goal", x.id));
  tr.kpis.forEach((x) => reg("kpi", x.id));
  tr.rules.forEach((x) => reg("rule", x.id));
  tr.stories.forEach((x) => reg("story", x.id));
  tr.screens.forEach((x) => reg("screen", x.id));
  tr.bat.forEach((x) => reg("bat", x.id));
  tr.decisions.forEach((x) => reg("decision", x.id));
  tr.risks.forEach((x) => reg("risk", x.id));
  scenarios.forEach((x) => reg("scenario", x.id));
  assumptions.forEach((x) => reg("assumption", x.id));
  const exists = (id, kind) => ids.get(id) === kind;

  // Voices → pains: no pain without somebody who said it.
  for (const q of tr.quotes) {
    if (!exists(q.by, "stakeholder")) fail(`${q.id}: unknown stakeholder ${q.by}`);
    if (q.parked) continue;
    if (!q.leadsTo?.length) fail(`${q.id}: leads nowhere and is not parked with a reason`);
    for (const p of q.leadsTo ?? []) if (!exists(p, "pain")) fail(`${q.id}: unknown pain ${p}`);
  }
  for (const p of tr.pains) {
    if (!tr.quotes.some((q) => q.leadsTo?.includes(p.id))) fail(`${p.id}: no stakeholder voiced this pain`);
    if (!p.goals.length) fail(`${p.id}: addresses no goal`);
    for (const g of p.goals) if (!exists(g, "goal")) fail(`${p.id}: unknown goal ${g}`);
  }
  // Goals → KPIs and stories.
  for (const g of tr.goals) {
    if (!tr.pains.some((p) => p.goals.includes(g.id))) fail(`${g.id}: no pain asks for this goal`);
    if (!g.kpis.length) fail(`${g.id}: no KPI`);
    for (const k of g.kpis) if (!exists(k, "kpi")) fail(`${g.id}: unknown KPI ${k}`);
    if (!tr.stories.some((s) => s.goals.includes(g.id))) fail(`${g.id}: no story delivers this goal`);
  }
  for (const k of tr.kpis) {
    if (k.result && results && !(k.result in results.tobe)) fail(`${k.id}: result ${k.result} is not produced by the simulation`);
    if (!k.result && !k.measured) fail(`${k.id}: neither simulated nor measured`);
  }
  // Rules ↔ module ↔ examples.
  const moduleRules = Object.keys(RULES);
  for (const r of moduleRules) if (!exists(r, "rule")) fail(`${r}: in allocate.mjs but not in the trace`);
  for (const r of tr.rules) {
    if (!moduleRules.includes(r.id)) fail(`${r.id}: in the trace but not in allocate.mjs`);
    if (!r.goals.length) fail(`${r.id}: serves no goal`);
    if (!scenarios.some((s) => s.rules.includes(r.id))) fail(`${r.id}: no executable example tagged @${r.id}`);
  }
  // Stories → goals, examples, BAT.
  for (const s of tr.stories) {
    if (!s.goals.length) fail(`${s.id}: serves no goal`);
    for (const g of s.goals) if (!exists(g, "goal")) fail(`${s.id}: unknown goal ${g}`);
    for (const r of s.rules) if (!exists(r, "rule")) fail(`${s.id}: unknown rule ${r}`);
    for (const sc of s.scenarios) if (!exists(sc, "scenario")) fail(`${s.id}: unknown example ${sc}`);
    for (const b of s.bat) if (!exists(b, "bat")) fail(`${s.id}: unknown BAT case ${b}`);
    if (s.release === "R1" && !s.scenarios.length && !s.bat.length) fail(`${s.id}: release-1 story without an example or a BAT case`);
  }
  for (const sc of scenarios) {
    if (!tr.stories.some((s) => s.scenarios.includes(sc.id))) fail(`${sc.id}: example belongs to no story`);
  }
  for (const b of tr.bat) {
    for (const s of b.stories) if (!exists(s, "story")) fail(`${b.id}: unknown story ${s}`);
  }
  for (const scr of tr.screens) {
    if (!scr.stories.length) fail(`${scr.id}: no story`);
    for (const s of scr.stories) if (!exists(s, "story")) fail(`${scr.id}: unknown story ${s}`);
  }
  for (const d of tr.decisions) if (!exists(d.owner, "stakeholder")) fail(`${d.id}: owner ${d.owner} unknown`);
  for (const x of tr.risks) {
    if (!x.mitigations.length) fail(`${x.id}: no mitigation`);
    for (const m of x.mitigations) if (!ids.has(m)) fail(`${x.id}: unknown mitigation ${m}`);
  }

  // Every ID mentioned in a document must exist.
  const ID = /\b(?:SCR|BAT|US|SC|S|Q|P|G|K|R|A|D|X)-\d{2}\b/g;
  const docs = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", "data"].includes(e.name) && dir === ROOT) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|feature)$/.test(e.name)) docs.push(p);
    }
  };
  walk(ROOT);
  const mentioned = new Set();
  for (const file of docs) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(ID)) {
      mentioned.add(m[0]);
      if (!ids.has(m[0])) fail(`${path.relative(ROOT, file)}: mentions ${m[0]}, which does not exist`);
    }
  }

  // Graph for the site.
  const nodes = [];
  const edges = [];
  const node = (id, kind, label, extra = {}) => nodes.push({ id, kind, label, ...extra });
  tr.stakeholders.forEach((s) => node(s.id, "stakeholder", `${s.name} — ${s.role}`));
  tr.quotes.forEach((q) => {
    node(q.id, "quote", q.text, { by: q.by, parked: q.parked ?? null });
    edges.push([q.by, q.id]);
    (q.leadsTo ?? []).forEach((p) => edges.push([q.id, p]));
  });
  tr.pains.forEach((p) => {
    node(p.id, "pain", p.text);
    p.goals.forEach((g) => edges.push([p.id, g]));
  });
  tr.goals.forEach((g) => {
    node(g.id, "goal", g.text);
    g.kpis.forEach((k) => edges.push([g.id, k]));
  });
  tr.kpis.forEach((k) => {
    const r = k.result && results ? { asis: results.asis[k.result]?.p50, tobe: results.tobe[k.result]?.p50 } : null;
    node(k.id, "kpi", k.text, { target: k.target, values: r, measured: k.measured ?? null });
  });
  tr.rules.forEach((r) => {
    node(r.id, "rule", RULES[r.id]);
    r.goals.forEach((g) => edges.push([g, r.id]));
  });
  tr.stories.forEach((s) => {
    node(s.id, "story", s.title, { release: s.release, epic: s.epic });
    s.goals.forEach((g) => edges.push([g, s.id]));
    s.rules.forEach((r) => edges.push([r, s.id]));
    s.scenarios.forEach((sc) => edges.push([s.id, sc]));
    s.bat.forEach((b) => edges.push([s.id, b]));
  });
  scenarios.forEach((sc) => node(sc.id, "scenario", sc.name, { executable: true }));
  tr.bat.forEach((b) => node(b.id, "bat", b.title));
  tr.screens.forEach((scr) => {
    node(scr.id, "screen", scr.name);
    scr.stories.forEach((s) => edges.push([s, scr.id]));
  });
  const graph = {
    _note: "Generated by scripts/check-trace.mjs — do not edit.",
    columns: ["stakeholder", "quote", "pain", "goal", "kpi", "rule", "story", "scenario", "bat", "screen"],
    nodes,
    edges: [...new Map(edges.map((e) => [e.join(">"), e])).values()],
    counts: Object.fromEntries(["stakeholder", "quote", "pain", "goal", "kpi", "rule", "story", "scenario", "bat", "screen", "decision", "risk", "assumption"].map((k) => [k, [...ids.values()].filter((v) => v === k).length])),
  };
  return { errors, graph, mentioned: mentioned.size };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, graph, mentioned } = checkTrace();
  fs.mkdirSync(path.join(ROOT, "site/data"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "site/data/trace.json"), JSON.stringify(graph, null, 1) + "\n");
  if (errors.length) {
    console.error(`${errors.length} traceability error(s):`);
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }
  const c = graph.counts;
  console.log(`Trace OK: ${c.quote} voices → ${c.pain} pains → ${c.goal} goals → ${c.kpi} KPIs → ${c.rule} rules → ${c.story} stories → ${c.scenario} executable examples + ${c.bat} BAT cases → ${c.screen} screens; ${graph.edges.length} links, ${mentioned} IDs cited in documents.`);
}
