---
title: "Checking Code Against the Spec Is Standard Now. Grounding the Verdict Isn't."
description: "Spec Kit's converge step and its extension catalog check code against the spec. What still varies is what a verdict rests on: a model's reading, or a test."
dek: "Spec Kit made assessing code against the spec a core step in June. Across the ecosystem, the open question is what a verdict rests on: a model reading the code, a similarity score, or a test the agent cannot edit."
date: 2026-10-01
updated: 2026-10-05
readingTime: "5 min read"
tags: ["spec-driven-development", "github-spec-kit", "agent-drift", "verification"]
sources:
  - n: 1
    title: "feat: add /speckit.converge command · Pull Request #3001 · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-06-17
    url: "https://github.com/github/spec-kit/pull/3001"
  - n: 2
    title: "templates/commands/converge.md · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-09-18
    url: "https://github.com/github/spec-kit/blob/main/templates/commands/converge.md"
  - n: 3
    title: "fix: clarify converge assessment of completion claims · Pull Request #4621 · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-09-18
    url: "https://github.com/github/spec-kit/pull/4621"
  - n: 4
    title: "extensions/catalog.community.json · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-10-02
    url: "https://github.com/github/spec-kit/blob/main/extensions/catalog.community.json"
  - n: 5
    title: "[Extension]: Conformidad — Software Humano conformance checks · Issue #4803 · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: "Damián Acuña"
    date: 2026-09-30
    url: "https://github.com/github/spec-kit/issues/4803"
  - n: 6
    title: "Agent Drift Detected - 2026-09-07 · Issue #5642 · rjmurillo/ai-agents"
    publication: "GitHub (rjmurillo/ai-agents repository)"
    author: null
    date: 2026-09-07
    url: "https://github.com/rjmurillo/ai-agents/issues/5642"
  - n: 7
    title: "Introducing Consort: A Spec-First Agent Framework for Enforced, Test-Driven Development on Live Database Branches"
    publication: "arXiv"
    author: "Kevin Hartman"
    date: 2026-09-09
    url: "https://arxiv.org/abs/2609.09671"
---

Checking AI-written code against its spec is no longer an idea waiting for a tool. GitHub's Spec Kit made it a core step in June, its community catalog carries a growing shelf of extensions that verify, trace or watch for drift, and a new research framework builds the check into the build itself. What is still unsettled is what a verdict rests on. Across the tools shipping this quarter, a verdict comes from one of three places: a model that reads the code and decides, a script that measures how far two documents have drifted apart, or a test the agent cannot edit.

## Spec Kit's core loop ends in an assessment

Spec Kit added a `/speckit.converge` command in June [1]. It runs after implement, reads `spec.md`, `plan.md` and `tasks.md` as the only source of intent, assesses the current code against every functional requirement, success criterion and acceptance scenario, and classifies each gap as missing, partial, contradicts or unrequested [2]. Remaining work is appended to `tasks.md` as new tasks, each traced to the requirement it came from, and implement and converge alternate until converge has nothing left to append [2].

That is a real conformance check, and in September it got stricter. A change merged on September 18 tells the assessor to include every task regardless of its checkbox, because "completion claims are not evidence" [3]. An agent marking a task done no longer counts as proof that the work exists.

The mechanism is still a model reading code. Converge is a prompt: the assessing agent inventories the requirements, scopes its search to the files the plan and tasks name plus a keyword search, and writes each finding with the file or area it observed [2]. The tests that came with the September change say so plainly. They check that the prompt contains the new instructions, and "do not execute an LLM or assert how an LLM will respond" [3]. That is the right test for a prompt. It also means nothing in the core loop ties a verdict to a test result, and converge says outright that it is not a diff tool: no git, no branch comparison, no history [2].

## The catalog fills in around it

Spec Kit's community catalog listed 178 extensions as of October 2, with 16 tagged traceability, 6 verification and 6 drift [4]. Their own descriptions cover most of what a verification layer does: a post-implementation gate that "validates implemented code against specification artifacts" (verify), CI gates that "check drift, and block merges on gaps" (ci-guard), a requirement-to-test traceability matrix built from `spec.md` and the test suite (trace), and a hunt for "phantom completions," tasks marked done with no implementation behind them (verify-tasks) [4].

The newest entry shows which way some authors lean. Conformidad, submitted September 30 and in the catalog by October 2, checks that a project's spec and plan contain the sections the Software Humano manifesto requires, before implementation starts [4] [5]. It checks documents, not code. But its submission leads with its mechanism: "Deterministic: it runs as a script, not through the agent, so the agent cannot skip it silently" [5]. Its author also reports a bug found in use, a success message that reported green on a project whose governing document was newer than its spec [5]. A deterministic check can still be wrong. When it is, someone can read the script and see why.

## A score is not a verdict

Measurement without judgment shows up outside Spec Kit too. The open source rjmurillo/ai-agents project runs a workflow that compares each Claude agent definition against a shared template and opens an issue when they diverge. On September 7 it flagged one agent, trimmed here from the issue [6]:

```text
### merge-resolver
- **Overall similarity**: 20.3%
- **Drifting sections**: Core Mission, Key Responsibilities, Constraints, Handoff Options, Execution Mindset, Memory Protocol, Handoff Protocol

**Section Details:**
- Core Mission: 0.0% similar
- Key Responsibilities: 0.0% similar
- Constraints: 62.2% similar
```

Six of the seven sections score 0 percent. The issue's recommended next step is "Determine if drift is intentional or accidental," and four weeks later it is still open [6]. The bot is honest about its limit. A similarity score says two files no longer match. It cannot say which one is right, because neither the template nor the agent is a statement of intent that the other can be checked against.

## Research moves the verdict into execution

Consort, described in a September 9 paper, puts the verdict where the agent cannot reach it [7]. The paper sorts spec-first frameworks, naming Spec Kit, obra/superpowers, BMAD and GSD, by how they enforce discipline on the agent: by persuasion (prompt instructions the model may ignore), by front-loaded structure (strong specs, then a trusted build), or through controls the agent cannot edit [7]. Consort takes the third route: a deterministic orchestrator, human-approved gates, immutable tests, and a green result that has to pass against a live, branched database [7]. The paper frames its own claims as a pre-registered, testable hypothesis rather than a measured result [7].

Read against that taxonomy, the ecosystem's checks sit at different points. Converge asks a model to assess honestly and tells it what does not count as evidence. Conformidad and the drift bot are scripts, but they measure documents, not behavior. Consort makes a test result the verdict and keeps the test out of the agent's hands.

## Where the line actually falls

The split that matters is no longer between projects that check and projects that don't. Spec Kit checks, its catalog checks, the bots check. The split is between verdicts a reader can reproduce, such as a test result or a script's output on the same commit, and verdicts that depend on what one model run decided to look at. Both have a place. A model can read requirements no test covers yet, and a test only proves what someone thought to assert. What a team needs is to know which kind of verdict it is looking at.

onspec sits on the reproducible side of that line: each acceptance criterion gets a met, unmet or uncertain verdict anchored to test results and file evidence, an LLM judgment fills in only where that evidence is missing, and code no approved spec governs is flagged as drift. It needs approved specs to check against, and it is not a test runner.

*Correction, October 5, 2026: An earlier version of this post said that checking code against its spec was not a core Spec Kit capability and was still only a proposed community extension. Spec Kit has shipped `/speckit.converge` as a core command since June. That version also described Conformidad as a code conformance check (it checks spec and plan documents against a manifesto), placed a set of Spec Kit fixes in the wrong week, and showed fields the drift bot never reported. The post has been rewritten around what the sources show.*
