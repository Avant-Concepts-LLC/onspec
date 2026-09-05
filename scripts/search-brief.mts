#!/usr/bin/env -S npx tsx
/**
 * search-brief — what readers already look for, and what already holds them.
 *
 * Reads the last 28 days of Search Console (queries, pages) and GA4 (landing pages, channels,
 * key events) for this site and writes one compact markdown brief. The monthly blog agent
 * (scripts/blog-draft.mts) reads it as "reader demand" when picking a topic. Read-only.
 *
 *   npx tsx scripts/search-brief.mts                 → $BLOG_OUT_DIR/search-brief.md, also printed
 *   npx tsx scripts/search-brief.mts --out brief.md
 *
 * Auth: an `authorized_user` ADC file at $GOOGLE_APPLICATION_CREDENTIALS (default: gcloud's
 * application_default_credentials.json) carrying webmasters.readonly + analytics.readonly.
 * In GitHub Actions the workflow writes the GOOGLE_ADC_JSON secret to a temp file. Setup and
 * the property map: ~/Websites/home/docs/search-and-analytics.md.
 *
 * Only the block between the SITE ADAPTER markers differs between repos; everything else is
 * byte-identical in all five and kept in sync with docs/blog-pipeline/assemble.mjs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ═══════════════════════════ SITE ADAPTER: onspec ═══════════════════════════
const SITE = {
  gscSite: "sc-domain:onspec.sh",
  ga4Property: "properties/552660505",
  blogPath: "/blog",
  /** Queries containing any of these are brand demand, not topic demand. */
  brand: ["onspec"],
};
// ═══════════════════════════ END SITE ADAPTER ═══════════════════════════

// ═══════════════════════════ END SITE ADAPTER ═══════════════════════════

const DAYS = 28;
/** Search Console data lands 2-3 days late; end the window there so the last days are not empty. */
const LAG_DAYS = 3;

type Cred = { type: string; client_id: string; client_secret: string; refresh_token: string; quota_project_id?: string };

async function accessToken(): Promise<{ token: string; quotaProject?: string }> {
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(os.homedir(), ".config", "gcloud", "application_default_credentials.json");
  const cred = JSON.parse(fs.readFileSync(file, "utf8")) as Cred;
  if (cred.type !== "authorized_user") throw new Error(`${file}: expected an authorized_user credential from \`gcloud auth application-default login\``);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cred.client_id, client_secret: cred.client_secret, refresh_token: cred.refresh_token, grant_type: "refresh_token" }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return { token: ((await res.json()) as { access_token: string }).access_token, quotaProject: cred.quota_project_id };
}

async function post<T>(auth: { token: string; quotaProject?: string }, url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json", ...(auth.quotaProject ? { "x-goog-user-project": auth.quotaProject } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const pathOf = (url: string) => { try { const u = new URL(url); return u.pathname.replace(/\/$/, "") || "/"; } catch { return url; } };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const isBrand = (q: string) => SITE.brand.some((b) => q.toLowerCase().includes(b));

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
type GaRow = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };

async function main() {
  const outArg = process.argv.indexOf("--out");
  const outFile = outArg !== -1 ? process.argv[outArg + 1] : path.join(process.env.BLOG_OUT_DIR || path.join(os.tmpdir(), "blog-draft"), "search-brief.md");

  const end = new Date(Date.now() - LAG_DAYS * 86400000);
  const start = new Date(end.getTime() - (DAYS - 1) * 86400000);
  const [startDate, endDate] = [isoDay(start), isoDay(end)];
  const auth = await accessToken();

  const gsc = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE.gscSite)}/searchAnalytics/query`;
  const [byQuery, byPage, ga] = await Promise.all([
    post<{ rows?: GscRow[] }>(auth, gsc, { startDate, endDate, dimensions: ["query"], rowLimit: 250 }),
    post<{ rows?: GscRow[] }>(auth, gsc, { startDate, endDate, dimensions: ["page"], rowLimit: 250 }),
    post<{ rows?: GaRow[] }>(auth, `https://analyticsdata.googleapis.com/v1beta/${SITE.ga4Property}:runReport`, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "landingPage" }, { name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
      limit: 500,
    }),
  ]);

  const queries = (byQuery.rows ?? []).map((r) => ({ q: r.keys[0], ...r }));
  const pages = new Map((byPage.rows ?? []).map((r) => [pathOf(r.keys[0]), r]));
  const rankingPaths = new Set([...pages].filter(([, r]) => r.position <= 10).map(([p]) => p));

  type Landing = { path: string; sessions: number; engaged: number; organic: number; keyEvents: number };
  const landing = new Map<string, Landing>();
  for (const r of ga.rows ?? []) {
    const p = r.dimensionValues[0].value.replace(/\/$/, "") || "/";
    const channel = r.dimensionValues[1].value;
    const [sessions, engaged, keyEvents] = r.metricValues.map((m) => Number(m.value));
    const cur = landing.get(p) ?? { path: p, sessions: 0, engaged: 0, organic: 0, keyEvents: 0 };
    cur.sessions += sessions; cur.engaged += engaged; cur.keyEvents += keyEvents;
    if (channel === "Organic Search") cur.organic += sessions;
    landing.set(p, cur);
  }
  const landings = [...landing.values()].filter((l) => l.path !== "(not set)").sort((a, b) => b.sessions - a.sessions);

  const totals = {
    impressions: queries.reduce((n, r) => n + r.impressions, 0),
    clicks: queries.reduce((n, r) => n + r.clicks, 0),
    sessions: landings.reduce((n, l) => n + l.sessions, 0),
    organic: landings.reduce((n, l) => n + l.organic, 0),
    keyEvents: landings.reduce((n, l) => n + l.keyEvents, 0),
  };

  const nonBrand = queries.filter((r) => !isBrand(r.q)).sort((a, b) => b.impressions - a.impressions);
  const fmtQuery = (r: GscRow & { q: string }) => `- "${r.q}" · ${r.impressions} impressions · ${r.clicks} clicks · position ${r.position.toFixed(0)}`;
  const unanswered = nonBrand.filter((r) => r.impressions >= 3 && r.position > 10).slice(0, 10);
  const gscFor = (p: string) => { const r = pages.get(p); return r ? ` · GSC ${r.impressions} impressions, ${r.clicks} clicks, position ${r.position.toFixed(0)}` : " · not in Search Console"; };
  const fmtLanding = (l: Landing) => `- ${l.path} · ${l.sessions} sessions (${l.organic} organic) · ${l.sessions ? pct(l.engaged / l.sessions) : "0%"} engaged · ${l.keyEvents} key events${gscFor(l.path)}`;
  const hiddenGems = landings.filter((l) => l.sessions >= 3 && l.organic <= 1 && l.engaged / l.sessions >= 0.4 && !rankingPaths.has(l.path)).slice(0, 8);
  const blogPages = landings.filter((l) => l.path.startsWith(SITE.blogPath + "/")).slice(0, 10);
  const none = "- (nothing yet)";
  const list = <T,>(rows: T[], f: (r: T) => string) => (rows.length ? rows.map(f).join("\n") : none);

  const brief = [
    `READER DEMAND for ${SITE.gscSite} (GA4 ${SITE.ga4Property}), ${startDate} to ${endDate} (${DAYS} days)`,
    `Totals: ${totals.impressions} search impressions, ${totals.clicks} clicks (Search Console) · ${totals.sessions} sessions, ${totals.organic} from organic search, ${totals.keyEvents} key events (GA4)`,
    "",
    "Non-brand queries by impressions (top 12):",
    list(nonBrand.slice(0, 12), fmtQuery),
    "",
    "Unanswered demand — queries with impressions where no page of ours ranks in the top 10:",
    list(unanswered, fmtQuery),
    "",
    "Pages that hold readers — top landing pages by sessions (top 8):",
    list(landings.slice(0, 8), fmtLanding),
    "",
    "Engages but is not found — engaged pages with almost no organic search traffic:",
    list(hiddenGems, fmtLanding),
    "",
    `Blog posts (${SITE.blogPath}/*) with traffic in the window:`,
    list(blogPages, fmtLanding),
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, brief);
  process.stdout.write(brief);
  console.error(`[search-brief] wrote ${outFile}`);
}

main().catch((err) => {
  console.error(`[search-brief] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
