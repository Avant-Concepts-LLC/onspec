---
id: SPEC-0002
title: Conformance engine resolves criteria deterministically before asking an LLM
status: approved
covers:
  - src/verify.ts
  - src/evidence.ts
  - src/junit.ts
  - src/covers.ts
  - src/llm.ts
criteria:
  - id: C1
    text: A criterion whose test evidence maps to a passing JUnit result is met with no LLM involvement
    verify: test
    evidence: tests/evidence.test.ts::passing test result yields met
  - id: C2
    text: A criterion whose test evidence maps to a failing JUnit result is unmet
    verify: test
    evidence: tests/evidence.test.ts::failing test result yields unmet
  - id: C3
    text: Assertion evidence (file#snippet) is met exactly when the file contains the snippet
    verify: test
    evidence: tests/evidence.test.ts::assertion evidence is met when the file contains the snippet
  - id: C4
    text: Manual criteria are surfaced as manual verdicts, never auto-passed
    verify: test
    evidence: tests/evidence.test.ts::manual criteria yield a manual verdict
  - id: C5
    text: An LLM met/unmet verdict that cites no verifiable file is downgraded to uncertain
    verify: assertion
    evidence: src/llm.ts#downgraded
  - id: C6
    text: Specs are matched to a change through their covers globs
    verify: test
    evidence: tests/covers.test.ts::maps changed files to governing specs
invariants:
  - Deterministic evidence always wins over LLM opinion
  - LLM verdicts must carry file:line citations or become uncertain
non_goals:
  - Running the test suite itself (CI owns execution; we read its JUnit output)
  - Blocking merges (advisory first — earn the right to block)
---

The two-layer verdict model is the heart of the product. Layer one is
deterministic: named tests resolve through JUnit results, assertions through
file content. Layer two is an LLM judging the diff — but only for the gap
layer one can't reach, and only with falsifiable, cited claims.
