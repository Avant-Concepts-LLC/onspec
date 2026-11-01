---
title: "Spec Files Get Schemas. Instruction Files Still Run on Trust"
description: "Spec Kit hardened its spec schema in September 2026, Cursor gave agents more autonomy, and a new CLAUDE.md study found structure doesn't change compliance."
dek: "GitHub Spec Kit is tightening validation on its own spec format while editors give agents more room to act unsupervised. The CLAUDE.md file most teams actually rely on to constrain an agent isn't checked by anything."
date: 2026-11-01
readingTime: "4 min read"
tags: ["spec-driven-development", "claude-code", "ai-coding-agents", "conformance"]
sources:
  - n: 1
    title: "Spec Kit 1.0.5"
    publication: "GitHub (spec-kit)"
    author: null
    date: 2026-09-08
    url: "https://github.com/github/spec-kit/releases/tag/v1.0.5"
  - n: 2
    title: "Changelog · Cursor"
    publication: "Cursor"
    author: null
    date: 2026-08-27
    url: "https://cursor.com/changelog/page/2"
  - n: 3
    title: "CLAUDE.md Best Practices: What the Evidence Supports (2026)"
    publication: "alexdunlop.com"
    author: "Alex Dunlop"
    date: 2026-10-28
    url: "https://www.alexdunlop.com/writing/claude-md-best-practices"
  - n: 4
    title: "SWE-bench Verified Leaderboard and Methodology"
    publication: "Vals AI"
    author: null
    date: 2026-09-01
    url: "https://www.vals.ai/benchmarks/swebench"
---

GitHub's Spec Kit shipped eleven patch releases in September 2026 alone, and several of them close gaps in its own file format: a malformed step configuration that used to pass silently now gets rejected before a task is ever generated, and task output now has to carry the field constraints a spec's data model actually declares [1]. That is a tool getting stricter about the files it reads. Most teams running coding agents are not writing in Spec Kit's schema, though. They are writing a CLAUDE.md, a rules file, or a system prompt, and nothing checks whether the agent read it, let alone did what it said.

## The spec format is getting pickier

Spec Kit's v1.0.5 release, tagged September 8, 2026, rolled in fixes that are boring in the best way: reject a non-mapping step.yml instead of accepting it and failing somewhere downstream, require a 'steps' body on while and do-while loops instead of letting an empty one slip through, and require that tasks generated from a spec carry the field constraints its data-model.md actually declares [1]. None of these fixes touch whether the generated code is correct. They touch whether the spec file is well-formed enough for the tool to act on at all. That is a lower bar than correctness, but until recently it was not enforced either. Each one closes a case where a spec could previously look valid to a human, get fed to the tool, and only break when something tried to act on it later.

The pattern continued through the month. September was the first full month on the v1.0.x line, and the project used patch releases rather than feature drops to keep tightening the workflow engine, the extension catalog, and the cross-platform install path [1]. The direction is the same throughout: a spec stops being prose a human has to parse by eye and becomes a document a parser can reject.

## Editors give agents more room, not more checks

Cursor moved the opposite direction in the same window. An August 17, 2026 changelog entry added steering: you can now send a running agent a follow-up message without stopping it, and the message waits for the next tool call instead of interrupting mid-action [2]. Ten days later, self-hosted workers got computer use on Linux and Mac, so an agent can drive a desktop session unattended [2]. Both changes expand what an agent does between the moments a human looks at the screen. Neither adds a check on whether what happened in that stretch matched any rule the team wrote down.

## The file everyone actually relies on is not checked at all

CLAUDE.md is the closest thing most teams have to a project-specific spec for their coding agent, and a close read of it published October 28, 2026 found that the usual advice mostly fixes the wrong problem. Testing one checkable rule across 1,650 Claude Code runs, the piece found that CLAUDE.md length and layout did not change whether the rule was followed, and that the 200-line target in Anthropic's own docs describes auto-memory's MEMORY.md, not CLAUDE.md, which loads in full regardless of size [3]. Its sharpest line: "A NEVER line in CLAUDE.md is a request" [3]. Nothing in the pipeline turns that request into a check against what the model actually did.

Benchmarks have converged on a different, narrower thing to check. As of September 1, 2026, the top model on SWE-bench Verified clears 97.00 percent under one standardized harness [4]. That number says a patch passed a hidden test suite. It says nothing about whether the agent that wrote it respected a team's own naming convention, touched a directory it was told to leave alone, or satisfied an acceptance criterion that exists in exactly one spec file in exactly one repo. No public benchmark could encode that, and no instruction file currently checks it either. A score on a shared benchmark and a verdict on a team's own spec are measuring different things, and treating the first as a proxy for the second is where drift gets missed.

- Spec Kit's workflow schema: validated when the spec is authored, before a task exists [1]
- SWE-bench Verified's hidden tests: validated after the patch lands, against a fixed public task, not a team's own rules [4]
- Cursor's steering and computer-use updates: expand what an agent does unattended, with no new check on whether it stayed in bounds [2]
- A CLAUDE.md line like "tests must pass before committing": restated to the model every run, never verified against the diff [3]

```markdown
## Project rules
- NEVER modify files under /infra without human review
- All new endpoints need an integration test
- Follow the existing error-handling pattern in src/errors.ts
```

onspec sits at the layer under the instruction file. It does not write the CLAUDE.md or the spec, and it is not a test runner. It reads an approved spec's acceptance criteria against the diff and the test results and returns a met, unmet, or uncertain verdict per criterion, so a line like "never touch /infra" stops being something the agent is asked to remember and becomes something CI checks.
