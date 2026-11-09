# onspec → NSF PESOSE Track 1: concept note (draft, 2026-11-09)

_Status: **draft for FL FAST review, not a proposal.** Program research and why this fits: `home/docs/government-funding-2026-11-09.md`. The gate we do not yet pass is the 3–5 letters of collaboration from outside users; see §6._

## 1. The program in one paragraph

NSF's **Pathways to Enable Secure Open-Source Ecosystems** (PESOSE, solicitation NSF 26-506) funds the *ecosystem* around an existing open-source product, not the product itself. **Track 1 (scoping and planning)** pays up to **$300,000 for one year** to work out governance, community, sustainability and a security plan for an ecosystem that could form around the product, with mandatory I-Corps-style customer discovery. About 30 Track 1 awards a year. For-profit US small businesses are eligible proposers; the PI must be a US-resident employee of the company; there is no SBIR-style primary-employment percentage in the solicitation text we read (confirm with the program officer). Deadlines: **March 2, 2027**, then the first Tuesday of September each year (**September 7, 2027**). No letter of intent. Every proposal must point to a public open-source product, describe its development and testing model, dissemination, user base and contributor base, and attach **three to five letters of collaboration from current users or contributors who are not on the team**. Project description: 7 pages.

## 2. The product (exists, public)

**onspec** is a CLI and GitHub Action that verifies a spec document (Markdown with YAML frontmatter, `specs/*.spec.md`) against the code in a pull request and returns a met / unmet / uncertain verdict per acceptance criterion, with the evidence. It is the back half of spec-driven development: everyone generates code from specs (Claude Code, Cursor, Kiro, Spec Kit); onspec proves the code *stays* true to the spec, PR after PR. Two-layer verdicts: deterministic first (JUnit results and file assertions are the verdict), a language model only for the gap, with mandatory `file:line` citations. `drift` flags changed code no approved spec governs; `lint` grades specs for verifiability; `reverse` drafts specs from an existing codebase.

- **Public, MIT**, repo `Avant-Concepts-LLC/onspec` (since 2026-08-25), npm package `onspec` (v1.2.0), GitHub Action `@v1`, GitLab CI template, site onspec.sh with a monthly researched blog post.
- **Development and testing model:** the repo's own six specs verify the repo's own code in CI (dogfooded); releases are CI-built and published to npm through **Trusted Publishing (OIDC, no long-lived token)**; a `vX.Y.Z` tag runs tests, publishes and moves the `v1` Action tag.
- **Data handling, documented:** with no API key onspec makes no network calls; with a key it sends only the diff and the governing spec text, from the user's own runner under the user's own account; onspec has no server.
- **Validated on a stranger's codebase:** `reverse` drafted specs for unjs/defu (20 criteria, 19 anchored to existing tests, 0 hallucinated pointers).

## 3. Where the ecosystem stands (honest)

| | 2026-11-09 |
|---|---|
| GitHub stars / forks | 0 / 0 |
| Contributors | 1 (the founder) |
| npm downloads | 540 since 2026-08-01; 22 in the last 30 days (mostly our own CI) |
| Known outside users | none confirmed |
| Marketplace listing | not yet (on the to-do list) |

This is the point of Track 1: the solicitation funds *discovering* whether an ecosystem can form, and it sets no minimum user count. But the letters of collaboration require real outside users, so §6 comes first.

## 4. The ecosystem we would scope

Spec-driven development has a front half everyone builds (prompt → plan → code) and no shared back half. Three public goods could sit there, and none should belong to one vendor:

1. **An interoperable spec format.** Markdown plus a small YAML frontmatter (`covers` globs, criteria with `verify: test | assertion | manual` and evidence pointers, invariants, non-goals, `refs` to issue trackers). Today it is onspec's format; the ecosystem question is whether Spec Kit, Kiro, Cursor and Claude Code users will converge on one that any verifier can check.
2. **The verifier as shared CI infrastructure**, deterministic where it can be, cited where it cannot, with a published data-handling contract.
3. **A public eval corpus of (spec, diff, known-correct verdict) triples.** "Who checks the checker" is the question every LLM-in-CI tool dodges. A shared benchmark lets any verifier prove it does not regress and lets teams compare verifiers. This is the piece most clearly a public good, and the one a single company cannot credibly own.

Track 1 activities, mapped to what the solicitation asks for:

- **Ecosystem discovery (I-Corps for PESOSE):** 50–100 interviews with teams already generating code with agents. Hypotheses to kill or keep: teams will write specs *because* the verifier exists (the roadmap's core bet); drift flags are tolerable below some false-positive rate; the Action is retained at 90 days. These are Phase 2 of the existing roadmap, so the grant funds work we planned and could not afford to do properly.
- **Governance:** move from single-maintainer-in-an-LLC to a documented model: a steering group drawn from design-partner teams, an RFC process for spec-format changes, a contributor ladder, and a decision, with evidence, between a neutral home (foundation or a multi-stakeholder org) and company-held code with open governance.
- **Sustainability:** test the MIT-core-plus-commercial-memory model (history, catalog, hosted verdicts) against alternatives (support, sponsorship, foundation membership) with the interviewed teams.
- **Security plan** (the "secure" in PESOSE): the verifier runs in CI with the diff and, optionally, an API key. Plan: signed releases and SLSA provenance on top of the existing OIDC publishing; pinned Action tags with a documented rotation; a vulnerability disclosure policy; a dependency and review policy for a multi-contributor project; an audit of what the LLM path may ever receive, with the data-handling contract as a tested invariant (a spec, verified by onspec).
- **Community infrastructure:** the Marketplace listing, docs on onspec.sh (format reference, verdict semantics, CI recipes), a contributor guide, and the first public release of the eval corpus with a contribution process.
- **Deliverable:** an ecosystem plan that a Track 2 proposal (up to $1.5M over two years) would execute, or an honest finding that the ecosystem is not there.

## 5. Team and budget shape

Benjamin Subercaseaux (PI), 20+ years of production software and AI product leadership (sole product and engineering lead at an AI SaaS startup; engineering lead at Oracle Recruiting Cloud; most recently enterprise AI analytics and governance). Track 1 budget, roughly: PI time, a part-time community/developer-relations lead, the I-Corps for PESOSE participation and travel, eval-corpus infrastructure, design-partner workshops, and an open-source governance advisor as a consultant. Avant Concepts LLC is a US small business; the proposal needs a SAM.gov UEI (start now, it takes weeks) and a Research.gov account.

## 6. What has to happen before a proposal

1. **Three to five real outside users** who will sign letters of collaboration. The route is the roadmap's design-partner search: teams already generating code with Claude Code or Cursor, offered proof that the code still matches the plan next month. The GitHub Marketplace listing and the reply in the Spec Kit "verify step" discussion are the two cheapest sources of first users; both are on the outstanding list.
2. **A program-officer conversation** on two questions: is a one-person for-profit with a young product a credible Track 1 proposer, and does the PI need a primary-employment share.
3. **Decision in January 2027:** write for March 2 if the letters exist; otherwise target September 7, 2027 and spend the spring on users.

FL FAST (free, statewide) reviews concept notes and connects to universities; the hand-off email is drafted in Ben's Gmail.
