// Turns paired AS-IS / TO-BE runs (same seeds, same freight) into a business case with a range.
import { quantile } from "./util.mjs";

export function npv(perYear, p) {
  let v = -p.buildCost;
  for (let y = 1; y <= p.years; y++) v += (perYear - p.runCost) / (1 + p.discountRate) ** y;
  return v;
}

export function paybackMonths(perYear, p) {
  const net = perYear - p.runCost;
  return net > 0 ? (p.buildCost / net) * 12 : Infinity;
}

export function businessCase(asis, tobe, p) {
  if (asis.length !== tobe.length) throw new Error("Runs must be paired by seed");
  const savings = asis.map((a, i) => a.cost.total - tobe[i].cost.total).sort((x, y) => x - y);
  const perEvent = { p10: quantile(savings, 0.1), p50: quantile(savings, 0.5), p90: quantile(savings, 0.9) };
  const perYear = Object.fromEntries(Object.entries(perEvent).map(([k, v]) => [k, v * p.eventsPerYear]));
  const byLine = {};
  for (const key of ["perishables", "calls", "withdrawn"]) {
    const d = asis.map((a, i) => a.cost[key] - tobe[i].cost[key]).sort((x, y) => x - y);
    byLine[key] = quantile(d, 0.5);
  }
  return {
    runs: asis.length,
    perEvent,
    perYear,
    byLine,
    npv: { p10: npv(perYear.p10, p), p50: npv(perYear.p50, p), p90: npv(perYear.p90, p) },
    paybackMonthsP50: paybackMonths(perYear.p50, p),
    shareNegative: savings.filter((s) => s < 0).length / savings.length,
  };
}
