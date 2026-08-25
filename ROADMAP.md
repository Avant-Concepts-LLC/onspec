# onspec roadmap

*Last updated: 2026-08-24. This is a direction document, not a promise list. Phases are ordered by dependency, not by calendar.*

## Where we are (v0.1, shipped)

- CLI with five commands: `verify`, `drift`, `lint`, `reverse`, published as [`onspec` on npm](https://www.npmjs.com/package/onspec)
- Two-layer verdict model: deterministic evidence (JUnit results, file assertions) first, LLM assessment only for the gap, with mandatory citations
- GitHub Action posting a self-updating PR conformance comment
- `refs` field tracing specs to issue trackers (Jira keys, URLs)
- Dogfooded: this repo's specs verify this repo's code in its own CI
- Reverse-generation validated on a real brownfield codebase ([unjs/defu](https://github.com/unjs/defu): 20 criteria, 19 anchored to existing tests, 0 hallucinated pointers admitted)
- [onspec.sh](https://onspec.sh) live

**The core bet this roadmap exists to test:** people will write specs *because the verifier exists*. Every phase below either strengthens the verifier or measures that bet.

---

## Phase 1 — Credibility and plumbing

*Make everything that exists trustworthy and takeable-seriously. Mostly small, mostly sequenced.*

- [x] Permanent home: repo lives at `Avant-Concepts-LLC/onspec`; Action `v1` tagged and referenced everywhere (`uses: Avant-Concepts-LLC/onspec@v1`)
- [x] Live LLM paths exercised end-to-end with a real API key: `verify` judged a controlled met/unmet pair correctly with citations; `reverse` drafted a real repo (5 specs, 36 criteria, 32 anchored, 0 hallucinated pointers) — found and fixed a streaming requirement in the process
- [x] Data-handling documentation (README section + site one-liner): what leaves the machine, when, under whose account
- [x] Housekeeping: checkout/setup-node bumped to Node 24 majors
- [x] CI-based npm releases via npm Trusted Publishing (OIDC, no token): push a `vX.Y.Z` tag and CI tests, publishes, and moves the `v1` Action tag
- [ ] Docs on onspec.sh: spec format reference, verdict semantics, CI recipes
- [x] GitLab CI template (`templates/onspec.gitlab-ci.yml`, included via remote URL pinned to `v1`): MR-triggered verify + drift with a self-updating MR note
- [ ] Remaining admin: email on the domain, trademark knockout search before further brand investment

## Phase 2 — Validation with real teams

*Find out whether the product survives contact with repos we don't control.*

- [ ] 3 to 5 design-partner teams already generating code with Claude Code or Cursor. The pitch: "you already generate code from plans; want proof the code still matches the plan next month?"
- [ ] **The metric that matters: Action retention at 90 days**, not installs. If teams keep it, the rest of this document is fundable; if they don't, we learn why before building more
- [ ] False-positive budget: measure and drive down drift-flag noise. Noisy drift flags are the single fastest way teams turn the tool off
- [ ] Start the verifier eval corpus: (spec, diff, known-correct verdict) triples from real usage. No verifier version ships that regresses on it. This answers "who checks the checker" and compounds into a moat
- [ ] Jira recipe: document the `refs` + Jira automation loop (ticket gets a comment when its spec's criteria go green)

## Phase 3 — Product depth

*The features that make onspec correct at scale, informed by Phase 2 pain.*

- [ ] **Reverse at scale**: chunking strategy for repos too large for one drafting pass; per-directory spec generation with a merge step
- [ ] **Blast radius**: trace what a diff can reach beyond its `covers` globs; flag the untested part of the radius
- [ ] **Spec composition**: precedence rules when multiple specs cover the same path; monorepo `covers` semantics
- [ ] **Autonomy policy**: change-class to merge-gate mapping (docs auto-merge on green; schema and auth always get a human). Makes agent autonomy auditable, which is the enterprise conversation-starter
- [ ] Watch-mode / editor integration exploration: verdicts at edit time, not just PR time
- [ ] **Local MCP server**: expose structured queries to coding agents mid-session ("which spec governs this file?", "would this diff satisfy C3?") so agents self-correct before the PR instead of after the CI comment. Build only once design partners confirm agents want the structured interface over plain CLI calls

## Phase 4 — The commercial layer

*Everything above stays MIT. What gets sold is exactly what the zero-state CLI deliberately doesn't have: memory.*

- [ ] Conformance history and drift trends across time and repos (the dashboard)
- [ ] Org-level spec catalog: approval workflows, ownership, staleness
- [ ] Hosted LLM verdicts for teams without their own API key, backed by the eval corpus
- [ ] Jira import: draft criteria from a ticket's acceptance-criteria field (the Jira sibling of `reverse`)
- [ ] Enterprise traceability: ticket ↔ spec ↔ code ↔ test matrix, audit export, SSO
- [ ] **Remote MCP server**: the org's spec catalog as a queryable API for every developer's agent ("what approved specs cover the billing service?"). The MCP surface becomes the commercial product's API, not a convenience wrapper

**Sequencing rule:** none of Phase 4 gets built until Phase 2's retention signal says the free layer is sticky. Monetizing an unproven wedge burns it.

---

## Open questions being carried, not ignored

1. Spec granularity: what does a 50-spec repo feel like to navigate?
2. Does the conformance comment ever earn the right to block by default?
3. Is `reverse` the on-ramp, or is it the product?
4. How much of spec authoring shifts to agents, and what does the format owe human reviewers vs. machine writers as that shifts?
