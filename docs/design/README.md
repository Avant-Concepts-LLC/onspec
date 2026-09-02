# Design working files — onspec

`gen_diagram.py` builds the "how a change is verified" diagram in onspec.sh's own tokens (Geist / Geist Mono, `#0b0d10` ground, met / unmet / uncertain colours) and emits two files:

- `Onspec How It Works.dc.html` — the Design Component, written to Ben's Claude Design project by Claude Code through the design tool (see `~/Websites/home/docs/claude-design-handoff.md`; click the canvas refresh icon after a write).
- `how-it-works.embed.html` — the same poster as a self-contained fragment that scales to its container (`aspect-ratio` + a `transform: scale()` on resize). Drop it inside a `.wrap` on `site/index.html` (between `#verdicts` and the hotfix section is the natural spot) or on `site/docs.html`. No images, no external assets beyond the Google Fonts the site already loads.

Every data point comes from `README.md`, `src/lint.ts` (grade thresholds), `src/drift.ts` (finding kinds) and `src/llm.ts` (model). Edit the generator, not the outputs.
