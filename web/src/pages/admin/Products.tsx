import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminProductList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Product } from "@/api/types";

const PAGE_SIZE = 20;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const search = searchParams.get("search") || undefined;
  const category = searchParams.get("category") || undefined;
  const is_active = searchParams.get("is_active") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, search, category, is_active, date_from, date_to };
  const { data, isLoading, error } = useAdminProductList(params);
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

  const hasFilters =
    Boolean((search ?? "").trim()) ||
    Boolean((category ?? "").trim()) ||
    Boolean((is_active ?? "").trim()) ||
    Boolean((date_from ?? "").trim()) ||
    Boolean((date_to ?? "").trim());
  const sortAllowsDrag = !orderBy || orderBy === "order_sort";
  const canDragReorder = !isLoading && !hasFilters && sortAllowsDrag;

  const reorderQueryParams: Record<string, string | number | undefined> = {
    page,
    page_size: pageSize,
    ...(orderBy ? { order_by: orderBy } : {}),
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Catalog</p>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={2} tableColumns={9} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (p: Product) => <Link className="text-primary underline font-medium" to={`/system/products/${p.id}`}>#{p.id}</Link>,
    },
    { id: "name", label: "Name", sortKey: "name" },
    {
      id: "order_sort",
      label: "Order",
      sortKey: "order_sort",
      render: (p: Product) => <span className="font-mono text-muted-foreground tabular-nums">{p.order_sort ?? "—"}</span>,
    },
    {
      id: "selling_price",
      label: "Price",
      sortKey: "selling_price",
      render: (p: Product) => <span className="text-emerald-700 dark:text-emerald-400 font-medium">रु {Number(p.selling_price).toLocaleString()}</span>,
    },
    {
      id: "purchasing_price",
      label: "Purchase Price",
      sortKey: "purchasing_price",
      render: (p: Product) => <span className="font-medium">रु {Number(p.purchasing_price).toLocaleString()}</span>,
    },
    {
      id: "stock",
      label: "Stock",
      sortKey: "stock",
      render: (p: Product) => (
        <span className={p.stock > 50 ? "text-emerald-700 dark:text-emerald-400 font-medium" : p.stock > 10 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
          {p.stock}
        </span>
      ),
    },
    {
      id: "is_active",
      label: "Active",
      sortKey: "is_active",
      toggle: {
        getValue: (p: Product) => p.is_active,
        label: "Active",
        onConfirm: async (p: Product, newValue: boolean) => {
          await adminApi.updateProduct(p.id, { is_active: newValue });
          qc.invalidateQueries({ queryKey: adminKeys.products(params) });
        },
      },
    },
    { id: "category_name", label: "Category", render: (p: Product) => p.category_name ?? "—" },
    {
      id: "actions",
      label: "Actions",
      render: (p: Product) => (
        <AdminRowActions
          viewHref={`/system/products/${p.id}`}
          editHref={`/system/products/${p.id}/edit`}
          onDelete={async () => {
            await adminApi.deleteProduct(p.id);
            qc.invalidateQueries({ queryKey: adminKeys.products(params) });
          }}
          deleteConfirmLabel="Delete this product?"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
          Full CRUD and metrics
          {hasFilters || !sortAllowsDrag ? (
            <span className="block mt-1 text-amber-700 dark:text-amber-400">
              Clear filters and sort by Order (asc) on desktop to drag rows and save display order.
            </span>
          ) : null}
        </p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/products/new">Add</Link>
        </Button>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} />
      <AdminFilterForm
        title="Filters"
        fields={[
          { type: "text", name: "category", label: "Category ID" },
          {
            type: "select",
            name: "is_active",
            label: "Active",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Search by name..."
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
            emptyMessage="No products."
            rowDrag={{
              enabled: canDragReorder,
              onReorder: async (ordered) => {
                try {
                  await adminApi.reorderProductsPage(
                    ordered.map((p) => p.id),
                    reorderQueryParams
                  );
                  toast({ title: "Product order saved" });
                  await qc.invalidateQueries({ queryKey: adminKeys.products(params) });
                } catch (e) {
                  const msg = e instanceof ApiError ? e.detail : "Request failed";
                  toast({ variant: "destructive", title: "Could not save order", description: msg });
                }
              },
            }}
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
