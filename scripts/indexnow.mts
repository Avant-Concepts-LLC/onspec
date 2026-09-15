/**
 * IndexNow submitter — one script, one workflow, the same shape in every sibling repo
 * (aisuru, avantconcepts, eddiebarretta, onspec, real-estate). Design and setup live in the umbrella
 * repo (~/Websites/home/docs/indexnow.md).
 *
 * IndexNow tells Bing (and Yandex, Seznam, Naver) which URLs changed, so new and updated pages are
 * crawled in hours instead of waiting to be discovered. Bing's index feeds ChatGPT search and
 * Copilot. Google ignores IndexNow; Search Console and the sitemaps cover Google.
 *
 *   Vercel production deploy succeeds → .github/workflows/indexnow.yml → this script
 *   → reads the sitemaps → POSTs the changed URLs to api.indexnow.org.
 *
 * Run locally:
 *   npx tsx scripts/indexnow.mts --dry-run         URLs with <lastmod> in the last 3 days, send nothing
 *   npx tsx scripts/indexnow.mts --dry-run --all   every sitemap URL, send nothing
 *   npx tsx scripts/indexnow.mts --all             submit every sitemap URL
 *
 * Only the block between the SITE ADAPTER markers differs between repos. Everything else is
 * byte-identical across the five — change it in one, copy it to the others.
 */

// ═══════════════════════════ SITE ADAPTER: onspec ═══════════════════════════
const HOST = "onspec.sh";
const KEY = "13f6864581bceaf906ca9cb961e3a188"; // public by design; the key file below must return exactly this string
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
// Vercel serves site/; cleanUrls only rewrites .html, so the .txt key file is served as-is.
const SITEMAPS = [
  `https://${HOST}/sitemap.xml`,
];
// ═══════════════════════════ END SITE ADAPTER ═══════════════════════════

const ENDPOINT = "https://api.indexnow.org/indexnow";
const RECENT_DAYS = 3;
const BATCH_SIZE = 10_000; // IndexNow's per-request limit

const args = new Set(process.argv.slice(2));
const ALL = args.has("--all");
const DRY_RUN = args.has("--dry-run");

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

async function readSitemap(url: string): Promise<SitemapEntry[]> {
  const res = await fetch(url, { headers: { "user-agent": "indexnow-submit" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const xml = await res.text();
  // A sitemap index lists child sitemaps; read those instead.
  if (/<sitemapindex[\s>]/.test(xml)) {
    const children = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
    return (await Promise.all(children.map(readSitemap))).flat();
  }
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({
      loc: decode(m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1] ?? ""),
      lastmod: m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1],
    }))
    .filter((e) => e.loc);
}

function select(entries: SitemapEntry[]): string[] {
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const urls = new Set<string>();
  let otherHost = 0;
  for (const e of entries) {
    if (new URL(e.loc).host !== HOST) {
      otherHost++;
      continue;
    }
    if (ALL) urls.add(e.loc);
    else if (e.lastmod && Date.parse(e.lastmod) >= cutoff) urls.add(e.loc);
  }
  if (otherHost) console.log(`Skipped ${otherHost} URL(s) not on ${HOST} (IndexNow takes one host per request).`);
  return [...urls];
}

async function verifyKeyFile(): Promise<void> {
  const res = await fetch(KEY_LOCATION, { headers: { "user-agent": "indexnow-submit" } });
  const body = res.ok ? (await res.text()).trim() : "";
  if (body !== KEY) {
    console.error(
      `Key file check failed: ${KEY_LOCATION} returned ${res.status}${res.ok ? " but not the key" : ""}. ` +
        "IndexNow rejects submissions until the key file is deployed at that URL.",
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const entries = (await Promise.all(SITEMAPS.map(readSitemap))).flat();
  const urls = select(entries);
  const mode = ALL ? "all sitemap URLs" : `URLs with <lastmod> in the last ${RECENT_DAYS} days`;
  console.log(`${HOST}: ${entries.length} sitemap entries, ${urls.length} to submit (${mode}).`);

  if (DRY_RUN) {
    for (const u of urls) console.log(`  ${u}`);
    console.log("Dry run: nothing sent.");
    return;
  }
  if (!urls.length) {
    console.log("Nothing to submit.");
    return;
  }

  await verifyKeyFile();
  let failed = false;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const urlList = urls.slice(i, i + BATCH_SIZE);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    if (res.status === 200 || res.status === 202) {
      console.log(`Submitted ${urlList.length} URL(s): ${res.status}.`);
      continue;
    }
    const body = await res.text();
    // 422: URLs don't belong to the host or the key doesn't match the schema. Logged, not fatal.
    if (res.status === 422) {
      console.warn(`IndexNow 422 for ${urlList.length} URL(s): ${body}`);
      continue;
    }
    console.error(`IndexNow ${res.status} for ${urlList.length} URL(s): ${body}`);
    failed = true;
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
