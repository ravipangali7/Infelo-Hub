import { AdminStatsCards } from "./AdminStatsCards";
import { summaryToStatItems } from "@/lib/adminSummary";

export function AdminModuleSummary({
  summary,
  loading,
  maxItems = 14,
}: {
  summary: Record<string, unknown> | undefined;
  loading?: boolean;
  maxItems?: number;
}) {
  const items = summaryToStatItems(summary, maxItems);
  if (loading) {
    return <AdminStatsCards loading items={[]} />;
  }
  if (items.length === 0) {
    return null;
  }
  return <AdminStatsCards items={items} />;
}
