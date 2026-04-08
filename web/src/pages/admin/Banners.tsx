import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminBannerList, adminKeys } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Banner } from "@/api/types";

const PAGE_SIZE = 20;

export default function Banners() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const is_active = searchParams.get("is_active") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, is_active };
  const { data, isLoading, error } = useAdminBannerList(params);
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
        <div><h1 className="text-2xl font-bold">Banners</h1><p className="text-muted-foreground">Manage shop banners</p></div>
        <AdminListSkeleton statsCount={1} filterRows={1} tableColumns={5} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: Banner) => <span className="font-medium text-muted-foreground">#{row.id}</span>,
    },
    {
      id: "image", label: "Image",
      render: (row: Banner) => row.image_url
        ? <img src={row.image_url} alt={row.title} className="w-16 h-10 object-cover rounded-lg" />
        : <div className="w-16 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">No img</div>,
    },
    { id: "title", label: "Title", sortKey: "title" },
    {
      id: "order", label: "Order", sortKey: "order",
      render: (row: Banner) => <span className="font-mono text-sm">{row.order}</span>,
    },
    {
      id: "is_active", label: "Status",
      render: (row: Banner) => (
        <Badge className={row.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { id: "created_at", label: "Created", sortKey: "created_at", render: (row: Banner) => new Date(row.created_at).toLocaleDateString() },
    {
      id: "actions", label: "Actions",
      render: (row: Banner) => (
        <AdminRowActions
          editHref={`/system/banners/${row.id}/edit`}
          onDelete={async () => {
            await adminApi.deleteBanner(row.id);
            qc.invalidateQueries({ queryKey: adminKeys.banners(params) });
          }}
          deleteConfirmLabel="Delete this banner? This action cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Banners</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage shop banners</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/banners/new">Add Banner</Link>
        </Button>
      </div>
      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "select", name: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
        ]}
        searchPlaceholder="Search title..."
        searchParamName="search"
      />
      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={results}
            keyFn={(row) => (row as Banner).id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No banners found."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load banners.</p>}
    </div>
  );
}
