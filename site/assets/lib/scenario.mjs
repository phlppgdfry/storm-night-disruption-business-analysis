// Builds one storm night: the stranded units, their customers and the recovery capacity.
// The same seed always gives the same night, so AS-IS and TO-BE are compared on identical freight.
import { rng } from "./util.mjs";

export const LANE_METRES = { trailer: 14, accompanied: 17.5, reefer: 14, adr: 14, project: 22 };

function weightedPicker(r, count, exponent) {
  const weights = Array.from({ length: count }, (_, i) => 1 / (i + 1) ** exponent);
  const total = weights.reduce((s, w) => s + w, 0);
  return () => {
    let x = r.next() * total;
    for (let i = 0; i < count; i++) {
      x -= weights[i];
      if (x <= 0) return i;
    }
    return count - 1;
  };
}

export function buildScenario(storm, p, seed = 1) {
  const r = rng(seed);
  const nContract = p.contractCustomers;
  const nOther = p.customers - nContract;
  const customers = [];
  for (let i = 0; i < p.customers; i++) {
    customers.push({ id: `C-${String(i + 1).padStart(3, "0")}`, contract: i < nContract, units: [] });
  }
  const pickContract = weightedPicker(r, nContract, 0.6);
  const pickOther = weightedPicker(r, nOther, 1.0);

  const units = [];
  for (const sailing of storm.cancelled) {
    const n = Math.round(p.unitsPerSailing * r.uniform(0.95, 1.05));
    for (let k = 0; k < n; k++) {
      const contract = r.chance(p.contractShare);
      const customer = contract ? customers[pickContract()] : customers[nContract + pickOther()];
      const x = r.next();
      let type = "trailer";
      if (x < p.shareAccompanied) type = "accompanied";
      else if (x < p.shareAccompanied + p.shareReefer) type = "reefer";
      else if (x < p.shareAccompanied + p.shareReefer + p.shareAdr) type = "adr";
      else if (x < p.shareAccompanied + p.shareReefer + p.shareAdr + p.shareProject) type = "project";
      const perishable = type === "reefer" && r.chance(p.sharePerishable);
      const customsOk = !r.chance(p.customsMissingShare);
      const unit = {
        id: `U-${String(units.length + 1).padStart(4, "0")}`,
        customer: customer.id,
        contract,
        type,
        lm: LANE_METRES[type],
        reefer: type === "reefer",
        adr: type === "adr",
        project: type === "project",
        accompanied: type === "accompanied",
        perishable,
        // What the booking data says: only flagged perishables can be protected by the TO-BE rules.
        flagged: perishable && r.chance(p.perishableFlagged),
        deadline: perishable ? sailing.departs + r.uniform(p.deadlineMinH, p.deadlineMaxH) * 60 : null,
        customsOk,
        customsFixAt: customsOk ? null : storm.cancelDecisionAt + r.exp(p.customsFixMeanH * 60),
        originalSailing: sailing.id,
        originalDeparture: sailing.departs,
        bookedAt: sailing.departs - r.uniform(6 * 60, 96 * 60),
        eta: sailing.departs - r.uniform(60, p.arrivalMaxH * 60),
      };
      units.push(unit);
      customer.units.push(unit.id);
    }
  }
  const sailings = storm.recovery.map((s) => ({ ...s }));
  return { units, customers: customers.filter((c) => c.units.length), sailings };
}
