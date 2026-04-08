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
import { useAdminPayoutAccountList, adminKeys } from "@/api/hooks";
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
import type { PayoutAccount } from "@/api/types";

const PAGE_SIZE = 20;

export default function PayoutAccountsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, status, search, date_from, date_to };
  const { data, isLoading, error } = useAdminPayoutAccountList(params);
  const qc = useQueryClient();
  const { toast } = useToast();
  const accounts = data?.results ?? [];
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

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.payoutAccounts(params) });

  if (isLoading && accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Payout Accounts</h1>
          <p className="text-muted-foreground">Approve or reject payout methods</p>
        </div>
        <AdminListSkeleton statsCount={4} filterRows={2} tableColumns={7} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (acc: PayoutAccount) => <Link className="text-primary underline font-medium" to={`/system/payout-accounts/${acc.id}`}>#{acc.id}</Link>,
    },
    {
      id: "user",
      label: "User",
      render: (acc: PayoutAccount) => (
        <AdminUserColumnCell userId={acc.user} userPhone={acc.user_phone} />
      ),
    },
    { id: "method", label: "Method", sortKey: "payment_method", render: (acc: PayoutAccount) => acc.payment_method_display ?? acc.payment_method },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (acc: PayoutAccount) => (
        <Badge variant={acc.status === "approved" ? "default" : acc.status === "rejected" ? "destructive" : "secondary"}>{acc.status}</Badge>
      ),
    },
    {
      id: "detail",
      label: "Detail",
      render: (acc: PayoutAccount) => (
        <span className="text-sm">
          {acc.phone || acc.bank_account_no || "—"}
        </span>
      ),
    },
    {
      id: "created_at",
      label: "Created",
      sortKey: "created_at",
      render: (acc: PayoutAccount) => new Date(acc.created_at).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (acc: PayoutAccount) => (
        <div className="flex flex-wrap items-center gap-2">
          <AdminRowActions
            viewHref={`/system/payout-accounts/${acc.id}`}
            onDelete={async () => {
              try {
                await adminApi.deletePayoutAccount(acc.id);
                invalidate();
              } catch {
                toast({ variant: "destructive", title: "Failed to delete payout account" });
              }
            }}
            deleteConfirmLabel="Delete this payout account?"
          />
          {acc.status === "pending" && (
            <>
              <Button size="sm" onClick={() => setApproveId(acc.id)}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectId(acc.id)}>
                Reject
              </Button>
            </>
          )}
          {acc.qr_image_url && (
            <a href={acc.qr_image_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              QR
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Payout Accounts</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Search, metrics, and moderation</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/payout-accounts/new">Add Payout Account</Link>
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
        searchPlaceholder="User phone, bank account, or ID..."
        searchParamName="search"
      />

      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={accounts}
            keyFn={(a) => a.id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No payout accounts."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}

      <AlertDialog open={approveId != null} onOpenChange={(o) => !o && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve payout account?</AlertDialogTitle>
            <AlertDialogDescription>User can use this method for withdrawals.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (approveId == null) return;
                await adminApi.approvePayoutAccount(approveId);
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
            <DialogTitle>Reject payout account</DialogTitle>
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
                await adminApi.rejectPayoutAccount(rejectId, rejectReason);
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
