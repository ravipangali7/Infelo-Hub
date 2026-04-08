import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminModuleSummary,
  AdminRowActions,
  AdminUserColumnCell,
} from "@/components/admin";
import { useAdminTransactionList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/api/types";

const PAGE_SIZE = 20;

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const transaction_type = searchParams.get("transaction_type") || undefined;
  const transaction_for = searchParams.get("transaction_for") || undefined;
  const user = searchParams.get("user") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = {
    page,
    page_size: pageSize,
    order_by: orderBy,
    status,
    transaction_type,
    transaction_for,
    user,
    search,
    date_from,
    date_to,
  };
  const { data, isLoading, error } = useAdminTransactionList(params);
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
          <h1 className="text-xl md:text-2xl font-bold">Transactions</h1>
        </div>
        <AdminListSkeleton statsCount={5} filterRows={2} tableColumns={8} tableRows={10} />
      </div>
    );
  }

  const amtClass = (t: Transaction) =>
    t.transaction_type === "added" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (t: Transaction) => <Link className="text-primary underline font-medium" to={`/system/transactions/${t.id}`}>#{t.id}</Link>,
    },
    {
      id: "user",
      label: "User",
      render: (t: Transaction) => (
        <AdminUserColumnCell userId={t.user} userPhone={t.user_phone} />
      ),
    },
    {
      id: "amount",
      label: "Amount",
      sortKey: "amount",
      render: (t: Transaction) => <span className={`font-medium ${amtClass(t)}`}>{t.transaction_type === "added" ? "+" : "-"}रु {Number(t.amount).toLocaleString()}</span>,
    },
    { id: "transaction_type", label: "Type", sortKey: "transaction_type", render: (t: Transaction) => <Badge variant={t.transaction_type === "added" ? "default" : "destructive"} className="text-xs">{t.transaction_type_display || t.transaction_type}</Badge> },
    { id: "transaction_for", label: "For", render: (t: Transaction) => <span className="text-xs capitalize">{t.transaction_for_display || t.transaction_for || "—"}</span> },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (t: Transaction) => (
        <Badge variant={t.status === "success" ? "default" : t.status === "failed" ? "destructive" : "secondary"} className="text-xs">{t.status}</Badge>
      ),
    },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (t: Transaction) => new Date(t.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (t: Transaction) => (
        <AdminRowActions
          viewHref={`/system/transactions/${t.id}`}
          onDelete={async () => {
            try {
              await adminApi.deleteTransaction(t.id);
              qc.invalidateQueries({ queryKey: adminKeys.transactions(params) });
            } catch {
              toast({ variant: "destructive", title: "Failed to delete transaction" });
            }
          }}
          deleteConfirmLabel="Remove this ledger row? This cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
          <h1 className="text-xl md:text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Ledger · deep filters</p>
      </div>

      <AdminModuleSummary summary={summary} loading={isLoading} maxItems={16} />
      <AdminFilterForm
        title="Filters"
        fields={[
          {
            type: "select",
            name: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "success", label: "Success" },
              { value: "failed", label: "Failed" },
            ],
          },
          {
            type: "select",
            name: "transaction_type",
            label: "Type",
            options: [
              { value: "added", label: "Added" },
              { value: "deducted", label: "Deducted" },
            ],
          },
          {
            type: "select",
            name: "transaction_for",
            label: "For",
            options: [
              { value: "deposit", label: "Deposit" },
              { value: "withdrawal", label: "Withdrawal" },
              { value: "package", label: "Package" },
              { value: "order", label: "Order" },
              { value: "system_withdrawal", label: "System withdrawal" },
              { value: "earning", label: "Earning" },
              { value: "task_reward", label: "Task reward" },
            ],
          },
          { type: "text", name: "user", label: "User ID" },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="Remarks, user phone..."
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={rows}
            keyFn={(t) => t.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No transactions."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}
    </div>
  );
}
