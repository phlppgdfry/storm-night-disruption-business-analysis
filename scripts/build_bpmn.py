#!/usr/bin/env python3
"""Build the AS-IS and TO-BE process models as BPMN 2.0 XML (with diagram interchange) and SVG.

The models are kept as small Python structures so they stay reviewable in a pull request.
Outputs:
  docs/04-process/bpmn/<name>.bpmn   opens in Camunda Modeler or bpmn.io
  site/assets/bpmn/<name>.svg        rendered for the site and the Markdown docs
Run: python3 scripts/build_bpmn.py
"""
from __future__ import annotations

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANE_H, COL_W, HEADER_W, LEFT_PAD = 130, 158, 34, 30
TASK_W, TASK_H, EVENT, GATE = 118, 66, 36, 50

AS_IS = {
    "id": "as_is",
    "name": "AS-IS: sailings cancelled by a storm (today)",
    "lanes": [
        ("customer", "Customer"),
        ("haulier", "Haulier / driver"),
        ("cs", "Customer service"),
        ("am", "Account manager"),
        ("planner", "Load planner"),
        ("sys", "Booking platform"),
    ],
    "nodes": [
        ("start", "messageStart", "sys", 0, "Sailings cancelled"),
        ("t_web", "serviceTask", "sys", 1, "Website shows cancelled"),
        ("t_hear", "task", "customer", 2, "Hears it from driver or website"),
        ("t_drive", "task", "haulier", 2, "Drives to the terminal anyway"),
        ("t_cab", "task", "haulier", 4, "Waits in the cab or on the access road"),
        ("g_contract", "xor", "customer", 3, "Contract?"),
        ("t_call", "task", "customer", 4, "Calls now or when the office opens"),
        ("t_queue", "userTask", "cs", 5, "Answers if free; caller may hang up"),
        ("t_am", "userTask", "am", 5, "Rebooks key accounts from 07:30"),
        ("t_rebook", "userTask", "cs", 6, "Rebooks earliest sailing, lane metres only"),
        ("t_cutoff", "userTask", "planner", 7, "Checks plugs, ADR, deck, customs at cut-off"),
        ("g_fits", "xor", "planner", 8, "Fits?"),
        ("t_bump", "userTask", "planner", 9, "Bumps unit to a later sailing"),
        ("end", "end", "sys", 10, "Unit sails"),
    ],
    "flows": [
        ("start", "t_web", ""), ("t_web", "t_hear", ""), ("t_web", "t_drive", ""), ("t_drive", "t_cab", ""),
        ("t_hear", "g_contract", ""), ("g_contract", "t_call", "no"), ("g_contract", "t_am", "yes", "vh"),
        ("t_call", "t_queue", ""), ("t_queue", "t_rebook", ""), ("t_rebook", "t_cutoff", ""), ("t_am", "t_cutoff", ""),
        ("t_cutoff", "g_fits", ""), ("g_fits", "end", "yes"), ("g_fits", "t_bump", "no"), ("t_bump", "end", ""),
        ("t_cab", "end", "", "hv"),
    ],
    "pain": {"t_web": "P-01", "g_contract": "P-02 P-08", "t_cab": "P-05", "t_queue": "P-06", "t_rebook": "P-03 P-04", "t_am": "P-02", "t_cutoff": "P-07"},
}

TO_BE = {
    "id": "to_be",
    "name": "TO-BE: recovery plan (release 1)",
    "lanes": [
        ("customer", "Customer / driver"),
        ("cs", "Customer service"),
        ("dm", "Duty manager"),
        ("rec", "Recovery planner"),
        ("sys", "Booking platform"),
    ],
    "nodes": [
        ("start", "messageStart", "sys", 0, "Sailings cancelled"),
        ("t_list", "serviceTask", "rec", 1, "List stranded units with their needs"),
        ("t_plan", "serviceTask", "rec", 2, "Build plan with the agreed policy"),
        ("t_review", "userTask", "dm", 3, "Review classes, reasons, escalations"),
        ("t_override", "userTask", "dm", 4, "Override where needed, with reason code"),
        ("t_approve", "userTask", "dm", 5, "Approve the plan"),
        ("t_send", "sendTask", "rec", 6, "Message customers, text drivers"),
        ("g_change", "xor", "customer", 7, "Change?"),
        ("t_hold", "task", "customer", 8, "Driver arrives for the new slot"),
        ("t_why", "userTask", "cs", 8, "Handles the call with the why-panel"),
        ("t_replan", "serviceTask", "rec", 9, "Hourly replan; confirmed units never moved"),
        ("end", "end", "sys", 10, "Unit sails"),
    ],
    "flows": [
        ("start", "t_list", ""), ("t_list", "t_plan", ""), ("t_plan", "t_review", ""), ("t_review", "t_override", ""),
        ("t_override", "t_approve", ""), ("t_approve", "t_send", ""), ("t_send", "g_change", ""),
        ("g_change", "t_hold", "no"), ("g_change", "t_why", "yes", "vh"), ("t_why", "t_replan", ""),
        ("t_replan", "end", ""), ("t_hold", "end", ""),
    ],
    "pain": {},
    "fixes": {"t_list": "G-01", "t_plan": "G-03 G-04", "t_review": "G-04", "t_send": "G-01 G-06", "t_hold": "G-05", "t_replan": "G-02"},
}

TAGS = {
    "messageStart": "startEvent", "start": "startEvent", "end": "endEvent", "task": "task", "userTask": "userTask",
    "serviceTask": "serviceTask", "sendTask": "sendTask", "xor": "exclusiveGateway",
}


def size(kind: str) -> tuple[int, int]:
    if kind in ("messageStart", "start", "end"):
        return EVENT, EVENT
    if kind == "xor":
        return GATE, GATE
    return TASK_W, TASK_H


def layout(model: dict) -> dict:
    lanes = {lane_id: i for i, (lane_id, _) in enumerate(model["lanes"])}
    boxes = {}
    for node_id, kind, lane, col, _ in model["nodes"]:
        w, h = size(kind)
        cx = HEADER_W + LEFT_PAD + col * COL_W + TASK_W / 2
        cy = lanes[lane] * LANE_H + LANE_H / 2
        boxes[node_id] = (cx - w / 2, cy - h / 2, w, h)
    return boxes


def waypoints(a: tuple, b: tuple, route: str = "gap") -> list[tuple[float, float]]:
    """Orthogonal routing. 'gap': leave right, turn in the gap between columns. 'hv': run along the source lane, enter the target vertically."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    acx, acy, bcx, bcy = ax + aw / 2, ay + ah / 2, bx + bw / 2, by + bh / 2
    if abs(acy - bcy) < 1:
        return [(ax + aw, acy), (bx, bcy)] if bcx > acx else [(ax, acy), (bx + bw, bcy)]
    if abs(acx - bcx) < 1:
        return [(acx, ay + ah), (bcx, by)] if bcy > acy else [(acx, ay), (bcx, by + bh)]
    if route == "vh":
        return [(acx, ay + ah if bcy > acy else ay), (acx, bcy), (bx, bcy)]
    if route == "hv":
        return [(ax + aw, acy), (bcx, acy), (bcx, by if bcy > acy else by + bh)]
    gap = bx - (COL_W - TASK_W) / 2 if bcx > acx else bx + bw + (COL_W - TASK_W) / 2
    return [(ax + aw, acy), (gap, acy), (gap, bcy), (bx, bcy)]


def bpmn_xml(model: dict, boxes: dict) -> str:
    pid, pname = f"Process_{model['id']}", model["name"]
    width = HEADER_W + LEFT_PAD * 2 + (max(c for *_, c, _ in model["nodes"]) + 1) * COL_W
    height = LANE_H * len(model["lanes"])
    incoming, outgoing = {}, {}
    for i, (s, t, *_) in enumerate(model["flows"]):
        outgoing.setdefault(s, []).append(f"Flow_{i}")
        incoming.setdefault(t, []).append(f"Flow_{i}")

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
           'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
           'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
           f'id="Defs_{model["id"]}" targetNamespace="https://github.com/phlppgdfry/storm-night-disruption-business-analysis" '
           'exporter="build_bpmn.py" exporterVersion="1">',
           f'  <bpmn:collaboration id="Collab_{model["id"]}">',
           f'    <bpmn:participant id="Pool_{model["id"]}" name="{escape(pname)}" processRef="{pid}" />',
           '  </bpmn:collaboration>',
           f'  <bpmn:process id="{pid}" isExecutable="false">',
           f'    <bpmn:laneSet id="LaneSet_{model["id"]}">']
    for lane_id, lane_name in model["lanes"]:
        out.append(f'      <bpmn:lane id="Lane_{lane_id}" name="{escape(lane_name)}">')
        for node_id, _, lane, _, _ in model["nodes"]:
            if lane == lane_id:
                out.append(f'        <bpmn:flowNodeRef>{node_id}</bpmn:flowNodeRef>')
        out.append('      </bpmn:lane>')
    out.append('    </bpmn:laneSet>')
    for node_id, kind, _, _, label in model["nodes"]:
        tag = TAGS[kind]
        out.append(f'    <bpmn:{tag} id="{node_id}" name="{escape(label)}">')
        out += [f'      <bpmn:incoming>{f}</bpmn:incoming>' for f in incoming.get(node_id, [])]
        out += [f'      <bpmn:outgoing>{f}</bpmn:outgoing>' for f in outgoing.get(node_id, [])]
        if kind == "messageStart":
            out.append(f'      <bpmn:messageEventDefinition id="Msg_{node_id}" />')
        out.append(f'    </bpmn:{tag}>')
    for i, (s, t, label, *_) in enumerate(model["flows"]):
        name = f' name="{escape(label)}"' if label else ""
        out.append(f'    <bpmn:sequenceFlow id="Flow_{i}"{name} sourceRef="{s}" targetRef="{t}" />')
    out.append('  </bpmn:process>')
    out.append(f'  <bpmndi:BPMNDiagram id="Diagram_{model["id"]}">')
    out.append(f'    <bpmndi:BPMNPlane id="Plane_{model["id"]}" bpmnElement="Collab_{model["id"]}">')
    out.append(f'      <bpmndi:BPMNShape id="Pool_{model["id"]}_di" bpmnElement="Pool_{model["id"]}" isHorizontal="true">')
    out.append(f'        <dc:Bounds x="0" y="0" width="{width}" height="{height}" />')
    out.append('      </bpmndi:BPMNShape>')
    for i, (lane_id, _) in enumerate(model["lanes"]):
        out.append(f'      <bpmndi:BPMNShape id="Lane_{lane_id}_di" bpmnElement="Lane_{lane_id}" isHorizontal="true">')
        out.append(f'        <dc:Bounds x="{HEADER_W}" y="{i * LANE_H}" width="{width - HEADER_W}" height="{LANE_H}" />')
        out.append('      </bpmndi:BPMNShape>')
    for node_id, kind, _, _, _ in model["nodes"]:
        x, y, w, h = boxes[node_id]
        marker = ' isMarkerVisible="true"' if kind == "xor" else ""
        out.append(f'      <bpmndi:BPMNShape id="{node_id}_di" bpmnElement="{node_id}"{marker}>')
        out.append(f'        <dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h}" />')
        out.append('      </bpmndi:BPMNShape>')
    for i, (s, t, *rest) in enumerate(model["flows"]):
        out.append(f'      <bpmndi:BPMNEdge id="Flow_{i}_di" bpmnElement="Flow_{i}">')
        out += [f'        <di:waypoint x="{x:.0f}" y="{y:.0f}" />' for x, y in waypoints(boxes[s], boxes[t], *rest[1:])]
        out.append('      </bpmndi:BPMNEdge>')
    out += ['    </bpmndi:BPMNPlane>', '  </bpmndi:BPMNDiagram>', '</bpmn:definitions>', '']
    return "\n".join(out)


def wrap(label: str, width: int = 16) -> list[str]:
    words, lines, line = label.split(), [], ""
    for word in words:
        if len(line) + len(word) + 1 > width and line:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    return lines + [line]


def svg(model: dict, boxes: dict) -> str:
    width = HEADER_W + LEFT_PAD * 2 + (max(c for *_, c, _ in model["nodes"]) + 1) * COL_W + 40
    height = LANE_H * len(model["lanes"])
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 {width + 2} {height + 2}" width="{width + 2}" height="{height + 2}" '
         f'role="img" aria-label="{escape(model["name"])}" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="12">',
         '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
         '<path d="M0,0 L10,5 L0,10 z" fill="#3b4652"/></marker></defs>',
         f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff" stroke="#3b4652"/>']
    for i, (_, lane_name) in enumerate(model["lanes"]):
        y = i * LANE_H
        fill = "#f4f6f9" if i % 2 else "#ffffff"
        o.append(f'<rect x="{HEADER_W}" y="{y}" width="{width - HEADER_W}" height="{LANE_H}" fill="{fill}" stroke="#c9d1db"/>')
        o.append(f'<text transform="translate({HEADER_W / 2 + 4},{y + LANE_H / 2}) rotate(-90)" text-anchor="middle" font-weight="600" fill="#1b2430">{escape(lane_name)}</text>')
    o.append(f'<line x1="{HEADER_W}" y1="0" x2="{HEADER_W}" y2="{height}" stroke="#3b4652"/>')
    for i, (s, t, label, *route) in enumerate(model["flows"]):
        pts = waypoints(boxes[s], boxes[t], *route)
        d = " ".join(f"{'M' if j == 0 else 'L'}{x:.0f},{y:.0f}" for j, (x, y) in enumerate(pts))
        o.append(f'<path d="{d}" fill="none" stroke="#3b4652" stroke-width="1.3" marker-end="url(#arrow)"/>')
        if label:
            # label the last segment, where the flow enters its target
            (x1, y1), (x2, y2) = pts[-2], pts[-1]
            if abs(y1 - y2) < 1:  # horizontal into the target: right-align just before it
                o.append(f'<text x="{x2 - 6:.0f}" y="{y2 - 6:.0f}" text-anchor="end" font-size="11" fill="#5b6675">{escape(label)}</text>')
            else:
                o.append(f'<text x="{x1 + 5:.0f}" y="{(y1 + y2) / 2:.0f}" font-size="11" fill="#5b6675">{escape(label)}</text>')
    marks = {**{k: ("#a3312a", v) for k, v in model.get("pain", {}).items()}, **{k: ("#1e7b4f", v) for k, v in model.get("fixes", {}).items()}}
    for node_id, kind, _, _, label in model["nodes"]:
        x, y, w, h = boxes[node_id]
        cx, cy = x + w / 2, y + h / 2
        if kind in ("messageStart", "start", "end"):
            sw = 3 if kind == "end" else 1.5
            o.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{EVENT / 2}" fill="#fff" stroke="#1b2430" stroke-width="{sw}"/>')
            if kind == "messageStart":
                o.append(f'<rect x="{cx - 8:.0f}" y="{cy - 5:.0f}" width="16" height="11" fill="none" stroke="#1b2430"/>'
                         f'<path d="M{cx - 8:.0f},{cy - 5:.0f} L{cx:.0f},{cy + 1:.0f} L{cx + 8:.0f},{cy - 5:.0f}" fill="none" stroke="#1b2430"/>')
            for j, line in enumerate(wrap(label, 18)):
                if kind == "end":  # label to the right, clear of incoming flows
                    o.append(f'<text x="{x + w + 6:.0f}" y="{cy - 2 + j * 13:.0f}" fill="#1b2430">{escape(line)}</text>')
                else:
                    o.append(f'<text x="{cx:.0f}" y="{y + h + 14 + j * 13:.0f}" text-anchor="middle" fill="#1b2430">{escape(line)}</text>')
        elif kind == "xor":
            o.append(f'<path d="M{cx:.0f},{y:.0f} L{x + w:.0f},{cy:.0f} L{cx:.0f},{y + h:.0f} L{x:.0f},{cy:.0f} z" fill="#fff" stroke="#1b2430" stroke-width="1.5"/>')
            o.append(f'<path d="M{cx - 8:.0f},{cy - 8:.0f} L{cx + 8:.0f},{cy + 8:.0f} M{cx + 8:.0f},{cy - 8:.0f} L{cx - 8:.0f},{cy + 8:.0f}" stroke="#1b2430" stroke-width="2.5"/>')
            lines = wrap(label, 18)  # top-left of the diamond: flows leave from the top and bottom
            for j, line in enumerate(lines):
                o.append(f'<text x="{cx - 8:.0f}" y="{y - 2 - (len(lines) - 1 - j) * 13:.0f}" text-anchor="end" fill="#1b2430">{escape(line)}</text>')
        else:
            o.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w}" height="{h}" rx="9" fill="#fff" stroke="#1b2430" stroke-width="1.5"/>')
            icon = {"userTask": "user", "serviceTask": "service", "sendTask": "send"}.get(kind)
            if icon:
                o.append(f'<text x="{x + 6:.0f}" y="{y + 13:.0f}" font-size="9" fill="#5b6675">{icon}</text>')
            lines = wrap(label, 17)
            for j, line in enumerate(lines):
                o.append(f'<text x="{cx:.0f}" y="{cy + 4 + (j - (len(lines) - 1) / 2) * 14:.0f}" text-anchor="middle" fill="#1b2430">{escape(line)}</text>')
        if node_id in marks:
            colour, text = marks[node_id]
            bw = 8 + 7 * len(text)
            o.append(f'<rect x="{x + w - bw / 2:.0f}" y="{y - 9:.0f}" width="{bw}" height="16" rx="8" fill="{colour}"/>'
                     f'<text x="{x + w:.0f}" y="{y + 3:.0f}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">{escape(text)}</text>')
    o.append('</svg>')
    return "\n".join(o)


def main() -> None:
    for model in (AS_IS, TO_BE):
        boxes = layout(model)
        bpmn_path = ROOT / "docs/04-process/bpmn" / f"{model['id'].replace('_', '-')}.bpmn"
        svg_path = ROOT / "site/assets/bpmn" / f"{model['id'].replace('_', '-')}.svg"
        bpmn_path.parent.mkdir(parents=True, exist_ok=True)
        svg_path.parent.mkdir(parents=True, exist_ok=True)
        bpmn_path.write_text(bpmn_xml(model, boxes), encoding="utf-8")
        svg_path.write_text(svg(model, boxes), encoding="utf-8")
        print(f"wrote {bpmn_path.relative_to(ROOT)} and {svg_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
