import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminShippingChargeList, adminKeys } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export default function ShippingCharges() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const city = searchParams.get("city") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, city, search, date_from, date_to };
  const { data, isLoading, error } = useAdminShippingChargeList(params);
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
        <div><h1 className="text-2xl font-bold">Shipping Charges</h1><p className="text-muted-foreground">Manage shipping charges by city</p></div>
        <AdminListSkeleton statsCount={2} filterRows={1} tableColumns={5} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: { id: number }) => <Link className="text-primary underline font-medium" to={`/system/shipping-charges/${row.id}`}>#{row.id}</Link>,
    },
    { id: "city_name", label: "City" },
    {
      id: "charge", label: "Charge", sortKey: "charge",
      render: (row: { charge: string | number }) => <span className="font-medium text-emerald-700 dark:text-emerald-400">रु {Number(row.charge).toLocaleString()}</span>,
    },
    { id: "created_at", label: "Created", sortKey: "created_at", render: (row: { created_at: string }) => new Date(row.created_at).toLocaleDateString() },
    {
      id: "actions",
      label: "Actions",
      render: (row: { id: number }) => (
        <AdminRowActions
          viewHref={`/system/shipping-charges/${row.id}`}
          editHref={`/system/shipping-charges/${row.id}/edit`}
          onDelete={async () => {
            await adminApi.deleteShippingCharge(row.id);
            qc.invalidateQueries({ queryKey: adminKeys.shippingCharges(params) });
          }}
          deleteConfirmLabel="Delete this shipping charge? This action cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Shipping Charges</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage shipping charges by city</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/shipping-charges/new">Add</Link>
        </Button>
      </div>
      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "text", name: "city", label: "City ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="City name or charge ID..."
      />
      <Card>
        <CardContent className="p-0">
          <AdminDataTable columns={columns} data={results} keyFn={(row) => (row as { id: number }).id} orderBy={orderBy} onOrderByChange={setOrderBy} isLoading={isLoading} emptyMessage="No shipping charges." />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
