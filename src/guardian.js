// Thin client for the Guardian Open Platform: normalizes stories and caches responses,
// because the free developer key allows roughly 500 calls a day.
const BASE = "https://content.guardianapis.com";
const FIELDS = "trailText,thumbnail,byline";
const TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 300;

export const SECTIONS = [
  { id: "latest", name: "Latest" },
  { id: "world", name: "World" },
  { id: "business", name: "Business" },
  { id: "technology", name: "Tech" },
  { id: "science", name: "Science" },
  { id: "environment", name: "Climate" },
  { id: "sport", name: "Sport" },
  { id: "culture", name: "Culture" },
];
const SECTION_IDS = new Set(SECTIONS.map((s) => s.id));
export const isSection = (id) => SECTION_IDS.has(id);

// Guardian content ids look like "technology/2026/oct/19/some-slug".
export const isStoryId = (id) => /^[a-z0-9-]+(\/[a-z0-9-]+){2,8}$/.test(id);

const ENTITIES = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&rsquo;": "'", "&lsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&hellip;": "…", "&ndash;": "-", "&mdash;": ", " };
export const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? " ").replace(/\s+/g, " ").trim();

export function normalize(r) {
  return {
    id: r.id,
    section: r.sectionId,
    sectionName: r.sectionName,
    title: r.webTitle,
    summary: stripHtml(r.fields?.trailText),
    // The API hands out 500px crops; the 1000px rendition of the same crop exists for most images.
    image: r.fields?.thumbnail,
    imageLarge: r.fields?.thumbnail?.replace(/\/500\.jpg$/, "/1000.jpg"),
    byline: r.fields?.byline || undefined,
    url: r.webUrl,
    publishedAt: r.webPublicationDate,
  };
}

const cache = new Map(); // url -> { at, data }

async function cached(path, params) {
  const key = process.env.GUARDIAN_KEY;
  if (!key) throw Object.assign(new Error("The news source isn't configured yet"), { status: 503 });
  const url = `${BASE}${path}?${new URLSearchParams({ ...params, "api-key": key })}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404) throw Object.assign(new Error("Story not found"), { status: 404 });
    if (!res.ok) throw Object.assign(new Error(`Guardian API responded ${res.status}`), { status: 502 });
    const data = (await res.json()).response;
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit && err.status !== 404) return hit.data; // stale beats nothing when rate-limited or down
    throw err.status ? err : Object.assign(new Error("The news source isn't responding right now"), { status: 502 });
  }
}

export async function listStories({ section, q, page }) {
  const params = { "show-fields": FIELDS, type: "article", "page-size": "20", page: String(page), "order-by": q ? "relevance" : "newest" };
  if (section && section !== "latest") params.section = section;
  if (q) params.q = q;
  const data = await cached("/search", params);
  return { items: data.results.map(normalize), page: data.currentPage, pages: Math.min(data.pages, 50) };
}

export async function getStory(id) {
  const data = await cached(`/${id}`, { "show-fields": FIELDS });
  return normalize(data.content);
}
