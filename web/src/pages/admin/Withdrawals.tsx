import { useState } from "react";
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
import { useAdminWithdrawalList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentRequest } from "@/api/types";

const PAGE_SIZE = 20;

export default function Withdrawals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, status, search, date_from, date_to };
  const { data, isLoading, error } = useAdminWithdrawalList(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const results = data?.results ?? [];
  const count = data?.count ?? 0;
  const summary = data?.summary as Record<string, unknown> | undefined;

  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const setOrderBy = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("order_by", value);
    else next.delete("order_by");
    next.delete("page");
    setSearchParams(next);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.withdrawals(params) });

  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Approve or reject withdrawals</p>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={2} tableColumns={9} tableRows={10} />
      </div>
    );
  }

  const statusBadge = (d: PaymentRequest) => (
    <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
      {d.status}
    </Badge>
  );

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: PaymentRequest) => <Link className="text-primary underline font-medium" to={`/system/withdrawals/${row.id}`}>#{row.id}</Link>,
    },
    {
      id: "user",
      label: "User",
      render: (row: PaymentRequest) => (
        <AdminUserColumnCell userId={row.user} userPhone={row.user_phone} />
      ),
    },
    {
      id: "amount",
      label: "Amount",
      sortKey: "amount",
      render: (row: PaymentRequest) => <span className="font-medium text-amber-700 dark:text-amber-400">रु {Number(row.amount).toLocaleString()}</span>,
    },
    {
      id: "wallet",
      label: "Wallet",
      render: (row: PaymentRequest) => {
        const d = row.withdrawal_wallet_type_display?.trim();
        if (d) return <span className="text-sm">{d}</span>;
        if (row.withdrawal_wallet_type === "topup") return <span className="text-sm">Top-up</span>;
        if (row.withdrawal_wallet_type === "earning") return <span className="text-sm">Earning</span>;
        return <span className="text-muted-foreground">—</span>;
      },
    },
    { id: "method", label: "Method", render: (row: PaymentRequest) => row.payment_method_display ?? row.payment_method },
    {
      id: "ref_id",
      label: "Ref / Txn ID",
      render: (row: PaymentRequest) => {
        const t = row.payment_transaction_id?.trim();
        if (!t) return <span className="text-muted-foreground">—</span>;
        const short = t.length > 14 ? `${t.slice(0, 14)}…` : t;
        return <span className="font-mono text-xs" title={t}>{short}</span>;
      },
    },
    { id: "status", label: "Status", sortKey: "status", render: statusBadge },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (row: PaymentRequest) => new Date(row.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: PaymentRequest) => (
        <div className="flex flex-wrap items-center gap-2">
          <AdminRowActions
            viewHref={`/system/withdrawals/${row.id}`}
            onDelete={async () => {
              try {
                await adminApi.deleteWithdrawal(row.id);
                invalidate();
              } catch {
                toast({ variant: "destructive", title: "Failed to delete withdrawal" });
              }
            }}
            deleteConfirmLabel="Delete this withdrawal request?"
          />
          {row.status === "pending" && (
            <>
              <Button size="sm" onClick={() => setApproveId(row.id)}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectId(row.id)}>
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Withdrawal Requests</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Search, filter, and moderate withdrawals</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/withdrawals/new">Add Withdrawal</Link>
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
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          { type: "date", name: "date_from", label: "From" },
          { type: "date", name: "date_to", label: "To" },
        ]}
        searchPlaceholder="User phone, name, or ID..."
        searchParamName="search"
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={results}
            keyFn={(row) => row.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No withdrawals."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}

      <AlertDialog open={approveId != null} onOpenChange={(o) => !o && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>This deducts from the user earning wallet and records a transaction.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (approveId == null) return;
                await adminApi.approveWithdrawal(approveId);
                setApproveId(null);
                invalidate();
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectId != null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject withdrawal</DialogTitle>
          </DialogHeader>
          <Input placeholder="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={async () => {
                if (rejectId == null || !rejectReason.trim()) return;
                await adminApi.rejectWithdrawal(rejectId, rejectReason);
                setRejectId(null);
                setRejectReason("");
                invalidate();
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
