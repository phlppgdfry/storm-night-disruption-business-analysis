// Minute-by-minute simulation of one storm night, AS-IS (phones and account managers)
// or TO-BE (recovery plan built by the rules in allocate.mjs, approved by the duty manager).
// Every number it uses comes from model/assumptions.json via `params`.
import { rng, fmt, quantile } from "./util.mjs";
import { buildScenario } from "./scenario.mjs";
import { buildPlan, TERMINAL_LEAD_MIN } from "./allocate.mjs";

const DAY = 1440;

function agentsAt(t, p) {
  const h = (t % DAY) / 60;
  if (h >= 16 && h < 22) return p.agentsEvening;
  if (h >= 22 || h < 7) return p.agentsNight;
  return p.agentsDay;
}

function insertSorted(list, item) {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= item.t) lo = mid + 1;
    else hi = mid;
  }
  list.splice(lo, 0, item);
}

export function simulate({ storm, params: p, seed = 1, mode = "tobe", policy = "recommended", record = false }) {
  const { units: baseUnits, customers, sailings: baseSailings } = buildScenario(storm, p, seed);
  const r = rng(seed * 7919 + (mode === "asis" ? 17 : 29));
  const cancelAt = storm.cancelDecisionAt;
  const endAt = storm.endAt;
  const cutoff = p.cutoffMin;

  const units = baseUnits.map((u) => ({
    ...u,
    status: "stranded", // stranded → confirmed → departed | withdrawn | hold
    sailing: null,
    arrivedAt: u.eta,
    certainAt: null,
    departedAt: null,
    withdrawnAt: null,
    bumps: 0,
    plannerBooked: false,
    log: [[cancelAt, "stranded"]],
  }));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const custById = new Map(customers.map((c) => [c.id, c]));
  const sailings = baseSailings.map((s) => ({ ...s, free: { lm: s.lm, plugs: s.plugs, adr: s.adr }, booked: [], reefers: 0, adrs: 0, closed: false, gone: false }));
  const log = [];
  const say = (t, text, kind = "info") => record && log.push({ t, text, kind });
  const setState = (u, t, state) => {
    u.status = state;
    if (record) u.log.push([t, state]);
  };

  const kpi = { callsOffered: 0, callsAbandoned: 0, callsHandled: 0, agentMinutes: 0, waits: [], bumps: 0, noShows: 0, emptyLmWhileWaiting: 0, yardPeak: 0, yardMinutesOver: 0 };

  // ---- booking helpers ----------------------------------------------------
  const openSailings = (now) => sailings.filter((s) => !s.gone && s.departs - cutoff >= now).sort((a, b) => a.departs - b.departs);
  const attach = (u, s, now, byPlanner) => {
    s.booked.push(u.id);
    s.free.lm -= u.lm;
    if (u.reefer) s.reefers += 1;
    if (u.adr) s.adrs += 1;
    u.sailing = s.id;
    u.plannerBooked = byPlanner;
    u.bookedOnAt = now;
  };
  const detach = (u, s, restoreLm) => {
    s.booked = s.booked.filter((id) => id !== u.id);
    if (restoreLm) s.free.lm += u.lm;
    if (u.reefer) s.reefers -= 1;
    if (u.adr) s.adrs -= 1;
    u.sailing = null;
  };
  const fitsAll = (u, s) =>
    s.free.lm >= u.lm && (!u.reefer || s.plugs - s.reefers >= 1) && (!u.adr || s.adr - s.adrs >= 1) && (!u.project || s.project) && u.arrivedAt <= s.departs - TERMINAL_LEAD_MIN;

  // AS-IS agent: sees lane metres only (the booking screen has no plug or ADR view).
  const agentBook = (u, now) => {
    const s = openSailings(now).find((x) => x.free.lm >= u.lm);
    if (!s) return false;
    attach(u, s, now, false);
    u.certainAt = now;
    setState(u, now, "confirmed");
    return true;
  };
  // Load planner / system: respects every constraint.
  const plannerBook = (u, now, after = -Infinity) => {
    const s = openSailings(now).find((x) => x.departs > after && fitsAll(u, x));
    if (!s) return false;
    attach(u, s, now, true);
    u.certainAt = now;
    setState(u, now, "confirmed");
    return true;
  };

  // ---- contacts (calls) -----------------------------------------------------
  const contacts = []; // { t, customer }
  const queue = []; // { customer, since, patience }
  const inCall = []; // { end, customer, kind }
  const amQueue = [];
  const amBusy = [];
  const needsRebooking = (c) => c.units.map((id) => unitById.get(id)).filter((u) => u.status === "stranded");

  if (mode === "asis") {
    for (const c of customers) {
      const evening = r.chance(p.eveningCallShare);
      if (evening) insertSorted(contacts, { t: cancelAt + r.exp(p.callDelayMeanMin), customer: c.id });
      else if (!c.contract) insertSorted(contacts, { t: DAY + 7 * 60 + r.exp(75), customer: c.id });
    }
  }

  // Whole minutes: the loop runs per minute.
  const planAt = cancelAt + Math.round(p.planBuildMin);
  const approveAt = planAt + Math.round(p.approvalMin);
  const replanEvery = Math.max(1, Math.round(p.replanEveryMin));
  if (mode === "tobe") {
    for (const c of customers) if (r.chance(p.tobeCallShare)) insertSorted(contacts, { t: approveAt + r.exp(60), customer: c.id });
  }
  say(cancelAt, `${storm.stormName}: sailings ${storm.cancelled.map((s) => s.id).join(", ")} cancelled — ${units.length} units stranded`, "alert");

  // ---- TO-BE planning -------------------------------------------------------
  const planRound = (now, first) => {
    const todo = units.filter((u) => u.status === "stranded" || (u.status === "hold" && u.customsFixAt <= now));
    if (!todo.length) return 0;
    // The plan only knows what the booking data says (A-05): unflagged perishables look like ordinary reefers.
    const input = todo.map((u) => ({ ...u, perishable: u.flagged, deadline: u.flagged ? u.deadline : null, customsOk: u.customsOk || u.customsFixAt <= now, availableAt: u.arrivedAt }));
    const free = openSailings(now).map((s) => ({ id: s.id, departs: s.departs, lm: s.free.lm, plugs: s.plugs - s.reefers, adr: s.adr - s.adrs, project: s.project }));
    const { lines } = buildPlan({ units: input, sailings: free, now, cutoffMin: cutoff, contractShare: p.contractShare, policy });
    let n = 0;
    for (const ln of lines) {
      const u = unitById.get(ln.unitId);
      if (ln.status === "hold-customs") {
        if (u.status !== "hold") setState(u, now, "hold");
        continue;
      }
      if (ln.status !== "planned") continue;
      const s = sailings.find((x) => x.id === ln.sailing);
      attach(u, s, now, true);
      u.certainAt = now;
      setState(u, now, "confirmed");
      n++;
      if (u.arrivedAt > now && r.chance(p.holdAtOriginShare)) u.arrivedAt = Math.max(u.arrivedAt, s.departs - 180);
    }
    if (first || n) say(now, first ? `Recovery plan approved: ${n} units confirmed on a new sailing, customers and hauliers messaged` : `Replan round: ${n} more units confirmed`, first ? "good" : "info");
    return n;
  };

  // ---- main loop --------------------------------------------------------------
  const withdrawChecks = [cancelAt + Math.round(p.withdrawAfterH * 60), cancelAt + Math.round(2 * p.withdrawAfterH * 60)];
  const series = [];

  for (let t = cancelAt; t <= endAt; t++) {
    // Arrivals happen implicitly via arrivedAt; customs pre-lodgements may be fixed.
    if (mode === "asis") {
      for (const u of units) {
        if (u.status === "hold" && u.customsFixAt <= t) {
          setState(u, t, "stranded");
          insertSorted(contacts, { t: t + r.exp(60), customer: u.customer });
        }
      }
    }

    // TO-BE: plan, approve, replan.
    if (mode === "tobe" && t >= approveAt && (t - approveAt) % replanEvery === 0) planRound(t, t === approveAt);

    // Calls arrive.
    while (contacts.length && contacts[0].t <= t) {
      const c = contacts.shift();
      kpi.callsOffered++;
      queue.push({ customer: c.customer, since: t, patience: r.exp(p.patienceMeanMin) });
    }
    // Calls end → AS-IS rebooking happens at the end of the call.
    for (let i = inCall.length - 1; i >= 0; i--) {
      if (inCall[i].end > t) continue;
      const call = inCall.splice(i, 1)[0];
      if (mode === "asis") for (const u of needsRebooking(custById.get(call.customer))) agentBook(u, t);
    }
    // Abandon / retry.
    for (let i = queue.length - 1; i >= 0; i--) {
      if (t - queue[i].since > queue[i].patience) {
        const q = queue.splice(i, 1)[0];
        kpi.callsAbandoned++;
        insertSorted(contacts, { t: t + r.uniform(20, 60), customer: q.customer });
      }
    }
    // Agents pick up.
    let free = agentsAt(t, p) - inCall.length;
    while (free > 0 && queue.length) {
      const q = queue.shift();
      const c = custById.get(q.customer);
      const n = mode === "asis" ? needsRebooking(c).length : 0;
      const handle = mode === "asis" ? p.handleBaseMin + p.handlePerUnitMin * n : p.tobeHandleMin;
      kpi.waits.push(t - q.since);
      kpi.callsHandled++;
      kpi.agentMinutes += handle;
      inCall.push({ end: t + handle, customer: q.customer });
      free--;
    }

    // AS-IS account managers work the contract customers from the morning.
    if (mode === "asis") {
      if (t === DAY + Math.round(p.amStartMin)) {
        amQueue.push(...customers.filter((c) => c.contract).sort((a, b) => b.units.length - a.units.length).map((c) => c.id));
        say(t, "Account managers start calling key accounts", "info");
      }
      for (let i = amBusy.length - 1; i >= 0; i--) {
        if (amBusy[i].end > t) continue;
        const job = amBusy.splice(i, 1)[0];
        for (const u of needsRebooking(custById.get(job.customer))) agentBook(u, t);
      }
      while (amBusy.length < p.accountManagers && amQueue.length) {
        const id = amQueue.shift();
        const n = needsRebooking(custById.get(id)).length;
        if (!n) continue;
        amBusy.push({ end: t + p.amPerCustomerMin + 0.5 * n, customer: id });
      }
    }

    // Withdrawals: customers without certainty start sending freight elsewhere.
    if (withdrawChecks.includes(t)) {
      let n = 0;
      for (const u of units) {
        if ((u.status === "stranded" || u.status === "hold") && r.chance(p.withdrawProb)) {
          u.withdrawnAt = t;
          setState(u, t, "withdrawn");
          n++;
        }
      }
      if (n) say(t, `${n} units withdrawn by customers still waiting for an answer`, "alert");
    }

    // Load-planning cut-off: the load planner finds what the booking screen did not show.
    for (const s of sailings) {
      if (s.closed || s.departs - Math.round(cutoff) !== t) continue;
      s.closed = true;
      const ids = [...s.booked].sort((a, b) => {
        const ua = unitById.get(a);
        const ub = unitById.get(b);
        return Number(ub.plannerBooked) - Number(ua.plannerBooked) || ua.bookedOnAt - ub.bookedOnAt;
      });
      let plugs = s.plugs;
      let adr = s.adr;
      const bumped = [];
      for (const id of ids) {
        const u = unitById.get(id);
        let ok = true;
        if (!(u.customsOk || u.customsFixAt <= t)) ok = false;
        else if (u.project && !s.project) ok = false;
        else if (u.reefer && plugs < 1) ok = false;
        else if (u.adr && adr < 1) ok = false;
        if (ok) {
          if (u.reefer) plugs--;
          if (u.adr) adr--;
        } else bumped.push(u);
      }
      for (const u of bumped) {
        detach(u, s, false); // stowage is closed: the space is lost for this sailing
        u.bumps++;
        kpi.bumps++;
        if (!(u.customsOk || u.customsFixAt <= t)) {
          setState(u, t, "hold");
          u.certainAt = null;
        } else if (!plannerBook(u, t, s.departs)) {
          setState(u, t, "stranded");
          u.certainAt = null;
        }
      }
      if (bumped.length) say(t, `Cut-off ${s.id}: load planner bumps ${bumped.length} units (plugs, ADR, deck or customs)`, "alert");
    }

    // Departures.
    for (const s of sailings) {
      if (s.gone || s.departs !== t) continue;
      s.gone = true;
      let sailedLm = 0;
      let n = 0;
      for (const id of s.booked) {
        const u = unitById.get(id);
        if (u.arrivedAt <= t - TERMINAL_LEAD_MIN) {
          u.departedAt = t;
          setState(u, t, "departed");
          sailedLm += u.lm;
          n++;
        } else {
          kpi.noShows++;
          u.sailing = null;
          if (!plannerBook(u, t, t)) setState(u, t, "stranded");
        }
      }
      const unused = s.lm - sailedLm;
      // Only count waiting units that could physically have used the space (plug, ADR slot, deck).
      const plugsLeft = s.plugs - s.booked.filter((id) => unitById.get(id).reefer).length;
      const adrLeft = s.adr - s.booked.filter((id) => unitById.get(id).adr).length;
      const waitingLm = units
        .filter((u) => u.arrivedAt <= t && u.status !== "departed" && u.status !== "withdrawn" && (u.customsOk || u.customsFixAt <= t))
        .filter((u) => (!u.reefer || plugsLeft > 0) && (!u.adr || adrLeft > 0) && (!u.project || s.project))
        .reduce((sum, u) => sum + u.lm, 0);
      const emptyWhileWaiting = Math.max(0, Math.min(unused, waitingLm));
      kpi.emptyLmWhileWaiting += emptyWhileWaiting;
      s.result = { units: n, sailedLm, emptyWhileWaiting };
      say(t, `${s.id} sails with ${n} stranded units${emptyWhileWaiting >= 14 ? ` — ${Math.round(emptyWhileWaiting)} lane metres empty while units wait in the yard` : ""}`, emptyWhileWaiting >= 14 ? "alert" : "good");
    }

    // Yard.
    if (t % 10 === 0) {
      let yard = 0;
      let stranded = 0;
      let confirmed = 0;
      let departed = 0;
      let withdrawn = 0;
      for (const u of units) {
        if (u.status === "departed") departed++;
        else if (u.status === "withdrawn") withdrawn++;
        else {
          if (u.arrivedAt <= t) yard++;
          if (u.status === "confirmed") confirmed++;
          else stranded++;
        }
      }
      kpi.yardPeak = Math.max(kpi.yardPeak, yard);
      if (yard > p.yardCapacity) kpi.yardMinutesOver += 10;
      if (record) series.push({ t, stranded, confirmed, departed, withdrawn, yard, queue: queue.length });
      if (stranded + confirmed === 0 && t > cancelAt + 60) break;
    }
  }

  // ---- results ---------------------------------------------------------------
  const live = units.filter((u) => u.status !== "withdrawn");
  const certainOf = (xs) => xs.map((u) => ((u.certainAt ?? endAt) - cancelAt) / 60).sort((a, b) => a - b);
  const certainH = certainOf(live);
  const certainContractH = certainOf(live.filter((u) => u.contract));
  const delays = (pred) => live.filter((u) => u.departedAt != null && pred(u)).map((u) => (u.departedAt - u.originalDeparture) / 60).sort((a, b) => a - b);
  const dContract = delays((u) => u.contract);
  const dOther = delays((u) => !u.contract);
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const perishLate = units.filter((u) => u.perishable && u.status !== "withdrawn" && (u.departedAt == null || u.departedAt > u.deadline)).length;
  const driverHours = units
    .filter((u) => u.accompanied)
    .reduce((s, u) => {
      const until = u.departedAt ?? u.withdrawnAt ?? endAt;
      return s + Math.max(0, until - u.arrivedAt) / 60;
    }, 0);
  const withdrawn = units.length - live.length;
  const waits = kpi.waits.sort((a, b) => a - b);

  const cost = {
    perishables: perishLate * p.perishableLateCost,
    calls: (kpi.agentMinutes / 60) * p.agentCostPerHour,
    withdrawn: withdrawn * p.marginPerUnit,
  };
  cost.total = cost.perishables + cost.calls + cost.withdrawn;

  const result = {
    mode,
    policy: mode === "asis" ? "phones" : policy,
    seed,
    units: units.length,
    customers: customers.length,
    certaintyP50H: quantile(certainH, 0.5),
    certaintyP90H: quantile(certainH, 0.9),
    allCertainH: certainH[certainH.length - 1] ?? 0,
    certaintyContractP50H: quantile(certainContractH, 0.5),
    delayContractH: mean(dContract),
    delayOtherH: mean(dOther),
    delayOtherP95H: quantile(dOther, 0.95),
    perishablesLate: perishLate,
    perishables: units.filter((u) => u.perishable).length,
    driverHours,
    callsOffered: kpi.callsOffered,
    callsAbandoned: kpi.callsAbandoned,
    maxWaitMin: waits[waits.length - 1] ?? 0,
    agentHours: kpi.agentMinutes / 60,
    lateBumps: kpi.bumps,
    noShows: kpi.noShows,
    emptyLmWhileWaiting: kpi.emptyLmWhileWaiting,
    yardPeak: kpi.yardPeak,
    yardHoursOver: kpi.yardMinutesOver / 60,
    withdrawn,
    lastDepartureAt: Math.max(...live.map((u) => u.departedAt ?? endAt)),
    cost,
  };
  if (record) {
    result.series = series;
    result.log = log.sort((a, b) => a.t - b.t);
    result.unitLog = units.map((u) => ({ id: u.id, type: u.type, lm: u.lm, contract: u.contract, perishable: u.perishable, flagged: u.flagged, deadline: u.deadline, arrivedAt: u.arrivedAt, sailing: u.sailing, customer: u.customer, log: u.log }));
    result.sailings = sailings.map((s) => ({ id: s.id, departs: s.departs, lm: s.lm, relief: !!s.relief, ...(s.result ?? {}) }));
  }
  return result;
}
