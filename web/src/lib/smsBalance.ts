/**
 * Format Samaya-style SMS balance payloads for display (BALANCE values only).
 */

function sumBalancesFromList(items: unknown[]): number | null {
  const totals: number[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    let b = o.BALANCE ?? o.balance;
    if (b === null || b === undefined || b === "") continue;
    const n = typeof b === "number" ? b : parseFloat(String(b).replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    totals.push(n);
  }
  if (totals.length === 0) return null;
  return totals.reduce((a, x) => a + x, 0);
}

function formatSum(t: number): string {
  return Number.isInteger(t) ? String(t) : String(t);
}

/** Parse raw API `sms_balance` (array/object/JSON string) and return display string or null. */
export function formatSmsBalancesFromRaw(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        return formatSmsBalancesFromRaw(JSON.parse(s));
      } catch {
        return null;
      }
    }
    return null;
  }
  if (Array.isArray(raw)) {
    const sum = sumBalancesFromList(raw);
    return sum != null ? formatSum(sum) : null;
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    // API sometimes wraps body as { raw: "[{\"BALANCE\":9},...]" } (non-JSON content-type)
    if (typeof o.raw === "string") {
      const fromWrapped = formatSmsBalancesFromRaw(o.raw.trim());
      if (fromWrapped != null) return fromWrapped;
    }
    const b = o.BALANCE ?? o.balance;
    if (b != null && b !== "") {
      const n = typeof b === "number" ? b : parseFloat(String(b));
      if (Number.isFinite(n)) return formatSum(n);
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return formatSum(raw);
  return null;
}

function looksLikeJsonObjectString(s: string): boolean {
  const t = s.trim();
  return t.startsWith("[") || t.startsWith("{");
}

/**
 * Prefer server-provided label; fall back to parsing raw balance payload (never show full JSON in UI).
 */
export function resolveSmsBalanceDisplay(
  label: string | undefined | null,
  raw: unknown
): string {
  const l = (label ?? "").trim();
  if (l && l !== "—" && !looksLikeJsonObjectString(l)) return l;
  const fromRaw = formatSmsBalancesFromRaw(raw);
  if (fromRaw != null) return fromRaw;
  if (l && !looksLikeJsonObjectString(l)) return l;
  return "—";
}
