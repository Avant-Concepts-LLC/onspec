---
id: SPEC-0005
title: CLI and reporting surface verdicts for humans and CI
status: approved
covers:
  - src/cli.ts
  - src/report.ts
  - src/config.ts
  - src/git.ts
criteria:
  - id: C1
    text: The markdown report renders one table row per criterion with verdict and evidence link
    verify: test
    evidence: tests/report.test.ts::markdown report includes a row per criterion
  - id: C2
    text: Configuration falls back to documented defaults when speccheck.config.json is absent
    verify: test
    evidence: tests/config.test.ts::defaults apply when config file is absent
  - id: C3
    text: In strict mode, verify exits nonzero when any criterion is unmet
    verify: assertion
    evidence: src/cli.ts#if (opts.strict && unmet > 0) process.exit(1);
invariants:
  - Default exit code is 0 (advisory) — blocking is opt-in via --strict
non_goals:
  - Posting PR comments directly (the GitHub Action wrapper owns that)
  - Server-side state of any kind
---

CLI first: runs locally and in any CI. The markdown format exists so a thin
Action/CI wrapper can post the report as a PR comment without reformatting.
