---
id: SPEC-0006
title: Reverse-spec generation is the brownfield on-ramp
status: approved
covers:
  - src/reverse.ts
criteria:
  - id: C1
    text: Draft evidence pointing at a test name that does not exist in the named file is stripped and reported
    verify: test
    evidence: tests/reverse.test.ts::strips evidence pointing at a nonexistent test
  - id: C2
    text: Materialized drafts round-trip through the spec parser and always carry status draft
    verify: test
    evidence: tests/reverse.test.ts::writes drafts that round-trip through the spec parser with status draft
  - id: C3
    text: Spec ids continue after the highest existing id in the repo
    verify: test
    evidence: tests/reverse.test.ts::continues after the highest existing id
  - id: C4
    text: A criterion whose evidence was stripped survives as a visible test gap rather than being dropped
    verify: test
    evidence: tests/reverse.test.ts::counts stripped pointers and keeps the criterion as a test gap
invariants:
  - Reverse generation never emits status approved — approval is a human act in a reviewed PR
  - Hallucinated evidence pointers never enter a written spec file
non_goals:
  - Generating code from specs (other tools own the front half)
  - Judging whether the existing behavior is correct (as-built specs describe what is)
---

The on-ramp for every existing codebase: recover the implicit spec from
working code and its tests. The LLM drafts; everything that must be true —
evidence resolution, id assignment, draft status — is enforced
deterministically after the fact. Validated against unjs/defu: 20 criteria,
19 anchored to existing tests, 0 hallucinated pointers admitted.
