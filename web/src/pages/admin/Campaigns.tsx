import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminCampaignList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Campaign } from "@/api/types";

const PAGE_SIZE = 20;

export default function Campaigns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, status, date_from, date_to };
  const { data, isLoading, error } = useAdminCampaignList(params);
  const qc = useQueryClient();
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
          <h1 className="text-2xl font-bold">Campaigns</h1>
        </div>
        <AdminListSkeleton statsCount={3} filterRows={2} tableColumns={6} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (c: Campaign) => <Link className="text-primary underline font-medium" to={`/system/campaigns/${c.id}`}>#{c.id}</Link>,
    },
    { id: "name", label: "Name", sortKey: "name" },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (c: Campaign) => (
        <Badge variant={c.status === "active" ? "default" : c.status === "inactive" ? "secondary" : "outline"}>
          {c.status_display || c.status}
        </Badge>
      ),
    },
    { id: "product_name", label: "Product", render: (c: Campaign) => c.product_name ?? "—" },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (c: Campaign) => new Date(c.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (c: Campaign) => (
        <AdminRowActions
          viewHref={`/system/campaigns/${c.id}`}
          editHref={`/system/campaigns/${c.id}/edit`}
          onDelete={async () => {
            await adminApi.deleteCampaign(c.id);
            qc.invalidateQueries({ queryKey: adminKeys.campaigns(params) });
          }}
          deleteConfirmLabel="Delete campaign?"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Tasks and commissions</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/campaigns/new">Add</Link>
        </Button>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          {
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { value: "coming", label: "Coming" },
              { value: "running", label: "Running" },
              { value: "finished", label: "Finished" },
              { value: "deactivate", label: "Deactivate" },
            ],
          },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Campaign name..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(c) => c.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No campaigns."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
