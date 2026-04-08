import { useState } from "react";
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
import { useAdminSalesList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sales, SalesStatus } from "@/api/types";

const PAGE_SIZE = 20;
const STATUSES: SalesStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled", "rejected"];

export default function Sales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const payment_status = searchParams.get("payment_status") || undefined;
  const user = searchParams.get("user") || undefined;
  const vendor = searchParams.get("vendor") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, status, payment_status, user, vendor, search, date_from, date_to };
  const { data, isLoading, error } = useAdminSalesList(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const [statusDialog, setStatusDialog] = useState<{ id: number; next: SalesStatus } | null>(null);

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.sales(params) });

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={2} tableColumns={8} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (s: Sales) => <Link className="text-primary underline font-medium" to={`/system/sales/${s.id}`}>#{s.id}</Link>,
    },
    {
      id: "user",
      label: "User",
      render: (s: Sales) => (
        <AdminUserColumnCell userId={s.user} userPhone={s.user_phone} />
      ),
    },
    { id: "vendor_name", label: "Vendor", render: (s: Sales) => s.vendor_name ?? "—" },
    {
      id: "total",
      label: "Total",
      sortKey: "total",
      render: (s: Sales) => <span className="text-emerald-700 dark:text-emerald-400 font-medium">रु {Number(s.total).toLocaleString()}</span>,
    },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (s: Sales) => (
        <Select
          key={`${s.id}-${s.status}`}
          value={s.status}
          onValueChange={(v) => {
            const next = v as SalesStatus;
            if (next !== s.status) setStatusDialog({ id: s.id, next });
          }}
        >
          <SelectTrigger className="h-8 w-[140px] border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((st) => (
              <SelectItem key={st} value={st}>
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "payment_status",
      label: "Payment",
      render: (s: Sales) => <Badge variant="outline">{s.payment_status_display || s.payment_status}</Badge>,
    },
    {
      id: "actions",
      label: "Actions",
      render: (s: Sales) => (
        <AdminRowActions
          viewHref={`/system/sales/${s.id}`}
          onDelete={async () => {
            try {
              await adminApi.deleteSale(s.id);
              invalidate();
            } catch {
              toast({ variant: "destructive", title: "Failed to delete sale" });
            }
          }}
          deleteConfirmLabel="Delete this order and its line items? This cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Sales</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Orders · click status to change (confirm)</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/sales/new">Add Sale</Link>
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
            options: STATUSES.map((st) => ({ value: st, label: st })),
          },
          {
            type: "select",
            name: "payment_status",
            label: "Payment",
            options: [
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Paid" },
              { value: "failed", label: "Failed" },
            ],
          },
          { type: "text", name: "user", label: "User ID" },
          { type: "text", name: "vendor", label: "Vendor ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="User phone, vendor, order ID..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(s) => s.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No sales."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}

      <AlertDialog open={!!statusDialog} onOpenChange={(o) => !o && setStatusDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change order status?</AlertDialogTitle>
            <AlertDialogDescription>Update order #{statusDialog?.id} to {statusDialog?.next}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!statusDialog) return;
                await adminApi.updateSaleStatus(statusDialog.id, statusDialog.next);
                setStatusDialog(null);
                invalidate();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
