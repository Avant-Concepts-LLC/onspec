#!/usr/bin/env python3
"""Generate the onspec "how a change is verified" diagram as a Design Component (.dc.html).
Dark, in onspec.sh tokens (Geist / Geist Mono, #0b0d10 ground, met/unmet/uncertain colours). Emits the Design Component and an embeddable fragment."""
import html, os

W, H = 1600, 920
INK, GROUND, MUTED = "#e8ebef", "#0b0d10", "#9aa3b0"
PANEL, LINE, FAINT = "#0e1116", "#1e232c", "#616a78"
GREEN, GREEN_BG = "#3ecf8e", "#0f2a1f"
AMBER, AMBER_BG = "#d9a441", "#2a2210"
RED, RED_BG = "#f0716c", "#2a1513"
GREY, GREY_BG = "#3a4250", "#11141a"
BLUE, BLUE_BG = GREEN, GREEN_BG   # kept for the shared helpers; onspec has one "code" colour
AMBER_TXT = AMBER
PLUM, PLUM_BG, PLUM_TXT = AMBER, AMBER_BG, AMBER
R = 10  # corner radius — deliberately overrides Modernist's 0

ICON = {
  "chart": '<polyline points="3 17 8 11 12 14 17 7 21 10"/>',
  "list": '<path d="M4 6h16M4 12h16M4 18h10"/>',
  "gauge": '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4-5"/>',
  "calc": '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3"/>',
  "bank": '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  "cal": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  "layers": '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  "doc": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  "users": '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 8 0"/>',
  "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  "coins": '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v6c0 1.7 2.7 3 6 3s6-1.3 6-3V7M3 13v4c0 1.7 2.7 3 6 3s6-1.3 6-3"/>',
  "bird": '<path d="M21 6c-1 .5-2 .8-3 .9A4 4 0 0 0 11 10v1C7 11 4 9 2 6c-1.5 3 0 6 3 8-1 0-2 0-3-.5 0 3 2 5 5 5.5-2 1.5-5 2-7 1.5 3 2 6 2.5 9 2.5 8 0 13-7 13-13v-.5c1-.7 2-1.5 2.5-2.5z"/>',
  "search": '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  "smile": '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  "tag": '<path d="M3 12l9-9h9v9l-9 9z"/><circle cx="16" cy="8" r="1.5"/>',
  "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  "loop": '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5"/>',
  "book": '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
  "flag": '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  "fire": '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
  "wallet": '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
  "ladder": '<path d="M7 3v18M17 3v18M7 8h10M7 13h10M7 18h10"/>',
  "x": '<path d="M4 4l16 16M20 4L4 20"/>',
}
def icon(name, size=16, stroke=INK):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICON[name]}</svg>'

def box(x, y, w, h, bg, border, extra="", inner="", dashed=False, bw=2):
    st = f"position:absolute; left:{x}px; top:{y}px; width:{w}px; height:{h}px; box-sizing:border-box; background:{bg}; border:{bw}px {'dashed' if dashed else 'solid'} {border}; border-radius:{R}px; {extra}"
    return f'<div style="{st}">{inner}</div>\n'

def text(x, y, w, s, size=12, weight=400, color=INK, extra="", align="left", lh=1.3):
    return f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; font-size:{size}px; font-weight:{weight}; color:{color}; line-height:{lh}; text-align:{align}; text-wrap:pretty; {extra}">{s}</div>\n'

def kicker(x, y, w, s, color=MUTED):
    return text(x, y, w, s, 10, 800, color, "letter-spacing:.08em; text-transform:uppercase;")

def chip(s, border=INK, bg=GROUND, color=INK, ic=None, size=10):
    i = (icon(ic, 11, color) if ic else "")
    return f'<span style="display:inline-flex; align-items:center; gap:4px; font-size:{size}px; font-weight:600; border:1px solid {border}; background:{bg}; color:{color}; padding:2px 7px; border-radius:999px; white-space:nowrap;">{i}{s}</span>'

# ---------- tiles for the data wall ----------
KIND = {"code": (BLUE, BLUE_BG, BLUE), "free": (GREY, GREY_BG, INK), "paid": (PLUM, PLUM_BG, PLUM_TXT), "rule": (RED, GROUND, "#ae1800")}
# ---------- arrows (SVG layer) ----------
arrows = []
def arrow(points, color=INK, width=3, dashed=False, marker="m"):
    d = " ".join(f"{'M' if i == 0 else 'L'}{x} {y}" for i, (x, y) in enumerate(points))
    dash = ' stroke-dasharray="8 7"' if dashed else ""
    arrows.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"{dash} marker-end="url(#{marker})"/>')
def label(x, y, s, color=INK, w=200, align="center", size=10):
    return text(x, y, w, s, size, 800, color, "letter-spacing:.04em; text-transform:uppercase;", align)

out = []
A = out.append


MONO = "font-family:'Geist Mono',ui-monospace,Menlo,monospace;"
def mono(x, y, w, s, size=11, color=INK, extra=""):
    return text(x, y, w, s, size, 500, color, MONO + extra, lh=1.45)
def pill(s, color, ic=None):
    return chip(s, color, GROUND, color, ic, 10)
def card(x, y, w, h, border=LINE, bg=PANEL, inner="", dashed=False, bw=1):
    return box(x, y, w, h, bg, border, inner=inner, dashed=dashed, bw=bw)
def line_item(ic, color, title, sub):
    return f'<div style="display:flex; gap:9px; align-items:flex-start; padding:7px 10px;"><div style="flex:none; width:22px; height:22px; border-radius:6px; background:{GROUND}; border:1px solid {LINE}; display:flex; align-items:center; justify-content:center;">{icon(ic, 13, color)}</div><div style="display:flex; flex-direction:column; gap:1px; min-width:0;"><span style="font-size:11.5px; font-weight:600; color:{INK};">{title}</span><span style="font-size:10px; color:{MUTED}; line-height:1.35;">{sub}</span></div></div>'

# ---------- header ----------
A(text(40, 26, 700, '<span style="' + MONO + f' color:{GREEN};">onspec</span> <span style="color:{FAINT};">· how a change is verified · v1.2</span>', 12, 600, MUTED))
A(text(40, 44, 1200, "Specs that refuse to drift.", 38, 700, INK, "letter-spacing:-.03em; white-space:nowrap;", lh=1.05))
A(text(40, 96, 1000, "Left to right is the life of one pull request. Green verdicts come from tests and evidence, amber ones from a model that must cite its source, red is refused.", 13, 400, MUTED))

# ---------- 1 · THE SPEC ----------
sx, sy, sw, sh = 40, 140, 300, 470
A(card(sx, sy, sw, sh))
A(kicker(sx + 16, sy + 14, sw - 32, "1 · The spec · a file in the repo", GREEN))
A(mono(sx + 16, sy + 34, sw - 32, "specs/csv-export.spec.md", 11, MUTED))
frontmatter = [("id", "SPEC-0042", MUTED), ("status", "approved", GREEN), ("refs", "PROJ-123", MUTED), ("covers", "src/export/**", INK), ("criteria", "", MUTED), ("  C1", "verify: test", GREEN), ("", "tests/export.test.ts::archived", FAINT), ("  C2", "verify: assertion", GREEN), ("", "src/export/csv.ts#FORMAT = \"RFC4180\"", FAINT), ("  C3", "verify: manual", AMBER), ("invariants", "RFC 4180 stays", MUTED), ("non_goals", "bulk archive", MUTED)]
A(card(sx + 16, sy + 54, sw - 32, 232, LINE, GROUND, inner='<div style="padding:10px 12px; display:flex; flex-direction:column; gap:2px; ' + MONO + ' font-size:10.5px; line-height:1.5;">' + "".join(f'<div style="display:flex; gap:8px;"><span style="color:{FAINT}; min-width:64px;">{k}</span><span style="color:{c};">{v}</span></div>' for k, v, c in frontmatter) + '</div>'))
A(f'<div style="position:absolute; left:{sx+16}px; top:{sy+296}px; width:{sw-32}px; display:flex; gap:6px; flex-wrap:wrap;">' + pill("draft", FAINT) + '<span style="color:#616a78; font-size:11px; line-height:22px;">→</span>' + pill("approved", GREEN) + '<span style="color:#616a78; font-size:11px; line-height:22px;">→</span>' + pill("superseded", RED) + "</div>\n")
A(text(sx + 16, sy + 326, sw - 32, "Approval is a human act in a reviewed PR. Versioned and diffed like code.", 10.5, 400, MUTED))
A(card(sx + 16, sy + 364, sw - 32, 90, LINE, GROUND, inner=f'<div style="padding:8px 10px; display:flex; flex-direction:column; gap:4px;"><div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-size:11.5px; font-weight:600;"><span style="{MONO} color:{GREEN};">onspec lint</span> · readiness grade</span><span style="{MONO} font-size:11px; color:{GREEN};">A B C D F</span></div><div style="font-size:10px; color:{MUTED}; line-height:1.4;">manual criterion −10 · missing evidence · vague wording −3 per word · dead cover globs. A = no penalty, F above 45.</div></div>'))

# ---------- 2 · THE CHANGE ----------
cx, cy, cw, ch = 380, 140, 260, 470
A(card(cx, cy, cw, ch))
A(kicker(cx + 16, cy + 14, cw - 32, "2 · The change", MUTED))
A(card(cx + 16, cy + 40, cw - 32, 62, LINE, GROUND, inner=line_item("doc", INK, "git diff base…head", "<span style='" + MONO + "'>--base origin/main</span> · any branch, hotfix or agent PR")))
A(card(cx + 16, cy + 110, cw - 32, 62, LINE, GROUND, inner=line_item("flag", GREEN, "JUnit XML from your runner", "<span style='" + MONO + "'>npm run test:junit</span> · vitest, jest, pytest, anything")))
A(card(cx + 16, cy + 180, cw - 32, 62, LINE, GROUND, inner=line_item("layers", INK, "onspec.config.json", "<span style='" + MONO + "'>code: [\"src/**\"]</span> = what must be specced")))
A(text(cx + 16, cy + 262, cw - 32, "Governing specs = every approved spec whose <span style='" + MONO + "'>covers</span> glob matches a changed file.", 10.5, 400, MUTED))
A(card(cx + 16, cy + 318, cw - 32, 130, LINE, GROUND, inner=f'<div style="padding:9px 10px; display:flex; flex-direction:column; gap:5px;"><span style="font-size:11.5px; font-weight:600;">Runs where the change is</span><div style="display:flex; flex-wrap:wrap; gap:5px;">{pill("GitHub Action @v1", GREEN)}{pill("GitLab CI template", GREEN)}{pill("local CLI", INK)}</div><span style="font-size:10px; color:{MUTED}; line-height:1.4;">Zero server-side state. Everything derives from the repo and the CI report.</span></div>'))

# ---------- 3 · THE VERDICT ENGINE (hero) ----------
ex, ey, ew, eh = 680, 140, 540, 470
A(card(ex, ey, ew, eh, GREEN, PANEL, bw=2))
A(kicker(ex + 16, ey + 14, 500, "3 · The verdict · deterministic first, a model only for the gap", GREEN))
A(text(ex + 16, ey + 34, ew - 32, "For every criterion in every governing spec:", 11, 500, MUTED))
lanes = [
  ("test", "verify: test", "evidence <span style='" + MONO + "'>file::test name</span> resolves through the JUnit report. The test result <b>is</b> the verdict.", GREEN, "flag", "met · unmet"),
  ("assertion", "verify: assertion", "evidence <span style='" + MONO + "'>file#snippet</span> — met exactly when the file contains the snippet.", GREEN, "calc", "met · unmet"),
  ("llm", "no deterministic evidence", "the diff + the spec text go to Claude (<span style='" + MONO + "'>claude-opus-5</span>). Every verdict must cite <span style='" + MONO + "'>file:line</span> — uncited verdicts are downgraded.", AMBER, "search", "met · unmet · uncertain"),
  ("manual", "verify: manual · no key", "never checked automatically; surfaced in every report and warned by lint. No API key → the model lane stays uncertain and says so.", AMBER, "users", "uncertain"),
]
ly = ey + 56
for key, t, s, col, ic, verdicts in lanes:
    A(card(ex + 16, ly, ew - 32, 66, LINE, GROUND, inner=f'<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; height:100%; box-sizing:border-box;"><div style="flex:none; width:26px; height:26px; border-radius:7px; background:{PANEL}; border:1px solid {col}; display:flex; align-items:center; justify-content:center;">{icon(ic, 14, col)}</div><div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;"><span style="font-size:11.5px; font-weight:600; color:{INK};">{t}</span><span style="font-size:10px; color:{MUTED}; line-height:1.35;">{s}</span></div><div style="flex:none; {MONO} font-size:10px; color:{col}; text-align:right; width:120px;">{verdicts}</div></div>'))
    ly += 74
# drift lane
A(card(ex + 16, ly + 6, ew - 32, 96, RED, RED_BG, inner=f'<div style="padding:9px 10px; display:flex; flex-direction:column; gap:5px;"><div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-size:11.5px; font-weight:600; color:{INK};"><span style="{MONO} color:{RED};">onspec drift</span> · in parallel, every changed code file</span>{icon("shield", 14, RED)}</div><div style="display:flex; flex-direction:column; gap:2px; font-size:10px; color:{MUTED}; line-height:1.35;"><div><span style="{MONO} color:{RED};">unspecced-change</span> — no spec covers it: write the spec or revert the code</div><div><span style="{MONO} color:{RED};">stale-approval</span> — only a draft covers it: someone is shipping against a draft</div><div><span style="{MONO} color:{RED};">superseded-coverage</span> — only a superseded spec covers it: approve a successor</div></div></div>'))

# ---------- 4 · THE REPORT ----------
rx, ry, rw, rh = 1260, 140, 300, 470
A(card(rx, ry, rw, rh))
A(kicker(rx + 16, ry + 14, rw - 32, "4 · The report", MUTED))
A(card(rx + 16, ry + 40, rw - 32, 118, LINE, GROUND, inner=f'<div style="padding:10px 12px; {MONO} font-size:10.5px; line-height:1.6;"><div style="color:{GREEN};">✓ met&nbsp;&nbsp;&nbsp;&nbsp;C1  archived records export</div><div style="color:{GREEN};">✓ met&nbsp;&nbsp;&nbsp;&nbsp;C2  format constant RFC4180</div><div style="color:{AMBER};">? uncertain C3  verify: manual</div><div style="color:{RED};">⚠ unspecced-change  src/hotfix.ts</div><div style="color:{FAINT}; margin-top:4px;">2 met · 1 uncertain · 1 finding</div></div>'))
A(f'<div style="position:absolute; left:{rx+16}px; top:{ry+180}px; width:{rw-32}px; display:flex; gap:5px; flex-wrap:wrap;">' + pill("terminal", INK) + pill("markdown", INK) + pill("json", INK) + "</div>\n")
A(card(rx + 16, ry + 214, rw - 32, 62, LINE, GROUND, inner=line_item("users", GREEN, "One self-updating PR comment", "GitHub Action posts it and writes the job summary; GitLab gets an MR note")))
A(card(rx + 16, ry + 284, rw - 32, 76, RED, GROUND, inner=f'<div style="padding:8px 10px; display:flex; flex-direction:column; gap:3px;"><span style="font-size:11.5px; font-weight:600;"><span style="{MONO} color:{RED};">--strict</span> exits 1</span><span style="font-size:10px; color:{MUTED}; line-height:1.4;">on unmet criteria or drift findings. Advisory by default — earn the right to block.</span></div>'))
A(text(rx + 16, ry + 372, rw - 32, "Drift is refused, not documented. The verdict is on the criterion, not the vibe of the PR.", 10.5, 500, INK))
A(f'<div style="position:absolute; left:{rx+16}px; top:{ry+412}px; width:{rw-32}px; display:flex; gap:5px; flex-wrap:wrap;">' + pill("dogfooded: this repo verifies itself", GREEN, "loop") + "</div>\n")

# ---------- bottom row: REVERSE + DATA HANDLING ----------
bx, by, bw, bh = 40, 650, 760, 140
A(card(bx, by, bw, bh, AMBER, PANEL, bw=1))
A(kicker(bx + 16, by + 12, bw - 32, "Brownfield on-ramp · onspec reverse · the model drafts, code validates, a human approves", AMBER))
steps = [("code + tests", "matched by your globs", INK, "layers"), ("Claude drafts specs", "or --prompt-only for any agent you trust", AMBER, "search"), ("deterministic validation", "missing test pointers stripped and reported · ids sequenced", GREEN, "calc"), ("status: draft", "always. Approval stays a reviewed PR", FAINT, "doc")]
stx = bx + 16
for i, (t, s, col, ic) in enumerate(steps):
    A(card(stx, by + 36, 168, 88, LINE, GROUND, inner=line_item(ic, col, t, s)))
    if i < 3:
        arrow([(stx + 168, by + 80), (stx + 184, by + 80)], MUTED, 2, marker="mm")
    stx += 186
dx, dy, dw, dh = 840, 650, 720, 140
A(card(dx, dy, dw, dh, LINE, PANEL))
A(kicker(dx + 16, dy + 12, dw - 32, "What leaves your machine", MUTED))
A(card(dx + 16, dy + 36, 220, 88, GREEN, GROUND, inner=line_item("shield", GREEN, "No key: nothing", "no network calls; verdicts come from your repo and your test report")))
A(card(dx + 248, dy + 36, 220, 88, AMBER, GROUND, inner=line_item("search", AMBER, "Key: the minimum", "the diff and the governing spec's text, per unanchored criterion, under your account")))
A(card(dx + 480, dy + 36, 224, 88, LINE, GROUND, inner=line_item("x", RED, "Never", "the full repo, test results, env vars, or anything already decided deterministically")))

# ---------- arrows ----------
arrow([(sx + sw, 330), (cx - 2, 330)], MUTED, 3)
A(label(sx + sw - 30, 308, "covers ∩ diff", MUTED, 120, "center", 9))
arrow([(cx + cw, 330), (ex - 2, 330)], INK, 4)
A(label(cx + cw - 30, 308, "diff · JUnit", INK, 120, "center", 9))
arrow([(ex + ew, 330), (rx - 2, 330)], INK, 4)
A(label(ex + ew - 30, 308, "verdicts · findings", INK, 120, "center", 9))
# reverse → spec (dashed, up the left)
arrow([(bx + 16 + 3 * 186 + 84, by), (bx + 16 + 3 * 186 + 84, by - 18), (sx + sw / 2, by - 18), (sx + sw / 2, sy + sh + 2)], AMBER, 2, dashed=True, marker="ma")
A(label(sx + sw + 10, by - 34, "a draft spec lands in specs/ for review", AMBER, 320, "left", 9))
# strict → PR loop label
A(label(rx + 16, ry + rh + 14, "the PR merges only when the report says so", MUTED, rw - 32, "left", 9))

# ---------- footer: commands + legend ----------
fy = 816
A(f'<div style="position:absolute; left:40px; top:{fy}px; width:{W-80}px; border-top:1px solid {LINE};"></div>\n')
CMDS = [("onspec lint", "grade the specs A–F"), ("onspec verify --base origin/main --test-results test-results.xml", "criterion verdicts for the diff"), ("onspec drift --base origin/main", "changed code with no approved spec"), ("onspec reverse", "draft specs from code + tests")]
A(f'<div style="position:absolute; left:40px; top:{fy+12}px; width:1010px; display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px;">' + "".join(f'<div style="border-left:2px solid {GREEN}; padding:2px 8px; font-size:10px; line-height:1.35;"><span style="{MONO} color:{INK};">{a}</span><br><span style="color:{MUTED};">{b}</span></div>' for a, b in CMDS) + "</div>\n")
LEG = [(GREEN, "deterministic — tests and evidence decide"), (AMBER, "a model decides, with a cited file:line"), (RED, "refused — unmet or drift"), (LINE, "a file in your repo")]
A(f'<div style="position:absolute; left:1080px; top:{fy+12}px; width:480px; display:flex; flex-direction:column; gap:4px; font-size:10.5px; color:{MUTED};">' + "".join(f'<span style="display:inline-flex; align-items:center; gap:7px;"><span style="width:18px; height:11px; border:1.5px solid {c}; background:{GROUND}; border-radius:3px;"></span>{s}</span>' for c, s in LEG) + "</div>\n")

svg = (f'<svg style="position:absolute; left:0; top:0; pointer-events:none;" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
       f'<defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{INK}"/></marker>'
       f'<marker id="mm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{MUTED}"/></marker>'
       f'<marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{AMBER}"/></marker></defs>' + "".join(arrows) + "</svg>\n")
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">'
poster = f'<div data-screen-label="How it works" style="position:relative; width:{W}px; height:{H}px; background:{GROUND}; color:{INK}; font-family:\'Geist\',-apple-system,\'Segoe UI\',sans-serif; overflow:hidden; -webkit-font-smoothing:antialiased;">\n{svg}{"".join(out)}</div>'
doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONTS}
  <style>
    body {{ margin:0; background:{GROUND}; }}
    a {{ color:{GREEN}; }} a:hover {{ color:#2a8f64; }}
  </style>
</helmet>
{poster}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""
# Embeddable fragment for onspec.sh: scales the fixed poster to the container width. The site section supplies its own
# heading, so the poster's title band (the top EMBED_CROP px) is cropped off in the embed.
EMBED_CROP = 118
embed = f"""<!-- generated by docs/design/gen_diagram.py — do not hand-edit -->
<div class="how-poster" style="position:relative; width:100%; aspect-ratio:{W} / {H - EMBED_CROP}; overflow:hidden; border:1px solid #1e232c; border-radius:10px;">
  <div class="how-poster-inner" style="position:absolute; left:0; top:0; width:{W}px; height:{H}px; transform-origin:0 0; margin-top:-{EMBED_CROP}px;">
{poster}
  </div>
</div>
<script>(function(){{var p=document.querySelector('.how-poster'),i=p&&p.querySelector('.how-poster-inner');if(!i)return;function f(){{var s=p.clientWidth/{W};i.style.transform='scale('+s+')';i.style.marginTop=(-{EMBED_CROP}*s)+'px';}}f();addEventListener('resize',f);}})();</script>
"""
here = os.path.dirname(os.path.abspath(__file__))
open(os.path.join(here, "Onspec How It Works.dc.html"), "w").write(doc)
open(os.path.join(here, "how-it-works.embed.html"), "w").write(embed)
print(here, len(doc), len(embed))
# Keep the live site in step: replace the marked block in site/index.html when it exists.
site = os.path.join(here, "..", "..", "site", "index.html")
if os.path.exists(site):
    html = open(site).read(); a, b = "<!-- how-it-works:start -->\n", "<!-- how-it-works:end -->"
    if a in html and b in html:
        html = html[:html.index(a) + len(a)] + embed + html[html.index(b):]
        open(site, "w").write(html); print("site/index.html updated")
