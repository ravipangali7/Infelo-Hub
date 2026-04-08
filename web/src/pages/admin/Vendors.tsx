import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminVendorList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/api/types";

const PAGE_SIZE = 20;

export default function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, date_from, date_to };
  const { data, isLoading, error } = useAdminVendorList(params);
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
          <h1 className="text-2xl font-bold">Vendors</h1>
        </div>
        <AdminListSkeleton statsCount={2} filterRows={1} tableColumns={6} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (v: Vendor) => <Link className="text-primary underline font-medium" to={`/system/vendors/${v.id}`}>#{v.id}</Link>,
    },
    {
      id: "name", label: "Name", sortKey: "name",
      render: (v: Vendor) => (
        <Link className="font-medium hover:underline" to={`/system/vendors/${v.id}`}>{v.name}</Link>
      ),
    },
    { id: "phone", label: "Phone", sortKey: "phone" },
    {
      id: "payable",
      label: "Payable",
      render: (v: Vendor) => <span className="text-amber-700 dark:text-amber-300">रु {Number(v.payable).toLocaleString()}</span>,
    },
    {
      id: "receivable",
      label: "Receivable",
      render: (v: Vendor) => <span className="text-sky-700 dark:text-sky-300">रु {Number(v.receivable).toLocaleString()}</span>,
    },
    {
      id: "actions",
      label: "Actions",
      render: (v: Vendor) => (
        <AdminRowActions
          viewHref={`/system/vendors/${v.id}`}
          editHref={`/system/vendors/${v.id}/edit`}
          onDelete={async () => {
            try {
              await adminApi.deleteVendor(v.id);
              qc.invalidateQueries({ queryKey: adminKeys.vendors(params) });
            } catch {
              toast({ variant: "destructive", title: "Failed to delete vendor" });
            }
          }}
          deleteConfirmLabel="Delete this vendor? Products may be unlinked. This cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Balances and profiles</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/vendors/new">Add vendor</Link>
        </Button>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm title="Filters" fields={[{ type: "date", name: "date_from", label: "From" }, { type: "date", name: "date_to", label: "To" }]} searchPlaceholder="Name or phone..." />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(v) => v.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No vendors."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
