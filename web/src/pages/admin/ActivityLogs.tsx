import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminActivityLogList } from "@/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/api/types";

const PAGE_SIZE = 20;

export default function ActivityLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const is_guest = searchParams.get("is_guest") || undefined;
  const user = searchParams.get("user") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, platform, is_guest, user, search, date_from, date_to };
  const { data, isLoading, error } = useAdminActivityLogList(params);
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Activity logs</h1>
        </div>
        <AdminListSkeleton statsCount={3} filterRows={2} tableColumns={6} tableRows={10} />
      </div>
    );
  }

  const columns = [
    { id: "id", label: "ID", sortKey: "id" },
    {
      id: "event_name",
      label: "Event",
      sortKey: "event_name",
      render: (a: ActivityLog) => <span className="font-mono text-xs">{a.event_name}</span>,
    },
    {
      id: "user",
      label: "User",
      render: (a: ActivityLog) =>
        a.user ? (
          <Link className="text-primary underline" to={`/system/users/${a.user}`}>
            {a.user}
          </Link>
        ) : (
          <Badge variant="secondary">Guest</Badge>
        ),
    },
    { id: "platform", label: "Platform", render: (a: ActivityLog) => <Badge variant="outline">{a.platform}</Badge> },
    { id: "page_path", label: "Path", render: (a: ActivityLog) => <span className="max-w-[200px] truncate block text-xs">{a.page_path}</span> },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (a: ActivityLog) => new Date(a.created_at).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
          <h1 className="text-xl md:text-2xl font-bold">Activity logs</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Analytics by platform</p>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} maxItems={12} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "text", name: "platform", label: "Platform" },
          {
            type: "select",
            name: "is_guest",
            label: "Guest",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
          { type: "text", name: "user", label: "User ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Event, path, title..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(a) => a.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No logs."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
