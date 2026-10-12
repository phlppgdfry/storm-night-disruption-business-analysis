#!/usr/bin/env python3
"""Build the shareable media from the live site and the model's results.

  site/media/storm-night.gif        10-second replay of the night (README header)
  site/media/social-preview.png     1280x640 card for GitHub and LinkedIn
  site/media/one-page-summary.html  one-page summary, numbers from site/data/results.json
  site/media/one-page-summary.pdf   the same page printed to A4

Needs Python Playwright with a local Chrome, and ffmpeg. Not run in CI: the binaries are
committed, and tests/docs-claims.test.mjs checks the summary's numbers against the model.
"""
from __future__ import annotations

import functools
import http.server
import json
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / "media"
REPO = "https://github.com/phlppgdfry/storm-night-disruption-business-analysis"
PAGES = "https://phlppgdfry.github.io/storm-night-disruption-business-analysis"

R = json.loads((SITE / "data" / "results.json").read_text())


def n(v: float) -> str:
    return f"{round(v):,}"


def k(v: float) -> str:
    return f"€{round(v / 1000):,}k"


A, T, BC = R["asis"], R["tobe"], R["businessCase"]
P_NEG = f"{round(R['uncertainty']['probabilityNegative'] * 1000) / 10}%"
ROWS = [
    ("Hours until 90% of stranded units have a confirmed sailing", A["certaintyP90H"]["p50"], T["certaintyP90H"]["p50"]),
    ("Perishables sailing after their deadline", A["perishablesLate"]["p50"], T["perishablesLate"]["p50"]),
    ("Hours the yard is over capacity", A["yardHoursOver"]["p50"], T["yardHoursOver"]["p50"]),
    ("Hours drivers wait at the terminal", n(A["driverHours"]["p50"]), n(T["driverHours"]["p50"])),
    ("Units withdrawn to a competitor", A["withdrawn"]["p50"], T["withdrawn"]["p50"]),
    ("Calls to customer service", A["callsOffered"]["p50"], T["callsOffered"]["p50"]),
]


def serve() -> tuple[http.server.ThreadingHTTPServer, str]:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(SITE))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"


def replay_page(browser, base: str, width: int):
    page = browser.new_page(viewport={"width": width, "height": 900}, device_scale_factor=1, color_scheme="light")
    page.goto(f"{base}/war-room/?tab=replay")
    page.wait_for_function("document.querySelector('#lane-asis .meters')?.textContent.includes('No answer')", timeout=60000)
    # Only the clock row and the two lanes.
    page.add_style_tag(content="""
      .site-header, .sub-hero, .tabs, .controls + .controls, .legend, .site-footer, #tab-replay > :not(#controls):not(#replay):not(.legend) { display: none !important; }
      #controls .seg, #play, #scrub { display: none !important; }
      #controls { justify-content: center; margin: 6px 0 10px; }
      #clock { font-size: 22px; font-weight: 700; }
      main.wrap { padding-top: 8px; }
      .ticker { display: none !important; }
    """)
    return page


def scrub(page, t: int) -> None:
    page.evaluate("t => { const s = document.querySelector('#scrub'); s.value = t; s.dispatchEvent(new Event('input')); }", t)


def clip(page) -> dict:
    return page.evaluate("""() => {
      const a = document.querySelector('#controls').getBoundingClientRect();
      const b = document.querySelector('#replay').getBoundingClientRect();
      return { x: b.left - 8, y: a.top - 4, width: b.width + 16, height: b.bottom - a.top + 12 };
    }""")


def build_gif(browser, base: str) -> None:
    page = replay_page(browser, base, 1000)
    frames = Path(tempfile.mkdtemp())
    times = list(range(960, 3420, 30))  # Thu 16:00 → Sat 09:00
    hold = {960: 8, 1560: 14, 3390: 22}  # pause on the start, Fri 02:00 and the end
    i = 0
    for t in times:
        scrub(page, t)
        box = clip(page)
        page.screenshot(path=str(frames / "f.png"), clip=box)
        for _ in range(hold.get(t, 1)):
            shutil.copy(frames / "f.png", frames / f"{i:04d}.png")
            i += 1
    page.close()
    (frames / "f.png").unlink()
    gif = OUT / "storm-night.gif"
    vf = "fps=12,scale=820:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=none"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "12", "-i", str(frames / "%04d.png"), "-vf", vf, "-loop", "0", str(gif)], check=True)
    shutil.rmtree(frames)
    print(f"{gif.relative_to(ROOT)}  {gif.stat().st_size // 1024} KB, {i} frames")


def snapshot(browser, base: str) -> Path:
    """The replay at Fri 02:00, used in the social card and the summary."""
    page = replay_page(browser, base, 1000)
    scrub(page, 1560)
    path = OUT / "replay-fri-0200.png"
    page.screenshot(path=str(path), clip=clip(page))
    page.close()
    return path


CARD = """<!doctype html><html><head><meta charset="utf-8"><style>
:root { --accent:#24508f; --text:#17202b; --muted:#586473; }
* { box-sizing:border-box; margin:0; }
body { width:1280px; height:640px; font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--text);
  background: linear-gradient(135deg, #0f2747 0%, #24508f 58%, #3a6db3 100%); display:grid; grid-template-columns: 600px 1fr; overflow:hidden; }
.l { padding:56px 40px 48px 64px; color:#fff; display:flex; flex-direction:column; }
.eyebrow { font-size:20px; letter-spacing:.06em; text-transform:uppercase; opacity:.8; font-weight:600; }
h1 { font-size:54px; line-height:1.06; margin:18px 0 0; letter-spacing:-.01em; }
.sub { font-size:23px; line-height:1.35; margin-top:20px; opacity:.92; }
.stats { margin-top:auto; display:flex; gap:26px; }
.stat b { display:block; font-size:38px; } .stat span { font-size:16px; opacity:.85; }
.r { position:relative; }
.r img { position:absolute; left:0; top:64px; width:640px; border-radius:14px; box-shadow:0 18px 50px rgb(0 0 0 / 35%); background:#f5f7fa; }
.tag { position:absolute; left:4px; bottom:40px; color:#fff; font-size:17px; opacity:.85; }
</style></head><body>
<div class="l">
  <div class="eyebrow">IT business analysis case</div>
  <h1>Storm Night: who sails first when the ships don’t?</h1>
  <div class="sub">859 stranded trailers, 200 simulated storm nights, 16 executable rules: from one bad night to a tested, accepted release.</div>
  <div class="stats">
    <div class="stat"><b>{c90a} h → {c90t} h</b><span>until 90% have a new sailing</span></div>
    <div class="stat"><b>{npv}</b><span>5-year NPV, {pneg} risk of loss</span></div>
  </div>
</div>
<div class="r"><img src="{img}"><div class="tag">Replay at Fri 02:00 · AS-IS above, TO-BE below · fictional operator</div></div>
</body></html>"""


def build_card(browser, shot: Path) -> None:
    html = CARD
    for key, val in {"c90a": A["certaintyP90H"]["p50"], "c90t": T["certaintyP90H"]["p50"], "npv": k(BC["npv"]["p50"]), "pneg": P_NEG, "img": shot.as_uri()}.items():
        html = html.replace("{" + key + "}", str(val))
    src = Path(tempfile.mkdtemp()) / "card.html"
    src.write_text(html)
    page = browser.new_page(viewport={"width": 1280, "height": 640}, device_scale_factor=1)
    page.goto(src.as_uri())
    out = OUT / "social-preview.png"
    page.screenshot(path=str(out))
    page.close()
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


def summary_html() -> str:
    rows = "\n".join(f"<tr><td>{label}</td><td>{a}</td><td><b>{t}</b></td></tr>" for label, a, t in ROWS)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Storm Night Summary</title>
<meta name="description" content="One-page summary of the Storm Night IT business analysis case. Fictional operator; illustrative figures.">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<style>
:root {{ --accent:#24508f; --text:#17202b; --muted:#586473; --border:#d9dfe7; --ok:#1e7b4f; --bg:#ffffff; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --accent:#8fb4f0; --text:#e6ebf1; --muted:#9aa6b4; --border:#263241; --ok:#5cc28f; --bg:#0d131b; }} }}
:root[data-theme="dark"] {{ --accent:#8fb4f0; --text:#e6ebf1; --muted:#9aa6b4; --border:#263241; --ok:#5cc28f; --bg:#0d131b; }}
@page {{ size:A4; margin:12mm 13mm; }}
* {{ box-sizing:border-box; }}
body {{ font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--text); background:var(--bg); font-size:10pt; line-height:1.38; margin:0 auto; max-width:780px; padding:16px; }}
@media print {{ body {{ padding:0; max-width:none; font-size:9.3pt; }} }}
h1 {{ font-size:19pt; margin:0 0 2px; line-height:1.15; color:var(--accent); }}
h2 {{ font-size:10.5pt; text-transform:uppercase; letter-spacing:.05em; color:var(--accent); margin:12px 0 4px; border-bottom:1px solid var(--border); padding-bottom:2px; }}
p {{ margin:0 0 5px; }}
.meta {{ color:var(--muted); font-size:8.6pt; margin-bottom:8px; }}
.grid {{ display:grid; grid-template-columns: 1.08fr 1fr; gap:16px; }}
table {{ width:100%; border-collapse:collapse; font-size:9pt; }}
th, td {{ text-align:left; padding:2.5px 4px; border-bottom:1px solid var(--border); vertical-align:top; }}
td:nth-child(n+2), th:nth-child(n+2) {{ text-align:right; white-space:nowrap; }}
td b {{ color:var(--ok); }}
ul {{ margin:0; padding-left:15px; }} li {{ margin:0 0 3px; }}
.big {{ font-size:14pt; font-weight:700; color:var(--accent); }}
.note {{ color:var(--muted); font-size:8.4pt; }}
a {{ color:var(--accent); }}
.shot {{ display:grid; grid-template-columns: 58% 1fr; gap:14px; align-items:center; margin-top:12px; }}
.shot img {{ width:100%; border:1px solid var(--border); border-radius:6px; }}
@media (max-width: 640px) {{ .shot {{ grid-template-columns:1fr; }} }}
.links {{ margin-top:10px; font-size:9pt; border-top:1px solid var(--border); padding-top:6px; }}
@media (max-width: 640px) {{ .grid {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
<h1>Storm Night: who sails first when the ships don’t?</h1>
<p class="meta">IT business analysis portfolio case · Philippe Godfroy · fictional RoRo operator (Tidewell Shortsea Lines), illustrative figures, no employer data</p>

<p><b>The situation.</b> Thursday 16:00, a storm cancels three sailings and strands 859 trailers. Today rebooking waits for customers to call: perishables miss their deadline while frozen cargo sails, the yard overflows, and contract customers hear from their account manager the next morning. Sales, customer service and operations each asked for a different fix.</p>
<p><b>The reframe.</b> Not “rebook faster” but <i>time to certainty</i>: every customer gets a new sailing, with a reason, within the hour, in an order all three departments can defend. A duty manager approves a rule-based recovery plan instead of waiting for phone calls.</p>

<div class="grid">
<div>
<h2>Result · median of 200 simulated nights</h2>
<table>
<tr><th></th><th>AS-IS</th><th>TO-BE</th></tr>
{rows}
<tr><td>Average delay</td><td>±19 h</td><td>±20 h</td></tr>
</table>
<p class="note">The average delay does not change: a storm removes capacity and no rule creates a ship. The business case says so.</p>

<h2>Business case, as a range</h2>
<p><span class="big">{k(BC['npv']['p50'])}</span> 5-year NPV (P10 {k(BC['npv']['p10'])}, P90 {k(BC['npv']['p90'])}) · payback {round(BC['paybackMonthsP50'])} months · <b>{P_NEG}</b> chance of a loss when all 44 assumptions are uncertain at once. A tornado chart names the three assumptions to verify first.</p>
</div>
<div>
<h2>What I did as the analyst</h2>
<ul>
<li>Reconstructed the last storm night from data before the first interview</li>
<li>12 stakeholders, 18 voices; kept the contradiction (Sales thought key accounts came first; the data said last)</li>
<li>Event storming, BPMN 2.0 AS-IS / TO-BE, UML sequence, state and data model</li>
<li>16 allocation rules with 23 executable Given/When/Then examples</li>
<li>Policy workshop: four proposals simulated on the same nights; the simulation exposed a flaw in Operations’ proposal (→ rule R-15)</li>
<li>17 user stories, WSJF prioritisation, five screens validated in four rounds</li>
<li>Business acceptance run as a storm drill; it found a severity-1 gap in my own rules (→ R-16)</li>
<li>Pre-mortem, shadow mode, go/no-go, rollback, hypercare and a benefits review</li>
</ul>
</div>
</div>

<div class="shot">
<img src="replay-fri-0200.png" alt="Replay of the storm night at Friday 02:00: AS-IS above, TO-BE below">
<p class="note"><b>The same storm, replayed twice, at Friday 02:00.</b> One dot per stranded unit: red = no answer yet, amber = new sailing confirmed, grey = withdrawn, ringed = perishable. Top: how it works today, where customers call and wait. Bottom: the recovery plan, built 20 minutes after the cancellation and approved by the duty manager at +50.</p>
</div>

<h2>Why it can be trusted</h2>
<p>Every number above is regenerated in CI from 44 stated assumptions; a test fails if a document quotes a number the model does not produce. A traceability check fails the build on a pain nobody voiced, a rule nobody tested or an ID that does not exist. Built by one person with AI assistance; every decision and its reasoning is in the decision log.</p>

<p class="links"><b>Replay the night (2-minute tour):</b> <a href="{PAGES}/war-room/?tour">{PAGES.removeprefix('https://')}/war-room/?tour</a><br>
<b>Case and documents:</b> <a href="{REPO}">{REPO.removeprefix('https://')}</a></p>
</body>
</html>
"""


def build_summary(browser, base: str) -> None:
    html = OUT / "one-page-summary.html"
    html.write_text(summary_html())
    page = browser.new_page(color_scheme="light")
    page.goto(f"{base}/media/one-page-summary.html")
    pdf = OUT / "one-page-summary.pdf"
    page.pdf(path=str(pdf), format="A4", print_background=True, prefer_css_page_size=True)
    page.close()
    print(f"{html.relative_to(ROOT)}, {pdf.relative_to(ROOT)}  {pdf.stat().st_size // 1024} KB")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    httpd, base = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        build_gif(browser, base)
        build_card(browser, snapshot(browser, base))
        build_summary(browser, base)
        browser.close()
    httpd.shutdown()


if __name__ == "__main__":
    main()
