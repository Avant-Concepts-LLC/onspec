/**
 * Renders content/posts/*.md into the static site: site/blog.html (the index) and
 * site/blog/<slug>.html (one per post), and refreshes the blog entries in site/sitemap.xml.
 * The site deploys as static files from site/ with no build step on Vercel, so the rendered
 * HTML is committed. Run after editing a post:
 *
 *   npm run build:blog
 *
 * The monthly draft agent (scripts/blog-draft.mts) calls buildBlog() after writing a post.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const POSTS_DIR = "content/posts";
const SITE_DIR = "site";
const ORIGIN = "https://onspec.sh";

export interface BlogSource { n: number; title: string; publication?: string; author?: string | null; date?: string; url: string }
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  dek: string;
  date: string;
  readingTime: string;
  tags: string[];
  sources: BlogSource[];
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function loadPosts(): BlogPost[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const posts: BlogPost[] = [];
  for (const f of fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))) {
    const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, f), "utf8"));
    const words = content.split(/\s+/).filter(Boolean).length;
    posts.push({
      slug: f.replace(/\.md$/, ""),
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      dek: String(data.dek ?? data.description ?? ""),
      date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ""),
      readingTime: String(data.readingTime ?? `${Math.max(1, Math.round(words / 220))} min read`),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      sources: Array.isArray(data.sources) ? (data.sources as BlogSource[]) : [],
      html: marked.parse(content, { async: false }) as string,
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

// Shared chrome — same tokens, nav and footer as docs.html / writing-specs.html.
const STYLE = `
  :root {
    --bg: #0b0d10; --bg-raised: #11141a; --bg-panel: #0e1116; --line: #1e232c; --line-soft: #171b22;
    --text: #e8ebef; --text-dim: #9aa3b0; --text-faint: #616a78; --accent: #3ecf8e; --accent-dim: #2a8f64;
    --radius: 10px; --radius-sm: 7px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body { background: var(--bg); color: var(--text); font-family: "Geist", -apple-system, "Segoe UI", sans-serif; font-size: 16px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  code, pre, .mono { font-family: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace; }
  a { color: inherit; text-decoration: none; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
  nav.top { position: sticky; top: 0; z-index: 40; height: 64px; border-bottom: 1px solid var(--line-soft); background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .nav-inner { height: 64px; display: flex; align-items: center; justify-content: space-between; }
  .wordmark { font-family: "Geist Mono", monospace; font-weight: 600; font-size: 17px; letter-spacing: -0.02em; }
  .wordmark .tick { color: var(--accent); }
  .wordmark .crumb { color: var(--text-faint); font-weight: 400; }
  .nav-links { display: flex; gap: 28px; align-items: center; font-size: 14px; color: var(--text-dim); }
  .nav-links a:hover { color: var(--text); }
  .nav-links .btn-npm { color: var(--text); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 6px 14px; transition: border-color .2s, background .2s; }
  .nav-links .btn-npm:hover { border-color: var(--accent-dim); background: var(--bg-raised); }
  article { max-width: 720px; margin: 0 auto; padding: 56px 24px 96px; }
  .eyebrow { font-family: "Geist Mono", monospace; font-size: 13px; color: var(--text-faint); }
  h1 { font-size: 2.2rem; line-height: 1.15; letter-spacing: -0.03em; font-weight: 700; margin-top: 10px; }
  .lede { margin-top: 12px; color: var(--text-dim); font-size: 1.1rem; }
  .meta { margin-top: 16px; font-size: 13.5px; color: var(--text-faint); display: flex; gap: 10px; flex-wrap: wrap; }
  .tag { border: 1px solid var(--line); border-radius: 999px; padding: 1px 10px; color: var(--text-dim); }
  .body { margin-top: 40px; }
  .body h2 { font-size: 1.35rem; letter-spacing: -0.02em; font-weight: 700; margin-top: 48px; padding-bottom: 12px; border-bottom: 1px solid var(--line-soft); }
  .body h3 { font-size: 1.05rem; font-weight: 600; margin-top: 30px; }
  .body p { margin-top: 14px; color: var(--text-dim); }
  .body p:first-child { color: var(--text); font-size: 1.08rem; }
  .body strong { color: var(--text); }
  .body ul, .body ol { margin: 12px 0 0 20px; color: var(--text-dim); }
  .body li { margin-top: 6px; }
  .body blockquote { margin-top: 20px; padding-left: 16px; border-left: 2px solid var(--accent); color: var(--text); font-size: 1.1rem; }
  .body code { background: var(--bg-raised); border: 1px solid var(--line-soft); border-radius: 5px; padding: 1px 6px; font-size: 13px; color: var(--text); }
  .body pre { margin-top: 16px; background: var(--bg-panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 20px; font-size: 12.8px; line-height: 1.7; overflow-x: auto; color: var(--text-dim); }
  .body pre code { background: none; border: 0; padding: 0; font-size: inherit; color: inherit; }
  .body a { color: var(--accent); }
  .sources { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--line-soft); }
  .sources h2 { font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-faint); }
  .sources ol { margin: 12px 0 0 0; list-style: none; font-size: 14px; }
  .sources li { margin-top: 8px; color: var(--text-dim); }
  .sources .n { color: var(--text-faint); margin-right: 8px; font-family: "Geist Mono", monospace; }
  .sources a { color: var(--text); }
  .sources a:hover { color: var(--accent); }
  .cta { margin-top: 48px; padding: 20px 22px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--bg-raised); color: var(--text-dim); font-size: 15px; }
  .cta a { color: var(--accent); }
  .list { max-width: 720px; margin: 0 auto; padding: 56px 24px 96px; }
  .list h1 { margin-top: 10px; }
  .post { display: block; padding: 22px 0; border-bottom: 1px solid var(--line-soft); }
  .post:hover .post-title { color: var(--accent); }
  .post-title { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; margin-top: 4px; transition: color .15s; }
  .post-desc { margin-top: 6px; color: var(--text-dim); }
  footer { border-top: 1px solid var(--line-soft); padding: 40px 0 56px; }
  .foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; font-size: 13.5px; color: var(--text-faint); }
  .foot-links { display: flex; gap: 24px; flex-wrap: wrap; }
  .foot-links a:hover { color: var(--text); }
`;

function shell(opts: { title: string; description: string; canonical: string; crumb: string; jsonLd: object; body: string; og?: Record<string, string> }): string {
  const og = { "og:title": opts.title, "og:description": opts.description, "og:url": opts.canonical, "og:type": "article", ...(opts.og ?? {}) };
  return `<!doctype html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WPP2D90B4G"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-WPP2D90B4G');
</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${opts.canonical}">
${Object.entries(og).map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join("\n")}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>
<style>${STYLE}</style>
</head>
<body>

<nav class="top">
  <div class="wrap nav-inner">
    <a class="wordmark" href="/"><span class="tick">✓</span> onspec <span class="crumb">/ ${esc(opts.crumb)}</span></a>
    <div class="nav-links">
      <a href="/docs">Docs</a>
      <a href="/blog">Blog</a>
      <a href="https://github.com/Avant-Concepts-LLC/onspec">GitHub</a>
      <a class="btn-npm" href="https://www.npmjs.com/package/onspec">npm</a>
    </div>
  </div>
</nav>

${opts.body}

<footer>
  <div class="wrap foot">
    <span class="mono">© 2026 <a href="https://avant-concepts.com" style="color: inherit">Avant Concepts LLC</a></span>
    <div class="foot-links">
      <a href="/">Home</a>
      <a href="/docs">Docs</a>
      <a href="/blog">Blog</a>
      <a href="https://github.com/Avant-Concepts-LLC/onspec">GitHub</a>
      <a href="https://www.npmjs.com/package/onspec">npm</a>
      <a href="https://github.com/Avant-Concepts-LLC/onspec/blob/main/LICENSE">MIT License</a>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function postPage(p: BlogPost): string {
  const url = `${ORIGIN}/blog/${p.slug}`;
  const sources = p.sources.length
    ? `<section class="sources" aria-label="Sources"><h2>Sources</h2><ol>${p.sources
        .map((s, i) => `<li id="src-${s.n ?? i + 1}"><span class="n">[${s.n ?? i + 1}]</span><a href="${esc(s.url)}" rel="noopener nofollow" target="_blank">${esc(s.title)}</a>${s.publication ? ` <span>— ${esc(s.publication)}${s.date ? `, ${esc(String(s.date))}` : ""}</span>` : ""}</li>`)
        .join("")}</ol></section>`
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    url,
    mainEntityOfPage: url,
    isPartOf: { "@id": `${ORIGIN}/blog` },
    keywords: p.tags.join(", "),
    author: { "@type": "Organization", name: "Avant Concepts", url: "https://avant-concepts.com" },
    publisher: { "@type": "Organization", name: "onspec", url: ORIGIN },
    citation: p.sources.map((s) => ({ "@type": "CreativeWork", name: s.title, url: s.url })),
  };
  const body = `<article>
  <p class="eyebrow">blog / ${esc(p.slug)}</p>
  <h1>${esc(p.title)}</h1>
  <p class="lede">${esc(p.dek)}</p>
  <div class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time><span>·</span><span>${esc(p.readingTime)}</span>${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
  <div class="body">
${p.html}
  </div>
  ${sources}
  <div class="cta">Specs that refuse to drift: <a href="/docs">read the docs</a>, or <code>npm install -g onspec</code> and run <code>onspec lint</code> on a spec you already have.</div>
</article>`;
  return shell({ title: `${p.title} — onspec`, description: p.description, canonical: url, crumb: "blog", jsonLd, body });
}

function indexPage(posts: BlogPost[]): string {
  const url = `${ORIGIN}/blog`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": url,
    name: "onspec blog",
    url,
    description: "Monthly, sourced writing on spec-driven development and verifying AI-generated code.",
    publisher: { "@type": "Organization", name: "onspec", url: ORIGIN },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${ORIGIN}/blog/${p.slug}`, datePublished: p.date })),
  };
  const list = posts.length
    ? posts.map((p) => `<a class="post" href="/blog/${p.slug}"><span class="eyebrow"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${esc(p.readingTime)}</span><p class="post-title">${esc(p.title)}</p><p class="post-desc">${esc(p.description)}</p></a>`).join("\n")
    : `<p class="post-desc">First post lands soon.</p>`;
  const body = `<main class="list">
  <p class="eyebrow">blog</p>
  <h1>Specs, drift, and code that stays true to intent.</h1>
  <p class="lede">One post a month on spec-driven development and verifying AI-generated code. Every claim links to its source.</p>
  <div style="margin-top: 32px">
${list}
  </div>
</main>`;
  return shell({ title: "onspec blog", description: "Monthly, sourced writing on spec-driven development and verifying AI-generated code.", canonical: url, crumb: "blog", jsonLd, body, og: { "og:type": "website" } });
}

function updateSitemap(posts: BlogPost[]): string | null {
  const file = path.join(SITE_DIR, "sitemap.xml");
  const xml = fs.readFileSync(file, "utf8");
  const start = "  <!-- blog:start -->";
  const end = "  <!-- blog:end -->";
  const s = xml.indexOf(start);
  const e = xml.indexOf(end);
  if (s === -1 || e === -1) throw new Error("site/sitemap.xml: blog:start / blog:end markers not found");
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    `  <url><loc>${ORIGIN}/blog</loc><lastmod>${posts[0]?.date ?? today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    ...posts.map((p) => `  <url><loc>${ORIGIN}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`),
  ].join("\n");
  const next = xml.slice(0, s) + `${start}\n${entries}\n` + xml.slice(e);
  if (next === xml) return null;
  fs.writeFileSync(file, next);
  return file;
}

/** Render every post and the index; returns the files written. */
export function buildBlog(): string[] {
  const posts = loadPosts();
  const written: string[] = [];
  fs.mkdirSync(path.join(SITE_DIR, "blog"), { recursive: true });
  for (const p of posts) {
    const file = path.join(SITE_DIR, "blog", `${p.slug}.html`);
    fs.writeFileSync(file, postPage(p));
    written.push(file);
  }
  const index = path.join(SITE_DIR, "blog.html");
  fs.writeFileSync(index, indexPage(posts));
  written.push(index);
  const sitemap = updateSitemap(posts);
  if (sitemap) written.push(sitemap);
  return written;
}

if (process.argv[1] && /build-blog\.mts$/.test(process.argv[1])) {
  const files = buildBlog();
  console.error(`[build-blog] wrote ${files.length} file(s):\n  ${files.join("\n  ")}`);
}
