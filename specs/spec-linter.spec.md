---
id: SPEC-0004
title: Spec linter grades readiness before generation
status: approved
covers:
  - src/lint.ts
criteria:
  - id: C1
    text: Criteria with verify manual produce a lint warning
    verify: test
    evidence: tests/lint.test.ts::warns on manual criteria
  - id: C2
    text: A covers glob that matches no file in the repo produces a lint warning
    verify: test
    evidence: tests/lint.test.ts::warns on dead covers globs
  - id: C3
    text: Every loaded spec receives a readiness grade from A to F
    verify: test
    evidence: tests/lint.test.ts::grades every spec
  - id: C4
    text: Ambiguous wording in criteria is surfaced as an info finding
    verify: test
    evidence: tests/lint.test.ts::flags ambiguous wording
invariants:
  - Lint never mutates spec files
non_goals:
  - Auto-fixing specs
  - Judging product intent (only executability and verifiability)
---

The front-half integration hook: Kiro/Spec Kit users run the linter before
generating. A spec that grades poorly here will also verify poorly later —
ambiguity is the common root cause.
