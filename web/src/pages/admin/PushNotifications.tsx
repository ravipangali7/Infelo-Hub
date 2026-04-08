import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminPushNotificationList, adminKeys } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PushNotificationListItem } from "@/api/types";

const PAGE_SIZE = 20;

export default function PushNotifications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, date_from, date_to };
  const { data, isLoading, error } = useAdminPushNotificationList(params);
  const qc = useQueryClient();
  const results = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Push notifications</h1>
          <p className="text-muted-foreground">Create and send FCM messages to users</p>
        </div>
        <AdminListSkeleton statsCount={1} filterRows={1} tableColumns={5} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id",
      label: "ID",
      sortKey: "id",
      render: (row: PushNotificationListItem) => (
        <span className="font-medium text-muted-foreground">#{row.id}</span>
      ),
    },
    { id: "title", label: "Title", sortKey: "title" },
    {
      id: "receivers_count",
      label: "Receivers",
      render: (row: PushNotificationListItem) => (
        <span className="font-mono text-sm">{row.receivers_count}</span>
      ),
    },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (row: PushNotificationListItem) => new Date(row.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: PushNotificationListItem) => (
        <AdminRowActions
          viewHref={`/system/push-notifications/${row.id}`}
          editHref={`/system/push-notifications/${row.id}/edit`}
          onDelete={async () => {
            await adminApi.deletePushNotification(row.id);
            qc.invalidateQueries({ queryKey: adminKeys.pushNotifications(params) });
          }}
          deleteConfirmLabel="Delete this push notification? This cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Push notifications</h1>
          <p className="text-muted-foreground text-xs md:text-sm">FCM campaigns and receiver targeting</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/push-notifications/new">New notification</Link>
        </Button>
      </div>
      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Search title..."
        searchParamName="search"
      />
      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={results}
            keyFn={(row) => (row as PushNotificationListItem).id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No push notifications yet."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load push notifications.</p>}
    </div>
  );
}
