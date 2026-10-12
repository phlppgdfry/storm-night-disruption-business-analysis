// A deliberately small Gherkin reader: scenarios, tags, steps and tables. Enough for the allocation examples.
import fs from "node:fs";

export function parseFeature(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const scenarios = [];
  let tags = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("@")) {
      tags = line.split(/\s+/).map((t) => t.slice(1));
      continue;
    }
    if (line.startsWith("Scenario:")) {
      current = { name: line.slice("Scenario:".length).trim(), tags, steps: [] };
      scenarios.push(current);
      tags = [];
      continue;
    }
    if (!current) continue;
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      const step = current.steps[current.steps.length - 1];
      step.rows ??= [];
      step.rows.push(cells);
      continue;
    }
    const m = line.match(/^(Given|When|Then|And|But)\s+(.*)$/);
    if (m) current.steps.push({ text: m[2] });
  }
  for (const s of scenarios) {
    for (const step of s.steps) {
      if (!step.rows) continue;
      const [head, ...body] = step.rows;
      step.table = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
    }
  }
  return scenarios;
}

const DAYS = { Mon: -3, Tue: -2, Wed: -1, Thu: 0, Fri: 1, Sat: 2, Sun: 3 };
export function parseTime(text) {
  const m = text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Bad time: ${text}`);
  return DAYS[m[1]] * 1440 + Number(m[2]) * 60 + Number(m[3]);
}
