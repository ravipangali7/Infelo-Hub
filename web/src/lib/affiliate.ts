export const AFFILIATE_SESSION_KEY = "infelo_affiliate_ref";

export function parseAffiliateRefParam(searchParams: URLSearchParams): number | null {
  const v = searchParams.get("ref");
  if (!v || !/^\d+$/.test(v)) return null;
  const n = parseInt(v, 10);
  return n > 0 ? n : null;
}

export function getStoredAffiliateRef(): number | null {
  try {
    const v = sessionStorage.getItem(AFFILIATE_SESSION_KEY);
    if (!v || !/^\d+$/.test(v)) return null;
    const n = parseInt(v, 10);
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function storeAffiliateRef(id: number): void {
  try {
    sessionStorage.setItem(AFFILIATE_SESSION_KEY, String(id));
  } catch {
    /* ignore */
  }
}

export function clearStoredAffiliateRef(): void {
  try {
    sessionStorage.removeItem(AFFILIATE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
