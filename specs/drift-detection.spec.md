---
id: SPEC-0003
title: Drift is refused, not documented
status: approved
covers:
  - src/drift.ts
criteria:
  - id: C1
    text: A changed code file covered by no spec is flagged as an unspecced change
    verify: test
    evidence: tests/drift.test.ts::flags unspecced changes
  - id: C2
    text: A changed code file whose only coverage is a non-approved spec is flagged as a stale approval
    verify: test
    evidence: tests/drift.test.ts::flags stale approvals
  - id: C3
    text: Files outside the configured code globs are ignored by drift detection
    verify: test
    evidence: tests/drift.test.ts::ignores files outside code globs
invariants:
  - Drift detection is fully deterministic — no LLM calls
non_goals:
  - Judging whether the change is good (that is verify's job)
  - Auto-generating the missing spec
---

The canonical scenario: a 2 a.m. hotfix patches covered code directly. The
next CI run must say "update the spec or revert" — a source of truth refuses
to drift, documentation drifts silently.
