# social/

Per-post manifests for onspec's channels (LinkedIn page, X, Bluesky), published through the shared
pipeline. Doc: `docs/social.md`. Voice: `voice.md`. Fill `channels.json` via `--list-channels`.

```bash
PUB=~/Websites/home/docs/social-pipeline/publish.mts
npx tsx $PUB social/posts/<slug> --dry-run
npx tsx $PUB social/posts/<slug>             # → Postiz draft
```
