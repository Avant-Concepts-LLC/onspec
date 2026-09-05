---
title: "Coding Agent Evaluation Is Splintering Into Smaller Checks"
description: "Recent benchmark churn, open eval releases, and vendor guardrails show coding-agent trust is moving from one score to many small, evidence-anchored checks."
dek: "Benchmarks that used to produce one trusted percentage are now versioned, opened up, and stacked against product-level guardrails. The common thread is that nobody believes a single number anymore."
date: 2026-09-05
readingTime: "4 min read"
tags: ["ai-coding-agents", "benchmarks", "verification", "spec-driven-development"]
sources:
  - n: 1
    title: "Terminal-Bench 4.0"
    publication: "Snorkel AI (Terminal-Bench leaderboard)"
    author: null
    date: 2026-09-01
    url: "https://snorkel.ai/leaderboard/terminal-bench-4-0/"
  - n: 2
    title: "SWE-bench"
    publication: "GitHub (SWE-bench project)"
    author: null
    date: 2026-09-01
    url: "https://github.com/SWE-bench/SWE-bench"
  - n: 3
    title: "Claude Code changelog"
    publication: "Anthropic (Claude Code Docs)"
    author: null
    date: 2026-07-20
    url: "https://code.claude.com/docs/en/changelog"
  - n: 4
    title: "GitHub now sees 2.9 billion commits a month — and it can't keep up"
    publication: "The New Stack"
    author: null
    date: 2026-08-21
    url: "https://thenewstack.io/github-2-9b-monthly-commits/"
---

Four things happened in the last six weeks that look unrelated on their own: a benchmark leaderboard reset for the fourth time, a widely cited eval opened its full task set for local runs instead of asking for trust, a coding assistant's changelog added another narrow permission toggle, and a platform's own outage postmortem disclosed just how much of its traffic is now AI-generated. None of them is a story about one better number. All four are the same story: the industry stopped trying to compress "is this agent's output good" into a single trusted score, and started stacking narrower, evidence-anchored checks instead.

## A leaderboard with a two-month half-life

Terminal-Bench is on its fourth major revision in roughly a year of public use, and the current leader, Claude Code running Fable 5.1, resolves 57.9% of tasks on Terminal-Bench 4.0 at maximum effort [1]. That number will mean very little by the time a reader six months from now looks it up, because the benchmark itself keeps changing the tasks. Each revision exists because agents caught up to the previous one fast enough that the score stopped separating real capability from memorized shape. A percentage that has to be replaced every few months isn't a scoreboard, it's a snapshot, and treating it as anything more durable than that is where a lot of vendor marketing goes wrong.

This isn't a flaw unique to Terminal-Bench. It's what happens to any single aggregate score once enough optimization pressure is pointed at it. The honest response, and the one actually happening, is not to chase a more perfect single number. It's to keep the eval moving and keep publishing the task-level detail underneath the headline percentage, so a score can be checked rather than just cited.

## Handing over the eval instead of asking for trust

SWE-bench took the more direct version of that step. On September 1, 2026, the project's own repository announced that SWE-bench Multimodal v2 is fully open source, with all 480 tasks available for local evaluation [2]. That's a small-sounding change with a specific purpose: instead of publishing a leaderboard number and asking you to believe the harness behind it was run fairly, the project hands you the tasks and lets you run them against your own setup, your own model, your own scaffolding. The evidence moves from a claim to something you can reproduce.

That's the same move a spec-anchored acceptance criterion makes over a plain checkbox in a ticket. "Resolves 73% of issues" is a claim. "Here are the 480 tasks, run them yourself" is evidence. The difference matters more as agent-written code volume grows, because claims don't scale with scrutiny and evidence does.

## Guardrails accumulate instead of consolidating

The same pattern shows up one layer down, at the tool that actually runs an agent's commands. Anthropic's Claude Code changelog for July 20, 2026 added a sandbox.filesystem.disabled setting that lets a team skip filesystem isolation while keeping network egress control, and changed EnterWorktree so it now asks for confirmation before entering a git worktree outside the project's own .claude/worktrees/ directory [3]. Neither change is a headline feature. Both are narrow, specific permission points added to a list that keeps growing release over release.

There is no single setting in that changelog that says "trust this agent" and turns green. There's a sandbox flag for filesystem access, a separate one for network egress, a confirmation step for leaving the expected working directory, and dozens more accumulated over prior releases. The product-level answer to "can I trust what the agent just did" is the same answer the benchmark world landed on: not one gate, many small ones, each anchored to a specific, checkable action.

```json
// .claude/settings.json — narrow, composable permission points,
// not one "trust the agent" toggle
{
  "sandbox": {
    "filesystem": { "disabled": false },
    "network": { "egress": "deny-by-default" }
  },
  "worktree": {
    "confirmOutsideProjectDir": true
  }
}
```

## The volume problem no score was built for

The reason this matters beyond benchmark trivia showed up in GitHub's own account of its August 17, 2026 outage. Reporting on GitHub's postmortem put a number on what "more AI-generated code" actually means at platform scale: roughly 2.9 billion commits a month, with AI-driven growth cited as a direct contributor to the infrastructure strain behind the eight-hour outage [4]. A client-side retry loop then made the recovery worse, but the underlying pressure was volume, and the volume is substantially agent-driven.

At that scale, no leaderboard percentage and no amount of human diff review is the thing standing between an agent's output and what actually ships. Whatever checks a change against intent has to run automatically, on every change, anchored to something concrete, because periodic sampling and spot checks were never built for billions of commits a month. That's the same pressure pushing benchmarks toward reproducible task sets and coding tools toward narrower permission points: aggregate trust doesn't scale, so the industry is replacing it with more numerous, smaller, checkable ones.

- Terminal-Bench reset its task set for the fourth time as agents saturated the previous version within months, not years.
- SWE-bench opened its full 480-task Multimodal v2 set for local evaluation instead of asking teams to trust a reported score.
- Claude Code's changelog kept adding narrow sandbox and confirmation settings rather than one consolidated trust flag.
- GitHub's own outage postmortem quantified how much of its 2.9 billion monthly commits AI-driven growth now accounts for.

onspec sits at the same layer as that last shift: it checks whether code conforms to the specs a team has already approved, criterion by criterion, anchored to test results and file evidence rather than a single pass or fail. It won't write the spec for you, and it isn't a test runner — it's the check that runs after the tests do, on every change, because at agent-driven volume nobody has time to spot-check.
