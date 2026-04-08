export interface SummaryStatCard {
  label: string;
  value: string | number;
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Turn API `summary` object into stat cards (primitives + nested count maps). */
export function summaryToStatItems(summary: Record<string, unknown> | undefined, max = 14): SummaryStatCard[] {
  if (!summary) return [];
  const items: SummaryStatCard[] = [];
  for (const [k, v] of Object.entries(summary)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      items.push({
        label: humanize(k),
        value: typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "number" && k.includes("amount") ? formatMoney(v) : String(v),
      });
    }
  }
  for (const [k, v] of Object.entries(summary)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
      if (typeof sv === "number" || typeof sv === "string") {
        items.push({
          label: `${humanize(k)} · ${sk}`,
          value: String(sv),
        });
      }
    }
  }
  return items.slice(0, max);
}

function formatMoney(n: number): string {
  if (Number.isNaN(n)) return String(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
