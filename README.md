# onspec

**Specs that refuse to drift.** A git-native verification layer for spec-driven development — works with any generator (Claude Code, Cursor, Kiro, Spec Kit output, or humans).

Everyone builds the front half of spec-driven development: spec → generated code. onspec is the back half: proving the code *stays* true to the spec, PR after PR, hotfix after hotfix.

- **Specs are files in the repo** (`specs/*.spec.md`) — versioned, diffed, and approved through normal PRs.
- **Every change is checked against its governing spec** — each acceptance criterion gets a met / unmet / uncertain verdict with evidence.
- **Drift is refused, not documented** — hand-edits that no spec governs get flagged: write the spec or revert the code.

## Quick start

```bash
npm install
npm run build

# Grade your specs for verifiability
onspec lint

# Check a change against its governing specs
npm run test:junit                       # any runner that emits JUnit XML works
onspec verify --base origin/main --test-results test-results.xml

# Flag unspecced changes
onspec drift --base origin/main
```

## Spec format

Markdown with YAML frontmatter — human-writable, agent-writable, machine-checkable:

```yaml
---
id: SPEC-0042
title: CSV export includes archived records
status: approved          # draft | approved | superseded
refs:                     # optional: trace to your issue tracker
  - PROJ-123              # Jira key, GitHub issue, RFC URL, ...
covers:                   # globs the spec governs
  - src/export/**
criteria:
  - id: C1
    text: Archived records appear in exports when include_archived=true
    verify: test          # test | assertion | manual
    evidence: tests/export.test.ts::includes archived records
  - id: C2
    text: Export format constant stays RFC 4180
    verify: assertion     # met iff the file contains the snippet
    evidence: src/export/csv.ts#FORMAT = "RFC4180"
invariants:
  - Export format remains RFC 4180 compliant
non_goals:
  - Bulk archive/unarchive operations
---
Free-form context and rationale below the frontmatter.
```

## How verdicts are reached

Two layers, deterministic first:

1. **Deterministic anchors.** `verify: test` evidence (`file::test name`) resolves through your CI's JUnit report — the test result *is* the verdict, no LLM opinion involved. `verify: assertion` evidence (`file#snippet`) is met exactly when the file contains the snippet.
2. **LLM only for the gap.** Criteria without deterministic evidence get an LLM assessment of the diff (Claude, via your `ANTHROPIC_API_KEY`). Every met/unmet verdict must cite `file:line` evidence — uncited verdicts are downgraded to uncertain. No key → those criteria stay uncertain and say so.

`verify: manual` is allowed but visible: the report surfaces it every time, and `onspec lint` warns about it.

## Commands

| Command | What it does | Blocking? |
|---|---|---|
| `onspec verify` | Criterion-by-criterion conformance verdicts for the current diff | Advisory; `--strict` exits 1 on unmet |
| `onspec drift` | Flags changed code with no approved governing spec | Advisory; `--strict` exits 1 on findings |
| `onspec lint` | Readiness grade (A–F) per spec: ambiguity, dead globs, missing evidence | Advisory; `--strict` exits 1 on errors |
| `onspec reverse` | Reverse-generates draft specs from existing code + tests (brownfield on-ramp) | Writes `status: draft` only |

Common flags: `--base <ref>`, `--head <ref>`, `--format markdown`, `--output <file>`.

Config (optional `onspec.config.json`):

```json
{ "specDir": "specs", "code": ["src/**"], "base": "HEAD~1" }
```

`code` globs define what counts as "code that must be specced" for drift detection.

## GitHub Action

```yaml
- uses: bensubercaseaux/onspec@main
  with:
    test-results: test-results.xml
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}   # optional
    strict: "false"                                       # advisory first — earn the right to block
```

Posts a single, self-updating conformance comment on the PR and writes the report to the job summary. See `.github/workflows/onspec.yml` for the full example.

## Dogfood

This repo verifies itself: `specs/` governs `src/`, and every criterion is anchored to this repo's own tests. Try the canonical demos:

```bash
# The 2 a.m. hotfix — an unspecced file
echo 'export const x = 1;' > src/hotfix.ts
onspec drift --base HEAD     # ⚠ [unspecced-change] src/hotfix.ts …

# The broken PR — sabotage covered code, watch the criterion fail
# (edit src/drift.ts, run npm run test:junit, then:)
onspec verify --base HEAD --test-results test-results.xml
# ❌ unmet  C2  A changed code file whose only coverage is a non-approved spec …
```

## Reverse-spec generation (brownfield on-ramp)

For codebases with no specs at all, `onspec reverse` recovers the implicit spec from existing code and tests:

```bash
onspec reverse                       # drafts via the Claude API (needs ANTHROPIC_API_KEY)
onspec reverse --prompt-only         # print the drafting prompt to drive any agent by hand
onspec reverse --from-json out.json  # ingest drafts an agent produced (draftsSchema shape)
```

The LLM only drafts. Everything that must be true is enforced deterministically afterwards: criteria anchored to test names that don't actually exist are stripped and reported as test gaps, ids are assigned in sequence, and output is always `status: draft` — approval stays a human act in a reviewed PR. Validated against [unjs/defu](https://github.com/unjs/defu): 4 specs, 20 criteria, 19 anchored to existing tests, 0 hallucinated pointers admitted, and `verify` then scored the repo 19 met / 1 uncertain (a real test gap it surfaced).

## Status

Weekend-scale MVP. Zero server-side state — everything derives from the repo. Roadmap: blast-radius tracing, autonomy policies (change-class → merge-gate mapping), and a verifier eval corpus.
