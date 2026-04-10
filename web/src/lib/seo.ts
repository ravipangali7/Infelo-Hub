const stripTrailingSlash = (s: string) => s.replace(/\/$/, "");

/** Public site origin for canonical URLs and default OG fallbacks. */
export function siteOrigin(): string {
  const fromEnv = stripTrailingSlash((import.meta.env.VITE_SITE_ORIGIN ?? "").trim());
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Backend base URL for /share/* and /sitemap.xml (no trailing slash). */
export function shareServiceBase(): string {
  const explicit = stripTrailingSlash((import.meta.env.VITE_SHARE_BASE_URL ?? "").trim());
  if (explicit) return explicit;
  const api = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (api) return stripTrailingSlash(api.replace(/\/api\/?$/, ""));
  return "";
}

export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = siteOrigin();
  if (!origin) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${p}`;
}

export function crawlerShareProductUrl(slug: string): string {
  const base = shareServiceBase();
  if (!base || !slug) return "";
  return `${base}/share/product/${encodeURIComponent(slug)}/`;
}

export function crawlerShareCampaignUrl(campaignId: number): string {
  const base = shareServiceBase();
  if (!base || !campaignId) return "";
  return `${base}/share/campaign/${campaignId}/`;
}

/** Strip HTML and trim for meta descriptions. */
export function plainTextExcerpt(raw: string, maxLen: number): string {
  const t = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}
