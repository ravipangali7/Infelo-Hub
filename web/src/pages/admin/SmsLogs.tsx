import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { AdminDataTable } from "@/components/admin";
import { Card, CardContent } from "@/components/ui/card";

type SmsLogRow = {
  id: number;
  phone: string;
  purpose: string;
  status: string;
  created_at: string;
};

export default function SmsLogs() {
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "sms-logs", page],
    queryFn: () => adminApi.getSmsLogs({ page, page_size: 20, search: searchParams.get("search") || undefined }),
  });

  const rows = (data?.results ?? []) as SmsLogRow[];

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold">SMS Logs</h1>
        <p className="text-muted-foreground text-xs md:text-sm">Provider transaction logs</p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">Failed to load</p>}
      {!isLoading && !error && (
        <Card>
          <CardContent className="p-0">
            <AdminDataTable<SmsLogRow>
              columns={[
                { id: "phone", label: "Phone", render: (r) => r.phone },
                { id: "purpose", label: "Purpose", render: (r) => r.purpose },
                { id: "status", label: "Status", render: (r) => r.status },
                {
                  id: "created_at",
                  label: "Date",
                  render: (r) => new Date(r.created_at).toLocaleString(),
                },
              ]}
              data={rows}
              keyFn={(r) => r.id}
              emptyMessage="No SMS logs."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
