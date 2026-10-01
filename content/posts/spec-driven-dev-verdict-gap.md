---
title: "The Spec-Driven Ecosystem Keeps Hand-Rolling Verdict Labels"
description: "Spec Kit's backlog, an agent-drift bot, and fresh research all reinvent evidence-based verdicts for AI-generated code, but none ship it as a built-in feature."
dek: "Across Spec Kit's backlog, an agent-drift bot, and new enforcement research, teams are rebuilding the same evidence-based verdict by hand instead of shipping it as a feature."
date: 2026-10-01
readingTime: "4 min read"
tags: ["spec-driven-development", "github-spec-kit", "agent-drift", "verification"]
sources:
  - n: 1
    title: "Open issues · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-09-30
    url: "https://github.com/github/spec-kit/issues"
  - n: 2
    title: "Releases · github/spec-kit"
    publication: "GitHub (spec-kit repository)"
    author: null
    date: 2026-09-08
    url: "https://github.com/github/spec-kit/releases"
  - n: 3
    title: "Agent Drift Detected - 2026-09-07 · Issue #5642 · rjmurillo/ai-agents"
    publication: "GitHub (rjmurillo/ai-agents repository)"
    author: "rjmurillo"
    date: 2026-09-07
    url: "https://github.com/rjmurillo/ai-agents/issues/5642"
  - n: 4
    title: "SDAD: Spec-Driven Agentic Development for the AI-Native SDLC"
    publication: "arXiv"
    author: null
    date: 2026-08-01
    url: "https://arxiv.org/pdf/2608.20341"
  - n: 5
    title: "Introducing Consort: A Spec-First Agent Framework for Enforced, Test-Driven Development on Live Database Branches"
    publication: "arXiv"
    author: null
    date: 2026-09-01
    url: "https://arxiv.org/pdf/2609.09671"
---

Every corner of the spec-driven development ecosystem has independently reinvented the same thing this quarter: a label that says whether a claim has evidence behind it. GitHub's own Spec Kit backlog runs on verdict tags. An open source agent-definition project runs a bot that flags drift between agents and their templates. A new enforcement framework in the research literature routes test execution through live database branches instead of trusting an agent's self-report. None of these projects call what they built a verification layer. All of them are building one anyway, by hand, one label and one script at a time.

## The backlog that talks like a spec

GitHub's Spec Kit is the most widely used open source toolkit for spec-driven development, and its own issue triage has quietly converged on verdict language. Maintainers tag backlog items with labels like evidence-backed fix or greenlit feature, land after review, and valid and in-scope but deprioritized, held behind the evidence gate [1]. Those are hand-applied human judgments. There is no conformance checker in the repository producing them; a person reads the issue and decides.

That gap shows up as an actual backlog item, not just a pattern in label text. On September 30, 2026, a contributor opened an extension submission for Conformidad, a conformance-checks add-on for Spec Kit [1]. More than a year after the project's public launch, checking whether shipped code conforms to its own spec is still a proposed community extension, not a core capability.

The releases that did ship that same week were about workflow plumbing: fixing non-ASCII handling in overlay files, stopping a PowerShell crash on non-Latin feature descriptions, adding a DeepSeek harness integration [2]. Useful, necessary work. None of it answers whether the code an agent just wrote matches the spec it was given.

## Automation that can diff but can't judge

Drift detection does exist elsewhere in the ecosystem, just not pointed at code-to-spec conformance yet. An automated workflow in the open source rjmurillo/ai-agents project compares each AI agent's declared role against a shared canonical template and opens an issue when they diverge. On September 7, 2026, it flagged one agent, merge-resolver, at 20.3 percent similarity to its template, with the core-mission and responsibilities sections drifting apart [3].

The bot's own recommended next step is to have a person decide whether that drift is intentional or accidental [3]. That is the honest limit of a similarity score: it can tell you two things no longer match, not which one is right. A percentage is not a verdict.

## Research is moving the judgment into tests, not prompts

The research side is further along on closing that gap than the tooling is. A September 2026 paper describes Consort, a framework that enforces test-driven development against a spec by running tests against live, branched database state rather than letting the agent report its own pass or fail [5]. The judgment comes from execution, not from asking the model if it is done.

The detail that matters in that design is where the check happens. Running assertions against a live, branched copy of real data closes a gap that tests over mocked state tend to leave open: an agent can satisfy a test double without ever proving the spec holds against data shaped like production [5].

That same split between what agents get trusted to judge and what still needs a mechanical check runs through the academic framing of spec-driven development lifecycles more broadly. Agents can draft requirement structures and propose acceptance criteria, but human or verification agents still adjudicate conformance to architecture and coding policy once implementation starts [4]. Conformance checking keeps getting named as a distinct, necessary step, and then left for later.

Put together, the pattern is less about any one project falling short and more about where the industry's attention is actually going. Teams are investing real engineering effort in detecting that something changed; almost none of that effort goes into judging whether the change still satisfies the spec it was supposed to implement. Diffing is cheap and already automated in several places. Adjudication is still manual, and still scattered across whichever tool happened to notice the mismatch first.

Four different projects, built by people who are not coordinating with each other, keep landing on the same shape of solution:

- Spec Kit's own issue triage, where maintainers manually tag backlog items as evidence-backed fixes or hold them behind an evidence gate [1]
- A standalone drift-detection bot that flags agent definitions diverging from a shared template, then asks a human to rule on intent [3]
- A proposed Spec Kit extension for conformance checks, still sitting as an open community submission rather than a shipped feature [1]
- A research framework that swaps agent self-report for test execution against live, branched data [5]

```yaml
agent: merge-resolver
detected: 2026-09-07T09:12:00Z
similarity_to_template: 20.3%
drifting_sections: [core_mission, key_responsibilities]
verdict: uncertain
evidence: diff only, no spec to check against
next_step: human review required
```

onspec does not replace any of this ad hoc machinery; it is what it is reaching for. Every acceptance criterion gets a verdict anchored to test results and file evidence, with an LLM judgment used only where deterministic evidence is missing, and code no approved spec governs gets flagged as drift. It does not write the spec for you, and it is not a test runner. It reads what the spec and the tests already proved, and says plainly what is still unproven.
