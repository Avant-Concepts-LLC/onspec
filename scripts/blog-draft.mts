/**
 * Monthly blog draft agent — one script, one workflow, the same shape in every sibling repo
 * (aisuru, avantconcepts, eddiebarretta, onspec, real-estate). The shared architecture is
 * documented in the umbrella repo (~/Websites/home/docs/blog-pipeline.md); this repo's blog doc
 * covers where posts live and how to review a draft.
 *
 *   GitHub Actions (1st of the month) → this script → Claude (web search + structured output)
 *   → SITE ADAPTER writes the post into the repo → the workflow commits to blog/draft-<slug>
 *   and opens a pull request. Nothing publishes without a human merge.
 *
 * Run locally:
 *   npx tsx scripts/blog-draft.mts --dry-run             research + draft, write nothing, print the draft
 *   npx tsx scripts/blog-draft.mts --lookback 60         widen the source-recency window (days)
 *   npx tsx scripts/blog-draft.mts --from-draft d.json   skip research; run the adapter on a saved draft
 *
 * Env: ANTHROPIC_API_KEY (required unless --from-draft), BLOG_MODEL (default claude-sonnet-5),
 *      BLOG_LOOKBACK_DAYS (default 45), BLOG_DRY_RUN=1, BLOG_OUT_DIR (draft.json / summary.json / pr-body.md).
 *
 * Only the block between the SITE ADAPTER markers differs between repos. Everything else is
 * byte-identical across the five repos — fix it in one place, then copy it to the others.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// ───────────────────────────── Shared: the draft contract ─────────────────────────────

/** "code": text is the code, items[0] is the language. Sites opt in via SITE.blockTypes. */
type BlockType = "lead" | "h2" | "p" | "pull" | "list" | "code" | "closing";

interface DraftSource {
  id: string;
  title: string;
  publication: string;
  author: string | null;
  /** YYYY-MM-DD */
  date: string;
  url: string;
}

interface DraftBlock {
  type: BlockType;
  /** Copy for every type except "list". May contain [cite:id] markers. */
  text: string;
  /** Bullet items for "list" blocks; [] otherwise. */
  items: string[];
}

interface Draft {
  slug: string;
  title: string;
  dek: string;
  description: string;
  tags: string[];
  sources: DraftSource[];
  blocks: DraftBlock[];
}

const ALL_BLOCK_TYPES: BlockType[] = ["lead", "h2", "p", "pull", "list", "code", "closing"];
const MAX_SEARCHES = 8;

/**
 * Read a voice guide out of a markdown file, dropping the human-facing header so only the
 * guide itself reaches the prompt. Markdown rather than a TypeScript constant on purpose: the
 * script runs under tsx in five repos whose tsconfig `include` patterns differ, and a plain
 * file read behaves the same in all of them.
 */
function loadVoice(file: string): string {
  const src = fs.readFileSync(file, "utf8");
  const start = src.search(/^VOICE\b/m);
  return (start === -1 ? src : src.slice(start)).trim();
}

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["slug", "title", "dek", "description", "tags", "sources", "blocks"],
  properties: {
    slug: { type: "string", description: "kebab-case, 3-6 words" },
    title: { type: "string", description: "concrete and specific; no colons, no clickbait" },
    dek: { type: "string", description: "one or two sentences shown under the title" },
    description: { type: "string", description: "meta description, under 160 characters" },
    tags: { type: "array", items: { type: "string" } },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "publication", "author", "date", "url"],
        properties: {
          id: { type: "string", description: "short kebab-case handle used in [cite:id] markers" },
          title: { type: "string" },
          publication: { type: "string" },
          author: { type: ["string", "null"] },
          date: { type: "string", description: "publication date, YYYY-MM-DD" },
          url: { type: "string" },
        },
      },
    },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text", "items"],
        properties: {
          type: { type: "string", enum: ALL_BLOCK_TYPES },
          text: { type: "string", description: "the copy; for code blocks, the code itself; empty for list blocks" },
          items: { type: "array", items: { type: "string" }, description: "bullet items for list blocks; [language] for code blocks; [] otherwise" },
        },
      },
    },
  },
} as const;

// ═══════════════════════════ SITE ADAPTER: onspec ═══════════════════════════
// Everything between these markers is repo-specific: where posts live, the site brief, the
// research scope, the voice, and how a draft becomes a file in this repo.

import { buildBlog } from "./build-blog.mts";

const POSTS_DIR = "content/posts";
const VOICE_FILE = "content/voice.md";

const SITE = {
  name: "onspec",
  url: "https://onspec.sh",
  blogPath: "/blog",
  voiceFile: VOICE_FILE,
  brief:
    "onspec is an open-source, git-native verification layer for spec-driven development (npm package `onspec`, GitHub Action `Avant-Concepts-LLC/onspec@v1`, MIT). Specs are markdown files with YAML frontmatter in the repo's specs/ directory; every change gets a met / unmet / uncertain verdict per acceptance criterion, anchored to test results and file evidence, with an LLM judgment only where deterministic evidence is missing; code that no approved spec governs is flagged as drift. The blog is for engineers and engineering leads adopting spec-driven development with AI coding agents.",
  research: `Find 3-5 high-quality, primary-source articles on ONE coherent topic in: spec-driven development practice and tooling (GitHub Spec Kit, AWS Kiro, Cursor rules, Claude Code and CLAUDE.md conventions, Tessl, BMAD), reliability and evaluation of AI coding agents, verifying or testing AI-generated code, requirements traceability and acceptance criteria, CI conformance checks, or postmortems where shipped code drifted from intent.\nWhere the good material lives: arXiv and conference papers, a benchmark\u0027s own paper, repo or leaderboard (SWE-bench, Terminal-Bench, Aider), official docs, changelogs and release notes, first-party engineering blogs from the labs and companies doing the work (Anthropic, OpenAI, GitHub, Google, JetBrains, Sourcegraph, Cursor), named practitioners writing under their own byline, and conference talks.\nDo NOT cite a page just because it summarizes the field. "Best AI coding agents 2026", "top 10 benchmarks" and "state of AI-generated code" pages, and vendor guides about a problem that vendor sells a product for, are content marketing: go to the paper, leaderboard or announcement they are describing and cite that instead. A benchmark score must come from the benchmark, not from a page quoting it.`,
  writing: loadVoice(VOICE_FILE),
  words: [800, 1200] as const,
  blockTypes: ["lead", "h2", "p", "list", "code", "closing"] as BlockType[],
  checklist: [
    "Code and spec examples are correct (spec frontmatter matches the docs page)",
    "Claims about other tools are accurate as of the source dates",
    "The closing is honest about what onspec does and does not do",
  ],
  lint(_draft: Draft): string[] {
    return [];
  },
};

function existingPosts(): { title: string; date: string }[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const out: { title: string; date: string }[] = [];
  for (const f of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
    const title = raw.match(/^title:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, "");
    const date = raw.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?\s*$/m)?.[1] ?? "";
    if (title) out.push({ title, date });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Draft → markdown with frontmatter (scripts/build-blog.mts renders it into site/blog/). */
function buildMarkdown(draft: Draft, today: string, words: number): string {
  const n = new Map(draft.sources.map((s, i) => [s.id, i + 1]));
  const cite = (t: string) => t.replace(/\s*\[cite:([a-z0-9-]+)\]/g, (_, id: string) => (n.has(id) ? ` [${n.get(id)}]` : ""));
  const body = draft.blocks
    .map((b) => {
      switch (b.type) {
        case "h2": return `## ${b.text}`;
        case "list": return b.items.map((it) => `- ${cite(it)}`).join("\n");
        case "code": return `\`\`\`${b.items[0] ?? ""}\n${b.text}\n\`\`\``;
        default: return cite(b.text);
      }
    })
    .join("\n\n");
  const sources = draft.sources
    .map((s, i) => `  - n: ${i + 1}\n    title: ${JSON.stringify(s.title)}\n    publication: ${JSON.stringify(s.publication)}\n    author: ${s.author ? JSON.stringify(s.author) : "null"}\n    date: ${s.date}\n    url: ${JSON.stringify(s.url)}`)
    .join("\n");
  return `---
title: ${JSON.stringify(draft.title)}
description: ${JSON.stringify(draft.description)}
dek: ${JSON.stringify(draft.dek)}
date: ${today}
readingTime: ${JSON.stringify(readingTime(words))}
tags: [${draft.tags.map((t) => JSON.stringify(t)).join(", ")}]
sources:
${sources}
---

${body}
`;
}

/** Write content/posts/<slug>.md, then re-render site/blog/. Returns the files touched. */
function writePost(draft: Draft, today: string, words: number): string[] {
  const file = path.join(POSTS_DIR, `${draft.slug}.md`);
  if (fs.existsSync(file)) throw new Error(`${file} already exists`);
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(file, buildMarkdown(draft, today, words));
  return [file, ...buildBlog()];
}

// ═══════════════════════════ END SITE ADAPTER ═══════════════════════════

// ───────────────────────────── Shared: pipeline ─────────────────────────────

function parseArgs(argv: string[]) {
  const out = { dryRun: false, lookback: 0, fromDraft: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--lookback") out.lookback = parseInt(argv[++i] ?? "", 10);
    else if (a === "--from-draft") out.fromDraft = argv[++i] ?? "";
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const readingTime = (words: number) => `${Math.max(1, Math.round(words / 220))} min read`;
const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;
const allText = (d: Draft) => d.blocks.map((b) => (b.type === "list" ? b.items.join(" ") : b.type === "code" ? "" : b.text)).join(" ");
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 6).join("-");

function buildPrompt(opts: { existing: { title: string; date: string }[]; today: string; cutoff: string; lookbackDays: number }) {
  const allows = (t: BlockType) => SITE.blockTypes.includes(t);
  return `You are the research and drafting agent for the ${SITE.name} blog (${SITE.url}${SITE.blogPath}). ${SITE.brief}

TODAY'S DATE: ${opts.today}
PUBLICATION CUTOFF: only cite sources published on or after ${opts.cutoff} (the last ${opts.lookbackDays} days). This is a HARD requirement.

STEP 1 — RESEARCH (use the web_search tool; several queries, up to ${MAX_SEARCHES}):
${SITE.research}

Source discipline:
- Append "after:${opts.cutoff}" to search queries.
- For each candidate source, confirm its publication date from the page or the result. If you cannot confirm the date is on or after ${opts.cutoff}, DROP the source. Do not guess.
- When a page repeats data that someone else published first, follow it back and cite the original publisher, not the summary.
- Every source must be one of: the organization that produced the data or made the announcement, a peer-reviewed or working paper, or an established news outlet reporting it. A company's own blog counts only for that company's own news.
- Reject content marketing on sight, however well written: SEO "guides", "state of X 2026" roundups, statistics-listicles, and posts on a vendor's blog about a problem that vendor happens to sell software for. If a page's numbers have no named, linked origin, it is not a source.
- If fewer than 3 qualifying sources exist, narrow to a related sub-topic rather than citing stale material.

EXISTING POST TITLES (do not repeat these topics):
${opts.existing.length ? opts.existing.map((p) => `- ${p.title} (${p.date})`).join("\n") : "(none yet)"}

STEP 2 — WRITE the post, synthesizing across ALL sources (never a source-by-source summary):
${SITE.writing}
- ${SITE.words[0]}-${SITE.words[1]} words across the blocks.
- Structure: one "lead" block (the thesis, no throat-clearing), then 2-4 "h2" sections of "p" blocks${allows("pull") ? ', at most one "pull" block (a single-sentence pull quote)' : ""}${allows("list") ? ', a "list" block where a short bulleted list beats a paragraph' : ""}${allows("code") ? ', a "code" block where a concrete example strengthens the point ("text" is the code, "items" is [language])' : ""}, ending with one "closing" block of one or two sentences.
- Allowed block types: ${SITE.blockTypes.join(", ")}. "text" carries the copy for every type except "list", which uses "items" (leave "text" empty there). Set "items" to [] for every other block${allows("code") ? " except code" : ""}.
- Citations: place a marker like [cite:source-id] immediately after the claim it supports. Every marker's id must exist in "sources". Cite generously: every number and every industry fact gets a marker.
- "sources": "id" is a short kebab-case handle; "date" is the source's publication date as YYYY-MM-DD; "author" is null when unknown; "url" is the page you actually read.
- "slug": kebab-case, 3-6 words. "description": under 160 characters. "dek": one or two sentences shown under the title. "tags": 2-4 short labels.

STEP 3 — Return the finished post in the required JSON shape and nothing else.`;
}

/**
 * Pull the draft object out of the model's text.
 *
 * A web-search turn returns several text blocks — the running commentary between searches and
 * then the final JSON — and the commentary can itself contain braces. Slicing from the first "{"
 * to the last "}" therefore grabs the wrong span. Instead, scan for balanced top-level objects
 * (string- and escape-aware) and take the last one that parses and has a draft's shape.
 */
function extractDraftJson(text: string): Draft {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      } else if (depth < 0) depth = 0;
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]) as Draft;
      if (Array.isArray(parsed.blocks) && Array.isArray(parsed.sources)) return parsed;
    } catch {
      // Not this one — keep looking backwards.
    }
  }
  throw new Error(`No draft JSON in the model output (${candidates.length} balanced object(s) in ${text.length} chars; see raw.txt)`);
}

async function researchAndDraft(opts: { existing: { title: string; date: string }[]; today: string; cutoff: string; lookbackDays: number; model: string; outDir: string }): Promise<Draft> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(opts) }];
  let message: Anthropic.Message | undefined;
  // Server-side web search runs its own sampling loop; a long research turn can come back as
  // pause_turn. Re-send the conversation as-is and the server resumes where it left off.
  for (let turn = 0; turn < 4; turn++) {
    const stream = client.messages.stream({
      model: opts.model,
      max_tokens: 32000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
      output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages,
    });
    message = await stream.finalMessage();
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content as unknown as Anthropic.ContentBlockParam[] });
  }
  if (!message) throw new Error("No response from the model");
  if (message.stop_reason === "refusal") throw new Error(`Model refused: ${message.stop_details?.explanation ?? "(no explanation)"}`);
  if (message.stop_reason === "max_tokens") throw new Error("Model output was truncated at max_tokens");
  const u = message.usage;
  console.error(`[blog-draft] ${opts.model}: ${u.input_tokens} in / ${u.output_tokens} out, ${u.server_tool_use?.web_search_requests ?? 0} web searches, stop=${message.stop_reason}`);

  const text = message.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  // Always kept, so a parse failure is debuggable from the workflow's run artifact.
  fs.writeFileSync(path.join(opts.outDir, "raw.txt"), text);
  return extractDraftJson(text);
}

/** Normalize the draft in place and return what a reviewer should know. Throws only when the post is unusable. */
function validateDraft(draft: Draft, cutoff: string): { words: number; warnings: string[] } {
  const warnings: string[] = [];
  if (!draft.title?.trim() || !draft.dek?.trim() || !draft.description?.trim()) throw new Error("Draft is missing title, dek or description");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug ?? "")) {
    draft.slug = slugify(draft.title);
    warnings.push(`Slug was invalid; derived "${draft.slug}" from the title`);
  }
  if (draft.description.length > 160) warnings.push(`Meta description is ${draft.description.length} characters (target under 160)`);
  draft.tags = [...new Set((draft.tags ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 4);

  const kept: DraftSource[] = [];
  for (const s of draft.sources ?? []) {
    if (!/^https?:\/\//.test(s.url ?? "")) { warnings.push(`Dropped source "${s.id}": not an http(s) URL`); continue; }
    const day = /^\d{4}-\d{2}-\d{2}$/.test(s.date ?? "") ? s.date : "";
    if (!day) warnings.push(`Source "${s.id}" has no parseable date (${JSON.stringify(s.date)}); verify it by hand`);
    else if (day < cutoff) { warnings.push(`Dropped source "${s.id}" dated ${day}, before the ${cutoff} cutoff`); continue; }
    kept.push({ ...s, author: s.author || null });
  }
  draft.sources = kept;
  if (kept.length < 2) throw new Error(`Only ${kept.length} usable source(s) after the date cutoff — not publishing`);

  const ids = new Set(kept.map((s) => s.id));
  const scrub = (t: string) => t.replace(/\[cite:([a-z0-9-]+)\]/g, (m, id: string) => (ids.has(id) ? m : ""));
  const blocks: DraftBlock[] = [];
  for (const raw of draft.blocks ?? []) {
    let type: BlockType = ALL_BLOCK_TYPES.includes(raw.type) ? raw.type : "p";
    let text = type === "code" ? (raw.text ?? "") : scrub(raw.text ?? "");
    let items = (raw.items ?? []).map((s) => (type === "code" ? s : scrub(s))).filter(Boolean);
    if (type === "list" && !SITE.blockTypes.includes("list")) { type = "p"; text = items.join(" "); items = []; }
    if (type === "code" && !SITE.blockTypes.includes("code")) { warnings.push("Dropped a code block (not supported on this site)"); continue; }
    if (!SITE.blockTypes.includes(type)) type = "p";
    if (type === "code") items = items.slice(0, 1);
    else if (type !== "list") items = [];
    if (type === "list" ? items.length === 0 : !text.trim()) continue;
    blocks.push({ type, text: type === "code" ? text.replace(/\s+$/, "") : text.trim(), items });
  }
  draft.blocks = blocks;
  if (blocks.length < 4) throw new Error(`Draft has only ${blocks.length} content blocks`);
  if (blocks[0].type !== "lead") warnings.push("Draft does not open with a lead block");

  const words = countWords(allText(draft));
  if (words < 600) throw new Error(`Draft too short: ${words} words`);
  if (words < SITE.words[0] || words > SITE.words[1] * 1.3) warnings.push(`Draft is ${words} words (target ${SITE.words[0]}-${SITE.words[1]})`);
  // Only meaningful on sites that render inline citations; where the voice guide tells the agent
  // to omit markers entirely, an empty set means "sources are further reading", not a problem.
  const cited = new Set([...allText(draft).matchAll(/\[cite:([a-z0-9-]+)\]/g)].map((m) => m[1]));
  if (cited.size) for (const s of kept) if (!cited.has(s.id)) warnings.push(`Source "${s.id}" is listed but never cited in the text`);
  warnings.push(...SITE.lint(draft));
  return { words, warnings };
}

function prBody(opts: { draft: Draft; words: number; warnings: string[]; cutoff: string; lookbackDays: number; model: string }) {
  const { draft } = opts;
  const checks = [
    "Every source URL loads and says what the post claims",
    "No source is content marketing: an SEO guide, a statistics roundup, or a vendor blog recycling someone else's numbers",
    `Source dates are on or after ${opts.cutoff} (no stale sources dressed as new)`,
    `Voice matches \`${SITE.voiceFile}\``,
    ...SITE.checklist,
    "Title, meta description and slug are sharp",
    `Preview deploy renders ${SITE.url}${SITE.blogPath}/${draft.slug}`,
  ];
  return [
    "Auto-generated draft from the monthly blog agent (`scripts/blog-draft.mts` via `.github/workflows/blog-draft.yml`). Nothing publishes until this PR is merged; edit the post in place if it needs changes.",
    "",
    "**Review before merging**",
    ...checks.map((c) => `- [ ] ${c}`),
    ...(opts.warnings.length ? ["", "**Agent warnings**", ...opts.warnings.map((w) => `- Warning: ${w}`)] : []),
    "",
    `Slug \`${draft.slug}\` · ${opts.words} words · ${draft.sources.length} sources · ${opts.model} · lookback ${opts.lookbackDays}d`,
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun || process.env.BLOG_DRY_RUN === "1";
  const lookbackDays = Math.max(7, args.lookback || parseInt(process.env.BLOG_LOOKBACK_DAYS || "45", 10) || 45);
  const model = process.env.BLOG_MODEL || "claude-sonnet-5";
  const outDir = process.env.BLOG_OUT_DIR || path.join(os.tmpdir(), "blog-draft");
  fs.mkdirSync(outDir, { recursive: true });

  const now = new Date();
  const today = isoDay(now);
  const cutoff = isoDay(new Date(now.getTime() - lookbackDays * 86400000));
  const existing = existingPosts();

  const draft: Draft = args.fromDraft
    ? (JSON.parse(fs.readFileSync(args.fromDraft, "utf8")) as Draft)
    : await researchAndDraft({ existing, today, cutoff, lookbackDays, model, outDir });
  if (existing.some((p) => p.title.toLowerCase() === draft.title.toLowerCase())) throw new Error(`Draft duplicates an existing title: ${draft.title}`);
  const { words, warnings } = validateDraft(draft, cutoff);
  fs.writeFileSync(path.join(outDir, "draft.json"), JSON.stringify(draft, null, 2));

  const files = dryRun ? [] : writePost(draft, today, words);
  const summary = { slug: draft.slug, title: draft.title, words, sources: draft.sources.length, files, dryRun, warnings, model, lookbackDays, cutoff };
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, "pr-body.md"), prBody({ draft, words, warnings, cutoff, lookbackDays, model }));

  console.error(`[blog-draft] ${dryRun ? "DRY RUN — " : ""}"${draft.title}" (${draft.slug}) · ${words} words · ${draft.sources.length} sources`);
  for (const w of warnings) console.error(`[blog-draft] warning: ${w}`);
  if (files.length) console.error(`[blog-draft] wrote ${files.join(", ")}`);
  console.error(`[blog-draft] outputs in ${outDir}`);
  if (dryRun) console.log(JSON.stringify(draft, null, 2));
}

main().catch((err) => {
  console.error(`[blog-draft] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
