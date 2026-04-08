import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
  AdminUserColumnCell,
} from "@/components/admin";
import { useAdminReceivedRecordList, adminKeys } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReceivedRecord } from "@/api/types";

const PAGE_SIZE = 20;

export default function ReceivedRecords() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const vendor = searchParams.get("vendor") || undefined;
  const user = searchParams.get("user") || undefined;
  const payment_method = searchParams.get("payment_method") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, vendor, user, payment_method, date_from, date_to };
  const { data, isLoading, error } = useAdminReceivedRecordList(params);
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
        <div><h1 className="text-2xl font-bold">Received Records</h1><p className="text-muted-foreground">Manage received records</p></div>
        <AdminListSkeleton statsCount={2} filterRows={2} tableColumns={7} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: { id: number }) => <Link className="text-primary underline font-medium" to={`/system/received-records/${row.id}`}>#{row.id}</Link>,
    },
    { id: "name", label: "Name", sortKey: "name" },
    {
      id: "user_col",
      label: "User",
      render: (row: ReceivedRecord) => (
        <AdminUserColumnCell userId={row.user} userPhone={row.user_phone} />
      ),
    },
    { id: "amount", label: "Amount" },
    { id: "vendor_name", label: "Vendor", render: (row: { vendor_name?: string }) => row.vendor_name ?? "—" },
    { id: "created_at", label: "Created", sortKey: "created_at", render: (row: { created_at: string }) => new Date(row.created_at).toLocaleDateString() },
    {
      id: "actions",
      label: "Actions",
      render: (row: { id: number }) => (
        <AdminRowActions
          viewHref={`/system/received-records/${row.id}`}
          editHref={`/system/received-records/${row.id}/edit`}
          onDelete={async () => {
            await adminApi.deleteReceivedRecord(row.id);
            qc.invalidateQueries({ queryKey: adminKeys.receivedRecords(params) });
          }}
          deleteConfirmLabel="Delete this received record? This action cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Received Records</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage received records</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/received-records/new">Add</Link>
        </Button>
      </div>
      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "text", name: "vendor", label: "Vendor ID" },
          { type: "text", name: "user", label: "User ID" },
          {
            type: "select",
            name: "payment_method",
            label: "Method",
            options: [
              { value: "esewa", label: "eSewa", paymentMethodBrand: true },
              { value: "khalti", label: "Khalti", paymentMethodBrand: true },
              { value: "bank", label: "Bank", paymentMethodBrand: true },
            ],
          },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Search name..."
        searchParamName="search"
      />
      <Card>
        <CardContent className="p-0">
          <AdminDataTable columns={columns} data={results} keyFn={(row) => (row as { id: number }).id} orderBy={orderBy} onOrderByChange={setOrderBy} isLoading={isLoading} emptyMessage="No received records." />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
