// The recovery allocation rules as one module.
// The prototype, the simulation and the executable acceptance examples all call buildPlan(),
// so the rules in docs/05-rules/allocation-rules.md are the rules that are tested.
import { fmt } from "./util.mjs";

export const RULES = {
  "R-01": "A unit can only be planned on a sailing whose booking cut-off has not passed.",
  "R-02": "Planned lane metres never exceed the free lane metres of the sailing.",
  "R-03": "Reefers only go on a sailing with a free reefer plug.",
  "R-04": "Dangerous goods (ADR) only go on a sailing with a free ADR slot.",
  "R-05": "Oversized / project cargo only goes on a sailing with a high deck.",
  "R-06": "A unit without a customs pre-lodgement is held, not planned, until the pre-lodgement exists.",
  "R-07": "Class 1: perishable reefers, earliest deadline first.",
  "R-08": "Class 2: accompanied units (a driver is waiting), earliest arrival first.",
  "R-09": "Contract customers have first claim on their allotment share of every recovery sailing.",
  "R-10": "Everything else: original sailing first, then original booking time (first booked, first rebooked).",
  "R-11": "A confirmed unit is never moved to a later sailing by a replan round.",
  "R-12": "The duty manager may override a unit's sailing with a reason code; R-01 to R-05 and R-13 still apply.",
  "R-13": "A unit is only planned on a sailing it can reach: at the terminal 60 minutes before departure.",
  "R-14": "A perishable unit that cannot sail before its deadline is planned as early as possible and escalated to customer service.",
  "R-15": "Scarce slots first: ADR and project units are planned before the lane metres are handed out, onto the sailings that have their slot.",
  "R-16": "When a sailing's capacity is reduced, confirmed units that no longer fit are re-planned first and escalated; R-11 protects against replans, not against a smaller ship.",
};

export const POLICIES = {
  recommended: {
    label: "Recommended",
    owner: "Agreed in the policy workshop (decision D-04)",
    summary: "Scarce slots first, then perishables by deadline, then waiting drivers, then contract allotment share, then first booked first rebooked.",
    classes: true,
    quota: true,
    scarceFirst: true,
  },
  fifo: {
    label: "First booked, first rebooked",
    owner: "Customer service's proposal",
    summary: "One queue for everybody, in original booking order.",
    classes: false,
    quota: false,
  },
  keyAccountsFirst: {
    label: "Key accounts first",
    owner: "Sales' proposal",
    summary: "All contract customers' units first, then everybody else.",
    classes: false,
    quota: false,
    contractFirst: true,
  },
  perishablesFirst: {
    label: "Perishables and drivers first",
    owner: "Operations' proposal",
    summary: "Perishables by deadline, then waiting drivers, then first booked first rebooked.",
    classes: true,
    quota: false,
  },
};

export const OVERRIDE_REASONS = {
  "OV-1": "Customer-specific contractual commitment",
  "OV-2": "Live animals or medical urgency",
  "OV-3": "Stowage instruction from the load planner",
  "OV-4": "Keep a customer's units together on one sailing",
};

export const TERMINAL_LEAD_MIN = 60;

const fifoKey = (a, b) =>
  a.originalDeparture - b.originalDeparture || a.bookedAt - b.bookedAt || (a.id < b.id ? -1 : 1);

export function unitClass(unit, policy) {
  const pol = POLICIES[policy];
  if (pol.classes && unit.perishable) return 1;
  if (pol.classes && unit.accompanied) return 2;
  return 3;
}

function check(unit, s, now, cutoffMin) {
  if (s.departs - cutoffMin < now) return ["R-01", `${s.id} skipped: booking closed at ${fmt(s.departs - cutoffMin)}`];
  if (unit.availableAt > s.departs - TERMINAL_LEAD_MIN)
    return ["R-13", `${s.id} skipped: unit cannot be at the terminal before ${fmt(s.departs - TERMINAL_LEAD_MIN)}`];
  if (unit.project && !s.project) return ["R-05", `${s.id} skipped: no high deck for project cargo`];
  if (unit.reefer && s.plugs < 1) return ["R-03", `${s.id} skipped: no reefer plug left`];
  if (unit.adr && s.adr < 1) return ["R-04", `${s.id} skipped: no ADR slot left`];
  if (s.lm < unit.lm) return ["R-02", `${s.id} skipped: ${Math.max(0, Math.round(s.lm))} m free, unit needs ${unit.lm} m`];
  return null;
}

function take(unit, s) {
  s.lm -= unit.lm;
  if (unit.reefer) s.plugs -= 1;
  if (unit.adr) s.adr -= 1;
}

/**
 * Build a recovery plan.
 * units:     units still to plan (confirmed units are left out and their space already removed from sailings — R-11)
 * sailings:  [{ id, departs, lm, plugs, adr, project }] with FREE capacity
 * overrides: Map(unitId -> { sailing, reason }) set by the duty manager (R-12)
 * confirmed: [{ unit, sailing }] confirmed in an earlier round; they keep their space (R-11)
 * Returns { lines: [{ unitId, sailing, status, cls, reasons, escalate }], left: sailings with remaining capacity }
 */
export function buildPlan({ units, sailings, now, cutoffMin = 90, contractShare = 0.45, policy = "recommended", overrides = new Map(), confirmed = [] }) {
  const pol = POLICIES[policy];
  if (!pol) throw new Error(`Unknown policy ${policy}`);
  const left = sailings.map((s) => ({ ...s })).sort((a, b) => a.departs - b.departs);
  const byId = new Map(left.map((s) => [s.id, s]));
  const lines = new Map();
  const line = (u, extra) => lines.set(u.id, { unitId: u.id, sailing: null, status: "planned", cls: unitClass(u, policy), reasons: [], escalate: false, ...extra });
  const ensureLine = (u, why) => {
    if (!lines.has(u.id)) line(u, { reasons: [why] });
    else lines.get(u.id).reasons.push(why);
    return lines.get(u.id);
  };

  // R-11: units confirmed in an earlier round keep their sailing and their space —
  // unless the sailing itself shrank (R-16, storm drill finding F-5): then the last confirmed no longer fit.
  const displaced = [];
  for (const { unit, sailing } of confirmed) {
    const s = byId.get(sailing);
    const fits = s && s.lm >= unit.lm && (!unit.reefer || s.plugs >= 1) && (!unit.adr || s.adr >= 1) && (!unit.project || s.project);
    if (fits) {
      take(unit, s);
      line(unit, { sailing, status: "confirmed", reasons: [`R-11 already confirmed on ${sailing} — not moved by a replan`] });
    } else {
      displaced.push(unit);
      line(unit, { escalate: true, reasons: [`R-16 ${sailing} no longer has room after a capacity change — re-planned first and escalated`] });
    }
  }

  const pending = [];
  for (const u of units) {
    if (!u.customsOk) {
      line(u, { status: "hold-customs", reasons: ["R-06 held: customs pre-lodgement missing"] });
      continue;
    }
    pending.push(u);
  }

  // R-12 duty manager overrides go first, but never past a hard constraint.
  for (const u of pending.filter((x) => overrides.has(x.id))) {
    const ov = overrides.get(u.id);
    const s = byId.get(ov.sailing);
    const fail = s ? check(u, s, now, cutoffMin) : ["R-12", `unknown sailing ${ov.sailing}`];
    if (!fail) {
      take(u, s);
      line(u, { sailing: s.id, reasons: [`R-12 override by duty manager (${ov.reason}: ${OVERRIDE_REASONS[ov.reason] ?? "reason"})`, `→ ${s.id} ${fmt(s.departs)}`] });
    } else {
      line(u, { reasons: [`R-12 override to ${ov.sailing} refused: ${fail[1]}`] });
    }
  }
  let open = pending.filter((u) => !lines.get(u.id)?.sailing);

  const placeEarliestLater = (u) => placeEarliest(u, "re-planned before all other units");

  const placeEarliest = (u, why) => {
    const ln = ensureLine(u, why);
    for (const s of left) {
      const fail = check(u, s, now, cutoffMin);
      if (fail) {
        if (ln.reasons.length < 5) ln.reasons.push(fail[1]);
        continue;
      }
      take(u, s);
      ln.sailing = s.id;
      ln.reasons.push(`→ ${s.id} ${fmt(s.departs)}, earliest sailing that fits`);
      return true;
    }
    return false;
  };

  for (const u of displaced) placeEarliestLater(u);

  // R-15: units that need an ADR slot or a high deck go first, in booking order, so those slots are not lost
  // to ordinary units filling the lane metres. Found in simulation run 1 (decision D-06).
  const all = open;
  if (pol.scarceFirst) {
    const scarce = open.filter((u) => u.adr || u.project).sort(fifoKey);
    for (const u of scarce) placeEarliest(u, `R-15 scarce slot first: ${u.adr ? "ADR slot" : "high deck"} needed`);
    const done = new Set(scarce.map((u) => u.id));
    open = open.filter((u) => !done.has(u.id));
  }

  // Classes 1 and 2 (R-07, R-08) where the policy uses them.
  const c1 = open.filter((u) => unitClass(u, policy) === 1).sort((a, b) => a.deadline - b.deadline || fifoKey(a, b));
  const c2 = open.filter((u) => unitClass(u, policy) === 2).sort((a, b) => a.availableAt - b.availableAt || fifoKey(a, b));
  for (const u of c1) placeEarliest(u, `R-07 class 1: perishable, deadline ${fmt(u.deadline)}`);
  for (const u of c2) placeEarliest(u, `R-08 class 2: driver waiting since ${fmt(u.availableAt)}`);

  let rest = open.filter((u) => unitClass(u, policy) === 3).sort(fifoKey);
  if (pol.contractFirst) {
    rest = [...rest.filter((u) => u.contract), ...rest.filter((u) => !u.contract)];
    rest.forEach((u, i) => placeEarliest(u, u.contract ? `Key accounts first: contract queue position ${i + 1}` : `Key accounts first: after all contract units, position ${i + 1}`));
  } else if (!pol.quota) {
    rest.forEach((u, i) => placeEarliest(u, `R-10 queue position ${i + 1} (original sailing ${u.originalSailing}, booked ${fmt(u.bookedAt)})`));
  } else {
    // R-09 + R-10: per sailing, contract units first up to their share, then one queue in booking order.
    const position = new Map(rest.map((u, i) => [u.id, i + 1]));
    for (const u of rest) ensureLine(u, `R-10 queue position ${position.get(u.id)} (original sailing ${u.originalSailing}, booked ${fmt(u.bookedAt)})`);
    let waiting = rest;
    for (const s of left) {
      if (!waiting.length) break;
      const quota = contractShare * s.lm;
      let used = 0;
      const placed = new Set();
      for (const u of waiting) {
        if (!u.contract || used + u.lm > quota) continue;
        if (check(u, s, now, cutoffMin)) continue;
        take(u, s);
        used += u.lm;
        placed.add(u.id);
        const ln = lines.get(u.id);
        ln.sailing = s.id;
        ln.reasons.push(`R-09 within the contract allotment share of ${s.id} (${Math.round(contractShare * 100)}%)`, `→ ${s.id} ${fmt(s.departs)}`);
      }
      for (const u of waiting) {
        if (placed.has(u.id)) continue;
        const fail = check(u, s, now, cutoffMin);
        const ln = lines.get(u.id);
        if (fail) {
          if (ln.reasons.length < 5) ln.reasons.push(fail[0] === "R-02" ? `${s.id} full before this unit's turn` : fail[1]);
          continue;
        }
        take(u, s);
        placed.add(u.id);
        ln.sailing = s.id;
        ln.reasons.push(`→ ${s.id} ${fmt(s.departs)}, first sailing with room at its queue position`);
      }
      waiting = waiting.filter((u) => !placed.has(u.id));
    }
  }

  // Anything left has no capacity in the horizon; R-14 escalation for perishables.
  const unitById = new Map([...units, ...confirmed.map((c) => c.unit)].map((u) => [u.id, u]));
  for (const u of displaced) {
    if (!lines.get(u.id).sailing) {
      lines.get(u.id).status = "no-capacity";
      lines.get(u.id).reasons.push("No sailing in the planning horizon fits — picked up by the next replan round");
    }
  }
  for (const u of all) {
    const ln = lines.get(u.id);
    if (!ln.sailing) {
      ln.status = "no-capacity";
      ln.reasons.push("No sailing in the planning horizon fits — picked up by the next replan round");
    }
  }
  for (const ln of lines.values()) {
    const u = unitById.get(ln.unitId);
    if (u.perishable && ln.status === "planned" && ln.sailing) {
      const dep = byId.get(ln.sailing).departs;
      if (dep > u.deadline) {
        ln.escalate = true;
        ln.reasons.push(`R-14 escalate: sails ${fmt(dep)}, after its deadline ${fmt(u.deadline)}`);
      }
    }
  }
  return { lines: [...lines.values()], left };
}
