import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminPurchaseList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Purchase } from "@/api/types";

const PAGE_SIZE = 20;

export default function Purchases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const vendor = searchParams.get("vendor") || undefined;
  const user = searchParams.get("user") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, vendor, user, search, date_from, date_to };
  const { data, isLoading, error } = useAdminPurchaseList(params);
  const qc = useQueryClient();
  const { toast } = useToast();
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
          <h1 className="text-2xl font-bold">Purchases</h1>
        </div>
        <AdminListSkeleton statsCount={3} filterRows={2} tableColumns={6} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (p: Purchase) => <Link className="text-primary underline font-medium" to={`/system/purchases/${p.id}`}>#{p.id}</Link>,
    },
    { id: "vendor_name", label: "Vendor", render: (p: Purchase) => p.vendor_name ?? p.vendor ?? "—" },
    {
      id: "user",
      label: "User",
      render: (p: Purchase) =>
        p.user ? (
          <Link className="text-primary underline" to={`/system/users/${p.user}`}>
            {p.user}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      id: "total",
      label: "Total",
      sortKey: "total",
      render: (p: Purchase) => <span className="font-medium">रु {Number(p.total).toLocaleString()}</span>,
    },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (p: Purchase) => new Date(p.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (p: Purchase) => (
        <AdminRowActions
          viewHref={`/system/purchases/${p.id}`}
          onDelete={async () => {
            try {
              await adminApi.deletePurchase(p.id);
              qc.invalidateQueries({ queryKey: adminKeys.purchases(params) });
            } catch {
              toast({ variant: "destructive", title: "Failed to delete purchase" });
            }
          }}
          deleteConfirmLabel="Delete this purchase record?"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Purchases</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Vendor procurement</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/purchases/new">Add Purchase</Link>
        </Button>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "text", name: "vendor", label: "Vendor ID" },
          { type: "text", name: "user", label: "User ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Vendor name, user..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(p) => p.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No purchases."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
