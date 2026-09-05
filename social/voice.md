# onspec — social caption voice

Read this before writing any `post.json` caption. Blog voice (the long-form sibling):
`content/voice.md`. Publishing mechanics: `~/Websites/home/docs/social-pipeline.md`.

VOICE — how onspec posts read:
- Written by an engineer who ships, for engineers who ship. Direct, specific, skeptical of hype,
  generous toward genuinely useful tools — including competitors.
- One claim per post, and the claim is a mechanism: a spec file, a failing criterion, a diff, a
  CI step, a verdict. Show it (a terminal or diff image) rather than describe it.
- Plain words: "use" not "utilize", "check" not "validate against", "spec" not "specification
  artifact". No "in the age of AI", no rhetorical-question openers, no emoji, no exclamation marks.
- Honest about the boundary every time onspec is named: it verifies conformance to specs that
  exist; it does not write the spec for you and it is not a test runner.
- Link: `{link}` on every channel — the blog post, the README section, or the repo. X gets the
  link as the last line; LinkedIn and Bluesky the same.
- Length: X ≤ 280 including the link; Bluesky ≤ 300; LinkedIn can run to a short paragraph plus
  a code line, but the first line has to carry it.
- No hashtags on X or Bluesky. LinkedIn: at most two (`#specdrivendevelopment`, `#aicoding`).
- Cadence: one post per blog post (the day it merges) plus release notes for CLI/Action versions.
