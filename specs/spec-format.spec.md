---
id: SPEC-0001
title: Spec files are structured, parseable markdown
status: approved
covers:
  - src/spec.ts
  - src/types.ts
criteria:
  - id: C1
    text: A spec file with valid YAML frontmatter parses into a structured spec object
    verify: test
    evidence: tests/spec.test.ts::parses a valid spec file
  - id: C2
    text: A spec file with invalid frontmatter is collected as a parse error without aborting the load of other specs
    verify: test
    evidence: tests/spec.test.ts::collects parse errors without throwing
  - id: C3
    text: Duplicate criterion ids within one spec are rejected at parse time
    verify: test
    evidence: tests/spec.test.ts::rejects duplicate criterion ids
  - id: C4
    text: Two specs sharing the same spec id are reported as an error and only the first is loaded
    verify: test
    evidence: tests/spec.test.ts::rejects duplicate spec ids across files
invariants:
  - Spec ids follow SPEC-NNNN and criterion ids follow CN
non_goals:
  - Spec formats other than markdown + YAML frontmatter (no JSON, no TOML)
  - Remote or non-repo spec sources
---

Specs are files in the repo — versioned, diffed, and approved through normal
PRs. The parser is deliberately strict about identity (ids, statuses) and
deliberately loose about the body: everything below the frontmatter is
free-form context for humans and LLM assessment.
