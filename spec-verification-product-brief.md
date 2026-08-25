# Product Brief: The Verification Layer for Spec-Driven Development

*Seed document for an agentic workspace. Everything here is exploration-ready: an agent should be able to read this file and start prototyping, researching, or pressure-testing any section. Written August 2026.*

## One-line thesis

Everyone is building the front half of spec-driven development (spec → generated code); nobody has built the back half (proving the code *stays* true to the spec). Build the back half, tool-agnostic, git-native.

## The market gap

The spec-driven development (SDD) category is real and hot as of mid-2026:

- **AWS Kiro** — spec-first agentic IDE (requirements/design/tasks specs drive implementation). Front-half only; the spec is structured prompting at the start of the process, not an enforced artifact afterward.
- **GitHub Spec Kit** — open-source MIT CLI toolkit bolted onto any agent (Copilot, Claude Code, Cursor). Same shape: spec → plan → tasks → generate. No enforcement after generation.
- **Tessl** (~$125M, Guy Podjarny/Snyk founder) — the pure "spec-as-source" bet: spec is canonical, code is regenerated and never hand-edited. Stuck in closed beta ~9 months, JavaScript-only, and reportedly produces **non-deterministic output from identical specs**. The best-funded attempt at the maximalist vision is stuck on exactly the problem this product accepts as a premise.
- **Methodology tier** — BMAD-METHOD, OpenSpec, Cursor plan mode, Claude Code workflows: conventions, not platforms.
- **Platform tier** — GitLab Duo Agent Platform / GitHub Copilot: agents grounded in the SDLC, generic AI code review shipping. Spec conformance is not a shipped capability anywhere.

**The premise this product accepts (and Tessl fights):** LLM generation is non-deterministic, so code remains the auditable record of what executes. Therefore the durable value isn't a better generator — it's the machinery that keeps spec and code demonstrably in agreement. Code goes from being *read* to being *checked*; this is the thing that does the checking.

## Product vision

A git-native verification layer that works with *any* generator (Claude Code, Cursor, Kiro, Spec Kit output, or humans):

1. **Specs are structured files in the repo** — versioned, diffed, reviewed, and approved through normal PRs/MRs. The spec review is where humans debate intent.
2. **Every code change is checked against its governing spec** — each acceptance criterion mapped to evidence (code path, test, CI result) with a met / unmet / uncertain verdict posted on the PR.
3. **Drift is refused, not documented** — hand-edits to code that diverge from the approved spec get flagged: update the spec or revert the code. A source of truth *refuses* to drift; documentation drifts silently. This is the difference.

Positioning line: **"Specs that refuse to drift."** Not a code generator, not an IDE — the trust layer that makes everyone else's generators safe to use at team scale.

## Core concepts (MVP-ordered)

### 1. Spec format (`specs/*.spec.md`)
Markdown with YAML frontmatter. Human-writable, agent-writable, machine-checkable.

```yaml
---
id: SPEC-0042
title: CSV export includes archived records
status: approved          # draft | approved | superseded
covers:                   # globs the spec governs
  - src/export/**
criteria:
  - id: C1
    text: Archived records appear in exports when include_archived=true
    verify: test           # test | assertion | manual
    evidence: tests/export/test_archived.py::test_include_archived
  - id: C2
    text: Default export excludes archived records
    verify: test
    evidence: tests/export/test_archived.py::test_default_excludes
invariants:
  - Export format remains RFC 4180 compliant
non_goals:
  - Bulk archive/unarchive operations
---
Free-form context, rationale, and design notes below the frontmatter.
```

Design principles: criteria carry their own verification method and evidence pointer; `verify: manual` is allowed but visible (the report shames it); `covers` globs create the spec↔code mapping that drift detection needs.

### 2. Conformance engine
On PR: identify governing specs (via `covers` + changed paths), then for each criterion produce a verdict:
- **Deterministic anchors first:** if `evidence` names a test, the verdict is the test result — no LLM opinion involved.
- **LLM only for the gap:** criteria without test evidence get an LLM assessment (does the diff implement this?) that must cite specific code paths — falsifiable claims, never bare verdicts.
- Output: a PR comment table — criterion / verdict (met · unmet · uncertain) / evidence link. Human review lands on unmet + uncertain rows.

### 3. Drift detection
CI job on every push to a covered path:
- Change touches covered code with **no governing criterion** → "unspecced change" flag (either the spec is incomplete or the change shouldn't happen).
- Spec edited without `status: approved` re-review → stale-approval flag.
- The 2 a.m. hotfix scenario is the canonical demo: patch code directly → next CI run flags "code no longer matches SPEC-0042 — update the spec or revert."

### 4. Spec linter / readiness grade (fast follow)
Grade a spec for agent-executability before generation: ambiguous nouns, criteria without verification methods, missing non-goals, unreferenced files. This is the front-half integration hook — Kiro/Spec Kit users run the linter before generating.

### 5. Later (roadmap, not MVP)
- **Blast radius:** trace what a diff can reach beyond its `covers` globs; flag the untested part of the radius.
- **Autonomy policy:** change-class → merge-gate mapping (docs auto-merge on green; schema/auth always human). Makes agent autonomy auditable.
- **The verifier's own eval suite:** a corpus of (spec, diff, known-correct verdict) triples; no verifier version ships that regresses on it. This answers "who checks the checker" and is itself a moat — the corpus compounds.

## Architecture sketch (MVP)

- **CLI first** (`speccheck verify`, `speccheck drift`, `speccheck lint`) — runs locally and in any CI.
- **GitHub Action + GitLab CI component** wrapping the CLI — posts the conformance comment. Bottoms-up adoption: one YAML block in a repo, no platform to buy.
- LLM calls via user-supplied API key (Claude default); every LLM verdict must include cited file:line evidence or it downgrades to "uncertain."
- Zero server-side state for MVP — everything derives from the repo. (State/dashboard/history is the later SaaS wedge.)

## Weekend-scale MVP definition

A GitHub Action that, given a `specs/` directory and a PR: identifies governing specs, runs criterion→evidence checks (test-anchored + LLM-assessed), and posts one conformance comment. Success = the demo where a deliberately broken PR gets caught with a criterion-level explanation, and the hotfix-drift scenario fires.

## Open questions for the workspace to explore

1. Spec granularity — one spec per feature? per behavior? What does a 50-spec repo feel like to navigate?
2. Bootstrapping brownfield — can an agent *reverse-generate* draft specs from existing code + tests? (Huge if true: the on-ramp for every existing codebase, and possibly the real product.)
3. How do criteria compose across specs that both cover the same path? Precedence rules?
4. What's the false-positive tolerance before teams turn it off? (Drift flags that are noise kill the product.)
5. Monorepo/multi-repo `covers` semantics.
6. Does the conformance comment want to be a check (blocking) or a comment (advisory) first? Advisory first, almost certainly — earn the right to block.
7. Prior art check: OpenAPI/contract-testing (Pact), requirements-traceability tools (aerospace/medical: DOORS), lit tests, doctests — what do they teach about spec↔code linkage at scale?

## Validation plan

- Dogfood on this repo's own development — the tool's specs verified by the tool.
- Then: 3–5 teams already using Claude Code/Cursor heavily; the pitch is "you already generate code from plans — want proof the code still matches the plan next month?"
- Signal to watch: do people write specs *because* the verifier exists? (The tool making the discipline worthwhile is the whole bet.)

## Name candidates

Working shortlist (check domains/trademarks before attachment):

- **TrueUp** — accounting term for reconciling records to actuals; "true up the code to the spec." Verb-able: "did you trueup?"
- **Asbuilt** — construction's "as-built drawings" exist precisely because reality drifts from blueprint; the entire product in one borrowed metaphor.
- **Assay** — testing metal for purity; assay the code against the spec. Short, old, serious.
- **Accord** — the state of agreement between spec and code; "this PR is in accord."
- **Ratify** — what merging a spec MR does; governance-flavored.
- **Plumbline** — the builder's tool for checking true; "is this code plumb?"
- **Writ** — code executes by writ of the spec; short and severe.
- **Covenant** — the spec as binding contract; strong for the enterprise/compliance angle.
- **Specular** — spec + mirror-reflection pun (code as reflection of spec); clever, maybe too cute.
- **Vouch** — the conformance report vouches for the PR.

Descriptive fallback for the repo/CLI while deciding: `speccheck`.

## Decision log

- **2026-08-24 — Name: `onspec`.** "On spec" = built to specification; name equals the CLI command. Checked available: npm `onspec`, onspec.sh (onspec.dev taken). `speccheck` passed over due to existing Spec Check enterprise-software company (speccheck.com, est. 2004) and taken GitHub org.
