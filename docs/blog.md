# Blog

One researched post a month at [onspec.sh/blog](https://onspec.sh/blog) on spec-driven development
and verifying AI-generated code. Drafted by an agent on the 1st and published straight to `main`
(since 2026-09-05; the validator is the gate, the review notes go to the Actions run summary, and
the workflow's `review` input opens a PR instead).

## How it fits the static site

`site/` deploys to Vercel as static files with no build step, so the rendered HTML is committed.

```
content/posts/<slug>.md      the source of truth: frontmatter + markdown body
content/voice.md             editorial voice, injected into the draft agent's prompt
scripts/build-blog.mts       renders posts → site/blog/<slug>.html + site/blog.html, updates site/sitemap.xml
site/blog.html               the index      (generated — do not hand-edit)
site/blog/<slug>.html        one per post   (generated — do not hand-edit)
scripts/blog-draft.mts       the monthly draft agent
```

`npm run build:blog` re-renders everything from `content/posts/`. The generated pages reuse the
tokens, nav and footer of `site/docs.html`, and each carries `BlogPosting` JSON-LD with its sources
as `citation` entries. Sitemap entries are rewritten between the `<!-- blog:start -->` and
`<!-- blog:end -->` markers in `site/sitemap.xml`.

## Writing a post by hand

Create `content/posts/<slug>.md`:

```markdown
---
title: "Concrete, specific title"
description: "Meta description, under 160 characters."
dek: "One or two sentences under the title."
date: 2026-09-01
readingTime: "6 min read"
tags: ["spec-driven development", "evals"]
sources:
  - n: 1
    title: "Source title"
    publication: "Publisher"
    author: null
    date: 2026-08-20
    url: "https://..."
---

Opening paragraph, the thesis, no throat-clearing. [1]

## A section heading

Body text with inline references [1] [2], code fences where an example earns its place.
```

Then `npm run build:blog` and commit both the markdown and the generated HTML.

## The monthly agent

`npm run blog:draft` (or `.github/workflows/blog-draft.yml`, 1st of the month at 13:00 UTC).
Architecture and the shared-script rules are in the umbrella repo's `docs/blog-pipeline.md`. What
is specific here:

- **Research scope**: spec-driven development practice and tooling (GitHub Spec Kit, AWS Kiro,
  Cursor rules, Claude Code conventions, Tessl, BMAD), reliability and evaluation of AI coding
  agents, verifying AI-generated code, requirements traceability, CI conformance checks, and
  postmortems where shipped code drifted from intent.
- **Voice** is `content/voice.md`. The rule that matters: onspec appears only in the closing block,
  and it is honest about what onspec does not do.
- The agent writes the markdown and then runs `buildBlog()`, so a draft PR contains the source and
  the rendered pages together.

```bash
npx tsx --env-file=.env scripts/blog-draft.mts --dry-run
npx tsx --env-file=.env scripts/blog-draft.mts --lookback 90
```

## Reviewing a post (after the fact, or in a PR when dispatched with `review`)

Check every source URL, that claims about other tools are accurate as of their source dates, that
any spec frontmatter in an example matches the docs page, and that the closing does not oversell.
Edit the markdown, re-run `npm run build:blog`, and push (or merge, in review mode).
