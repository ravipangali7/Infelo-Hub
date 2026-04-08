import { useState } from "react";
import { useAnalyticsSms } from "@/api/hooks";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";

export default function SmsAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data, isLoading } = useAnalyticsSms(range.from, range.to);
  return (
    <AnalyticsLayout
      title="SMS Analytics"
      description="OTP and SMS delivery stats"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Total Sent</p><p className="text-2xl font-bold">{data?.total_sent ?? 0}</p></div>
          <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Success</p><p className="text-2xl font-bold">{data?.success ?? 0}</p></div>
          <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold">{data?.failed ?? 0}</p></div>
        </div>
      )}
    </AnalyticsLayout>
  );
}
