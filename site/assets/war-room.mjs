// War room: replay (AS-IS vs TO-BE), the duty manager's recovery board, and the policy lab.
// Everything is computed here, in the browser, by the same modules the tests and the build use.
import { simulate } from "./lib/simulate.mjs";
import { buildScenario } from "./lib/scenario.mjs";
import { buildPlan, POLICIES, OVERRIDE_REASONS, RULES } from "./lib/allocate.mjs";
import { paramsFrom, fmt, round } from "./lib/util.mjs";
import { createTour } from "./tour.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const load = (f) => fetch(`../data/${f}`).then((r) => r.json());

const [storm, assumptions, results] = await Promise.all([load("storm-night.json"), load("assumptions.json"), load("results.json")]);
const P = paramsFrom(assumptions);
const SEED = results.showcaseSeed;
const START = storm.cancelDecisionAt;
const END = 4080;
const APPROVE_AT = START + P.planBuildMin + P.approvalMin;

$$('[data-k="seed"]').forEach((el) => (el.textContent = SEED));

// ---------------------------------------------------------------- simulation runs
const runs = { asis: simulate({ storm, params: P, seed: SEED, mode: "asis", record: true }) };
const tobeRuns = {};
const tobeRun = (policy) => (tobeRuns[policy] ??= simulate({ storm, params: P, seed: SEED, mode: "tobe", policy, record: true }));
runs.tobe = tobeRun("recommended");
$$('[data-k="units"]').forEach((el) => (el.textContent = runs.asis.units));

// ---------------------------------------------------------------- tabs
const tabs = ["replay", "board", "lab"];
function showTab(name) {
  for (const t of tabs) {
    $(`#t-${t}`).setAttribute("aria-selected", String(t === name));
    $(`#tab-${t}`).hidden = t !== name;
  }
  if (name === "board") board.ensure();
  if (name === "lab") lab.ensure();
  if (name === "replay") replay.resize();
}
tabs.forEach((t) => $(`#t-${t}`).addEventListener("click", () => showTab(t)));

// ---------------------------------------------------------------- replay
const STATE = { stranded: "open", hold: "held", confirmed: "conf", departed: "sailed", withdrawn: "gone" };
const replay = (() => {
  let t = START;
  let speed = 1;
  let playing = false;
  let colours = {};
  const lanes = {
    asis: { el: $("#lane-asis"), run: runs.asis },
    tobe: { el: $("#lane-tobe"), run: runs.tobe },
  };

  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    colours = { open: v("--s-open"), held: v("--s-held"), conf: v("--s-conf"), sailed: v("--s-sailed"), gone: v("--s-gone"), text: v("--text") };
  }

  function stateAt(log, time) {
    let s = log[0][1];
    for (const [ts, st] of log) {
      if (ts <= time) s = st;
      else break;
    }
    return s;
  }
  function sampleAt(series, time) {
    let s = series[0];
    for (const x of series) {
      if (x.t <= time) s = x;
      else break;
    }
    return s;
  }

  function draw(lane) {
    const canvas = lane.el.querySelector("canvas");
    const units = lane.run.unitLog;
    const w = canvas.clientWidth || 600;
    const n = units.length;
    const cols = Math.ceil(Math.sqrt(n * (w / 300) * 1.15));
    const rows = Math.ceil(n / cols);
    const cell = w / cols;
    const h = Math.ceil(rows * cell);
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const r = cell * 0.34;
    units.forEach((u, i) => {
      const x = (i % cols) * cell + cell / 2;
      const y = Math.floor(i / cols) * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colours[STATE[stateAt(u.log, t)]] || "#888";
      ctx.fill();
      if (u.perishable) {
        ctx.lineWidth = Math.max(1, cell * 0.1);
        ctx.strokeStyle = colours.text;
        ctx.stroke();
      }
    });
  }

  function meters(lane) {
    const run = lane.run;
    const s = sampleAt(run.series, t);
    const n = run.units;
    const late = run.unitLog.filter((u) => {
      if (!u.perishable) return false;
      const dep = u.log.find(([, st]) => st === "departed");
      if (dep && dep[0] <= t) return dep[0] > u.deadline;
      const gone = u.log.find(([, st]) => st === "withdrawn");
      if (gone && gone[0] <= t) return false;
      return t > u.deadline;
    }).length;
    const pct = (x, of) => `${Math.min(100, (x / of) * 100).toFixed(1)}%`;
    const yardCap = P.yardCapacity;
    const yardMax = Math.max(yardCap * 1.4, run.yardPeak);
    const recent = run.log.filter((l) => l.t <= t).slice(-3).reverse();
    lane.el.querySelector(".meters").innerHTML = `
      <div class="meter"><span><span class="dot open"></span> No answer yet</span><b>${s.stranded}</b><div class="bar"><i style="width:${pct(s.stranded, n)};background:var(--s-open)"></i></div></div>
      <div class="meter"><span><span class="dot conf"></span> Confirmed, waiting</span><b>${s.confirmed}</b><div class="bar"><i style="width:${pct(s.confirmed, n)};background:var(--s-conf)"></i></div></div>
      <div class="meter"><span><span class="dot sailed"></span> Sailed</span><b>${s.departed}</b><div class="bar"><i style="width:${pct(s.departed, n)};background:var(--s-sailed)"></i></div></div>
      <div class="meter"><span><span class="dot gone"></span> Withdrawn — lost to a competitor</span><b>${s.withdrawn}</b></div>
      <div class="meter"><span>Stranded units in the yard (capacity ${yardCap})</span><b>${s.yard}</b><div class="bar"><i class="${s.yard > yardCap ? "over" : ""}" style="width:${pct(s.yard, yardMax)}"></i><span class="cap" style="left:${pct(yardCap, yardMax)}"></span></div></div>
      <div class="meter"><span>Perishables past their deadline</span><b style="color:${late ? "var(--risk)" : "inherit"}">${late}</b></div>
      <ul class="ticker">${recent.map((l) => `<li class="${l.kind}">${fmt(l.t)} ${esc(l.text)}</li>`).join("") || "<li>…</li>"}</ul>`;
  }

  function render() {
    $("#clock").textContent = fmt(t);
    $("#scrub").value = t;
    for (const lane of Object.values(lanes)) {
      draw(lane);
      meters(lane);
    }
  }

  let last = 0;
  function frame(ts) {
    if (!playing) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    t = Math.min(END, t + dt * 45 * speed);
    render();
    if (t >= END) return stop();
    requestAnimationFrame(frame);
  }
  function play() {
    if (t >= END) t = START;
    playing = true;
    last = 0;
    $("#play").textContent = "❚❚ Pause";
    requestAnimationFrame(frame);
  }
  function stop() {
    playing = false;
    $("#play").textContent = "▶ Play";
  }
  $("#play").addEventListener("click", () => (playing ? stop() : play()));
  $("#scrub").addEventListener("input", (e) => {
    stop();
    t = Number(e.target.value);
    render();
  });
  $$("[data-speed]").forEach((b) =>
    b.addEventListener("click", () => {
      speed = Number(b.dataset.speed);
      $$("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );
  $$("[data-jump]").forEach((b) => b.addEventListener("click", () => jump(Number(b.dataset.jump))));
  function jump(time) {
    stop();
    t = time;
    render();
  }
  function setTobe(run, label) {
    lanes.tobe.run = run;
    $("#tobe-policy").textContent = label;
    render();
  }
  readColours();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    readColours();
    render();
  });
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(render, 120);
  });
  render();
  return { jump, stop, setTobe, resize: render, at: () => t };
})();

// ---------------------------------------------------------------- recovery board
const board = (() => {
  let ready = false;
  let filter = "all";
  let query = "";
  let selected = "U-0016";
  let approved = false;
  let limit = 120;
  const overrides = new Map();
  const refused = new Map(); // unit → refusal reason of the last override attempt
  const audit = [];
  const now = APPROVE_AT;
  const { units } = buildScenario(storm, P, SEED);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const sailings = storm.recovery;
  let plan;
  let lineById;

  function compute() {
    const input = units.map((u) => ({ ...u, perishable: u.flagged, deadline: u.flagged ? u.deadline : null, customsOk: u.customsOk || u.customsFixAt <= now, availableAt: u.eta }));
    plan = buildPlan({ units: input, sailings, now, cutoffMin: P.cutoffMin, contractShare: P.contractShare, policy: "recommended", overrides });
    lineById = new Map(plan.lines.map((l) => [l.unitId, l]));
  }

  const kind = (l) => {
    if (l.status === "hold-customs") return "held";
    if (l.reasons[0]?.startsWith("R-12")) return "override";
    if (l.reasons[0]?.startsWith("R-15")) return "scarce";
    return `c${l.cls}`;
  };
  const FILTERS = [
    ["all", "All"],
    ["scarce", "Scarce slots"],
    ["c1", "1 Perishable"],
    ["c2", "2 Driver waiting"],
    ["c3", "3 Queue"],
    ["held", "Held — customs"],
    ["esc", "Escalated"],
    ["override", "Overridden"],
  ];
  const describe = (u) => {
    const bits = [u.type === "reefer" && u.flagged ? "reefer · perishable" : u.type, u.customer + (u.contract ? " (contract)" : "")];
    if (u.flagged) bits.push(`deliver by ${fmt(u.deadline)}`);
    return bits.join(" · ");
  };

  function renderHead() {
    const c = { planned: 0, held: 0, esc: 0, none: 0 };
    for (const l of plan.lines) {
      if (l.status === "planned" && l.sailing) c.planned++;
      if (l.status === "hold-customs") c.held++;
      if (l.status === "no-capacity") c.none++;
      if (l.escalate) c.esc++;
    }
    $("#b-total").textContent = units.length;
    $("#b-counts").innerHTML = `<span>${approved ? "Confirmed" : "Planned"} <b>${c.planned}</b></span><span>Held (customs) <b>${c.held}</b></span><span>Escalated <b>${c.esc}</b></span><span>No capacity yet <b>${c.none}</b></span><span>Overrides <b>${overrides.size}</b></span>`;
    const btn = $("#b-approve");
    btn.disabled = approved;
    btn.textContent = approved ? `Approved ${fmt(now)}` : "Approve plan";
  }

  function renderCap() {
    const used = new Map(sailings.map((s) => [s.id, { n: 0 }]));
    for (const l of plan.lines) if (l.sailing && used.has(l.sailing)) used.get(l.sailing).n++;
    const rows = sailings.filter((s) => used.get(s.id).n > 0);
    const bar = (u, t) => `<div class="bar" title="${Math.round(u)} of ${t}"><i class="${u > t ? "over" : ""}" style="width:${Math.min(100, (u / t) * 100)}%"></i></div>`;
    $("#cap-table").innerHTML = `<thead><tr><th>Sailing</th><th>Departs</th><th>Lane metres</th><th>Plugs</th><th>ADR</th><th class="num">Units</th></tr></thead><tbody>${rows
      .map((s) => {
        const left = plan.left.find((x) => x.id === s.id);
        const lm = s.lm - left.lm;
        const pl = s.plugs - left.plugs;
        const ad = s.adr - left.adr;
        return `<tr><td class="mono"><b>${s.id}</b>${s.relief ? ' <span class="chip muted">relief</span>' : ""}</td><td class="mono">${fmt(s.departs)}</td><td>${bar(lm, s.lm)}<span class="small">${Math.round(lm)} / ${s.lm}</span></td><td>${bar(pl, s.plugs)}<span class="small">${pl} / ${s.plugs}</span></td><td>${bar(ad, s.adr)}<span class="small">${ad} / ${s.adr}</span></td><td class="num">${used.get(s.id).n}</td></tr>`;
      })
      .join("")}</tbody>`;
  }

  function filtered() {
    const q = query.trim().toUpperCase();
    return plan.lines.filter((l) => {
      if (filter === "esc" && !l.escalate) return false;
      if (filter !== "all" && filter !== "esc" && kind(l) !== filter) return false;
      if (q && !l.unitId.includes(q) && !unitById.get(l.unitId).customer.includes(q)) return false;
      return true;
    });
  }

  function renderList() {
    const counts = Object.fromEntries(FILTERS.map(([k]) => [k, 0]));
    for (const l of plan.lines) {
      counts.all++;
      counts[kind(l)] = (counts[kind(l)] ?? 0) + 1;
      if (l.escalate) counts.esc++;
    }
    $("#filters").innerHTML =
      FILTERS.map(([k, label]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${label} ${counts[k] ?? 0}</button>`).join("") +
      `<input type="search" id="q" placeholder="Unit or customer, e.g. U-0016" value="${esc(query)}" aria-label="Search unit or customer">`;
    $$("#filters [data-f]").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.f;
        limit = 120;
        renderList();
      }),
    );
    $("#q").addEventListener("input", (e) => {
      query = e.target.value;
      limit = 120;
      renderRows();
    });
    renderRows();
  }

  function renderRows() {
    const rows = filtered();
    $("#ulist").innerHTML = rows
      .slice(0, limit)
      .map((l) => {
        const u = unitById.get(l.unitId);
        const to = l.status === "hold-customs" ? "HELD" : l.sailing ?? "—";
        return `<li><button class="urow" type="button" data-u="${l.unitId}" aria-current="${l.unitId === selected}"><span class="id">${l.unitId}</span><span class="what">${esc(describe(u))}${l.escalate ? ' <span class="chip risk">escalated</span>' : ""}</span><span class="to">${to}</span></button></li>`;
      })
      .join("");
    $("#list-note").textContent = rows.length > limit ? `Showing ${limit} of ${rows.length}. Narrow with a filter or search.` : `${rows.length} units`;
    $$("#ulist .urow").forEach((b) => b.addEventListener("click", () => select(b.dataset.u)));
  }

  function customerMessage(u) {
    const mine = plan.lines.filter((l) => unitById.get(l.unitId).customer === u.customer);
    const lines = mine.map((l) => {
      const x = unitById.get(l.unitId);
      if (l.status === "hold-customs") return `  ${x.id}  held — we confirm once the UK import pre-lodgement is received`;
      if (!l.sailing) return `  ${x.id}  we will confirm your sailing within the hour`;
      const s = sailings.find((y) => y.id === l.sailing);
      return `  ${x.id}  ${s.id.padEnd(6)} ${fmt(s.departs)}   arrive ${fmt(s.departs - 240)}–${fmt(s.departs - 60)}${l.escalate ? "  (we will call you: after deliver-by time)" : ""}`;
    });
    const cancelled = [...new Set(mine.map((l) => unitById.get(l.unitId).originalSailing))].join(", ");
    return `Subject: Storm Kestrel — new sailings for your ${mine.length} unit${mine.length > 1 ? "s" : ""}\n\n${cancelled} cancelled because of the storm.\nYour units are booked as follows:\n${lines.join("\n")}\n\nYour sailing will not move to a later one unless the vessel changes;\nif it does, we call you first.`;
  }

  function renderDetail() {
    const u = unitById.get(selected);
    const l = lineById.get(selected);
    if (!u || !l) {
      $("#detail").innerHTML = `<div class="panel-b small">Select a unit.</div>`;
      return;
    }
    const s = l.sailing ? sailings.find((x) => x.id === l.sailing) : null;
    const reasonClass = (r) => (r.startsWith("→") ? "final" : /refused|escalate|R-14|R-16/.test(r) ? "bad" : /^R-\d\d/.test(r) ? "rule" : "");
    const options = sailings
      .filter((x) => x.departs - P.cutoffMin >= now)
      .slice(0, 10)
      .map((x) => `<option value="${x.id}" ${overrides.get(u.id)?.sailing === x.id ? "selected" : ""}>${x.id} · ${fmt(x.departs)}</option>`)
      .join("");
    const reasons = Object.entries(OVERRIDE_REASONS)
      .map(([k, v]) => `<option value="${k}" ${overrides.get(u.id)?.reason === k ? "selected" : ""}>${k} ${esc(v)}</option>`)
      .join("");
    const atTerminal = u.eta <= now;
    const driverText = !atTerminal && s ? `Tidewell: ${u.originalSailing} cancelled (storm). Unit ${u.id}: new sailing ${s.id} ${fmt(s.departs)}.\nArrive ${fmt(s.departs - 240)}–${fmt(s.departs - 60)}, not before. Terminal is full until then.` : null;
    $("#detail").innerHTML = `
      <div class="panel-h"><h2 class="mono">${u.id}</h2><span class="chip ${l.escalate ? "risk" : l.status === "hold-customs" ? "warn" : "ok"}">${l.status === "hold-customs" ? "held — customs" : l.sailing ? `${approved ? "confirmed" : "planned"} → ${l.sailing}` : "no capacity yet"}</span></div>
      <div class="panel-b">
        <dl class="facts">
          <dt>Type</dt><dd>${u.type}${u.flagged ? " · perishable" : u.perishable ? ' · perishable <span class="chip warn">not flagged in the booking</span>' : ""} · ${u.lm} m</dd>
          <dt>Customer</dt><dd>${u.customer}${u.contract ? " · contract (allotment)" : ""}</dd>
          <dt>Was on</dt><dd class="mono">${u.originalSailing} · booked ${fmt(u.bookedAt)}</dd>
          <dt>At terminal</dt><dd>${atTerminal ? `yes, since ${fmt(u.eta)}` : `not yet — expected ${fmt(u.eta)}`}</dd>
          ${u.flagged ? `<dt>Deliver by</dt><dd>${fmt(u.deadline)}</dd>` : ""}
          ${s ? `<dt>New sailing</dt><dd class="mono"><b>${s.id}</b> ${fmt(s.departs)}</dd>` : ""}
        </dl>
        <h3 style="font-size:14px;margin:12px 0 0">Why here (SCR-02)</h3>
        <ul class="reasons">${[...(refused.has(u.id) ? [refused.get(u.id)] : []), ...l.reasons].map((r) => `<li class="${reasonClass(r)}">${esc(r)}</li>`).join("")}</ul>
        <details style="margin-top:12px" ${overrides.has(u.id) ? "open" : ""} id="ov">
          <summary class="small">Override (SCR-03)</summary>
          <div class="form-row">
            <select id="ov-s" aria-label="Sailing">${options}</select>
            <select id="ov-r" aria-label="Reason code">${reasons}</select>
            <button class="btn small-btn" id="ov-apply" type="button" ${approved ? "disabled" : ""}>Apply</button>
            ${overrides.has(u.id) ? `<button class="btn small-btn" id="ov-clear" type="button" ${approved ? "disabled" : ""}>Remove</button>` : ""}
          </div>
          <p class="small" style="margin:6px 0 0">Hard rules (${["R-01", "R-02", "R-03", "R-04", "R-05", "R-13"].join(", ")}) still apply: an override that breaks one is refused and the reason is shown.</p>
        </details>
        ${approved ? `<div class="msg"><div class="mh">Customer message (SCR-04) · sent ${fmt(now)}</div><div class="mb">${esc(customerMessage(u))}</div></div>${driverText ? `<div class="msg"><div class="mh">Driver text · sent ${fmt(now)}</div><div class="mb">${esc(driverText)}</div></div>` : `<p class="small">No driver text: the unit is already at the terminal.</p>`}` : `<p class="small" style="margin-top:12px">Messages are sent only after the duty manager approves the plan (D-02).</p>`}
        ${audit.length ? `<h3 style="font-size:14px;margin:12px 0 0">Audit</h3><ul class="audit">${audit.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      </div>`;
    $("#ov-apply")?.addEventListener("click", () => override(u.id, $("#ov-s").value, $("#ov-r").value));
    $("#ov-clear")?.addEventListener("click", () => {
      overrides.delete(u.id);
      audit.push(`${fmt(now)} override removed for ${u.id}`);
      refresh();
    });
  }

  function override(unitId, sailing, reason) {
    overrides.set(unitId, { sailing, reason });
    compute();
    const refusal = lineById.get(unitId).reasons.find((r) => r.includes("refused"));
    if (refusal) {
      overrides.delete(unitId);
      refused.set(unitId, refusal);
    } else refused.delete(unitId);
    audit.push(`${fmt(now)} duty manager: ${unitId} → ${sailing} (${reason}) ${refusal ? "— refused by a hard rule" : "— accepted"}`);
    refresh();
  }

  function select(id) {
    selected = id;
    renderRows();
    renderDetail();
  }

  function refresh() {
    compute();
    renderHead();
    renderCap();
    renderList();
    renderDetail();
  }

  $("#b-approve").addEventListener("click", () => {
    approved = true;
    audit.push(`${fmt(now)} plan approved by the duty manager · ${overrides.size} override(s)`);
    refresh();
  });

  function ensure() {
    if (ready) return;
    ready = true;
    refresh();
  }
  return {
    ensure,
    select: (id) => {
      ensure();
      filter = "all";
      query = "";
      renderList();
      select(id);
    },
    override: (id, s, r) => {
      ensure();
      override(id, s, r);
    },
    refusalDemo: () => {
      ensure();
      const low = sailings.find((s) => !s.project && s.departs - P.cutoffMin >= now);
      const unit = plan.lines.find((l) => unitById.get(l.unitId).project && l.sailing);
      return low && unit ? { unit: unit.unitId, sailing: low.id } : null;
    },
  };
})();

// ---------------------------------------------------------------- policy lab
const lab = (() => {
  let ready = false;
  let current = "recommended";
  const KPIS = [
    ["perishablesLate", "Perishables after deadline", 0],
    ["delayContractH", "Avg delay, contract (h)", 1],
    ["delayOtherH", "Avg delay, others (h)", 1],
    ["driverHours", "Driver waiting hours", 0],
  ];
  function renderCards() {
    const max = Object.fromEntries(KPIS.map(([k]) => [k, Math.max(results.asis[k].p50, ...Object.values(results.policies).map((p) => p[k].p50))]));
    $("#policies").innerHTML = Object.entries(POLICIES)
      .map(([id, pol]) => {
        const r = results.policies[id];
        return `<button class="card policy" type="button" data-p="${id}" aria-pressed="${id === current}">
          <h3>${esc(pol.label)}</h3><div class="owner">${esc(pol.owner)}</div>
          <p style="margin-top:6px;font-size:14px">${esc(pol.summary)}</p>
          <div class="hbars">${KPIS.map(([k, label, d]) => `<div class="hbar"><span>${label}</span><b>${round(r[k].p50, d).toLocaleString("en-GB")}</b><div class="bar"><i style="width:${(r[k].p50 / max[k]) * 100}%"></i><span class="cap" title="AS-IS" style="left:${(results.asis[k].p50 / max[k]) * 100}%"></span></div></div>`).join("")}</div>
        </button>`;
      })
      .join("");
    $$("#policies [data-p]").forEach((b) => b.addEventListener("click", () => choose(b.dataset.p)));
  }
  function renderTonight() {
    const rows = [["AS-IS (phones)", runs.asis], ...Object.entries(POLICIES).map(([id, pol]) => [pol.label, tobeRun(id)])];
    $("#lab-table").innerHTML = `<thead><tr><th>Policy</th><th class="num">Perishables late</th><th class="num">Delay contract</th><th class="num">Delay others</th><th class="num">Driver hours</th><th class="num">Last unit sails</th></tr></thead><tbody>${rows
      .map(([label, r]) => `<tr><td>${esc(label)}</td><td class="num">${r.perishablesLate}</td><td class="num">${round(r.delayContractH)} h</td><td class="num">${round(r.delayOtherH)} h</td><td class="num">${Math.round(r.driverHours).toLocaleString("en-GB")}</td><td class="num mono">${fmt(r.lastDepartureAt)}</td></tr>`)
      .join("")}</tbody>`;
  }
  function choose(id) {
    current = id;
    $$("#policies [data-p]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === id)));
    replay.setTobe(tobeRun(id), `${POLICIES[id].label} policy`);
  }
  function ensure() {
    if (ready) return;
    ready = true;
    renderCards();
    renderTonight();
  }
  return { ensure, choose };
})();

// ---------------------------------------------------------------- deep links + tour
const params = new URLSearchParams(location.search);
if (params.get("tab") && tabs.includes(params.get("tab"))) showTab(params.get("tab"));

const A = runs.asis;
const T = runs.tobe;
const at = (run, time) => run.series.filter((s) => s.t <= time).pop();
const R = results;
const k = (v) => `€${Math.round(v / 1000).toLocaleString("en-GB")}k`;
const tour = createTour([
  {
    focus: "#replay",
    before: () => {
      showTab("replay");
      replay.jump(START);
    },
    text: `Thursday 16:00. Storm Kestrel cancels three sailings: ${A.units} units are stranded. Every dot is one unit — top today's process, bottom the redesign. Ringed dots are perishable reefers.`,
  },
  {
    focus: "#lane-tobe",
    before: () => replay.jump(APPROVE_AT),
    text: `16:50. In the TO-BE the duty manager has approved a recovery plan: ${at(T, APPROVE_AT).confirmed} units already have a new sailing, and customers and drivers have been told. In the AS-IS ${at(A, APPROVE_AT).confirmed} have one — whoever got through on the phone.`,
  },
  {
    focus: "#lane-asis",
    before: () => replay.jump(1560),
    text: `2 a.m. AS-IS: ${at(A, 1560).stranded} units still have no answer and nobody is working on them — contract customers wait for their account manager. The yard holds ${at(A, 1560).yard} stranded units for ${P.yardCapacity} slots; drivers sleep in their cabs. TO-BE: ${at(T, 1560).yard} in the yard, because hauliers were told to hold at origin.`,
  },
  {
    focus: "#lane-asis",
    before: () => replay.jump(1890),
    text: `07:30. Account managers start calling key accounts — 15½ hours after the cancellation. Sales thought key accounts were handled first. The reconstruction showed they were handled last.`,
  },
  {
    focus: "#cap-panel",
    before: () => showTab("board"),
    text: "The duty manager's board at 16:50 — the real allocation rules on this night's freight. Lane metres, reefer plugs and ADR slots per sailing: today's booking screen shows only the first.",
  },
  {
    focus: "#detail",
    before: () => board.select("U-0016"),
    text: "Every unit explains itself. This perishable reefer is class 1 (R-07, earliest deadline first); the first sailing was skipped because its plugs were taken; it goes on the relief vessel. Customer service reads exactly this on the phone.",
  },
  {
    focus: "#detail",
    before: () => {
      const c = board.refusalDemo();
      if (c) {
        board.select(c.unit);
        board.override(c.unit, c.sailing, "OV-1");
      }
    },
    text: "The duty manager can override, with a reason code — but never past a hard rule. Here oversized project cargo is forced onto a vessel without a high deck: refused under R-05, and the panel says why. Overrides go first, so a valid one pushes other units back — that is why each needs a reason code.",
  },
  {
    focus: "#policies",
    before: () => showTab("lab"),
    text: `Three departments wanted three orders. Same 200 nights, four policies: "Key accounts first" gives contract customers ${R.policies.keyAccountsFirst.delayContractH.p50} h instead of ${R.policies.recommended.delayContractH.p50} h — and lets ${R.policies.keyAccountsFirst.perishablesLate.p50} perishables spoil instead of ${R.policies.recommended.perishablesLate.p50}. The sponsor chose the recommended policy (D-04).`,
  },
  {
    focus: "#lab-tonight",
    before: () => showTab("lab"),
    text: `Over 200 nights: 90% of units confirmed in ${R.tobe.certaintyP90H.p50} h instead of ${R.asis.certaintyP90H.p50} h; perishables late ${R.asis.perishablesLate.p50} → ${R.tobe.perishablesLate.p50}; yard over capacity ${R.asis.yardHoursOver.p50} h → ${R.tobe.yardHoursOver.p50} h. NPV ${k(R.businessCase.npv.p50)} over 5 years, with a ${round(R.uncertainty.probabilityNegative * 100, 1)}% chance of a loss when every assumption is uncertain.`,
  },
  {
    focus: "#tab-lab",
    text: "Honest limits: a fictional operator, simulated nights, illustrative assumptions. And the average delay does not go down — no allocation rule creates a ship. The case says so up front. Everything is in the repository: rules, 23 examples in CI, BPMN, the backlog, the storm drill.",
  },
]);
$("#btn-tour").addEventListener("click", () => tour.start());
