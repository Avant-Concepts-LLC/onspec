# Social

onspec posts to **LinkedIn (company page), X, and Bluesky** — text plus a terminal/diff image,
one post per merged blog post and one per CLI/Action release. Instagram, TikTok and YouTube are
out of scope: the audience is engineers, and the content is a mechanism, not a mood.

Everything mechanical is shared with the other brands and documented once:
`~/Websites/home/docs/social-pipeline.md`. In this repo:

```
social/voice.md              caption voice — read before drafting
social/channels.json         Postiz integration ids (fill via --list-channels)
social/posts/<slug>/post.json    one manifest per post; published.json beside it is the log
```

## Accounts (none exist on 2026-09-05)

| Platform | Create as | Handle |
|---|---|---|
| LinkedIn | Company page "onspec" under Avant Concepts LLC's admin | `linkedin.com/company/onspec` (or `onspec-sh` if taken) |
| X | Standard account | `@onspec_sh` (`@onspec` if free) |
| Bluesky | Custom handle on the domain | `@onspec.sh` — set the `_atproto` TXT record on the domain |

Display name is `onspec` everywhere, lowercase, no period. Bio: "Specs that refuse to drift.
Git-native verification for spec-driven development." Link: `https://onspec.sh`.

## First post

The day the next blog post merges: first line = the post's thesis in one sentence, second line =
the one concrete thing the reader can run, last line = `{link}` to the post. `--dry-run`, then
plain (draft), then review in Postiz.
