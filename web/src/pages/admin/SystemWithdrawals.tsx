import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  AdminFilterForm,
  AdminDataTable,
  AdminPagination,
  AdminListSkeleton,
  AdminRowActions,
  AdminModuleSummary,
} from "@/components/admin";
import { useAdminSystemWithdrawalList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { SystemWithdrawal } from "@/api/types";

const PAGE_SIZE = 20;

export default function SystemWithdrawals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || String(PAGE_SIZE), 10)));
  const orderBy = searchParams.get("order_by") || undefined;
  const status = searchParams.get("status") || undefined;
  const date_from = searchParams.get("date_from") || undefined;
  const date_to = searchParams.get("date_to") || undefined;

  const params = { page, page_size: pageSize, order_by: orderBy, status, date_from, date_to };
  const { data, isLoading, error } = useAdminSystemWithdrawalList(params);
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

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawals(params) });

  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">System Withdrawals</h1><p className="text-muted-foreground">Manage system withdrawals</p></div>
        <AdminListSkeleton statsCount={2} filterRows={1} tableColumns={5} tableRows={10} />
      </div>
    );
  }

  const columns = [
    {
      id: "id", label: "ID", sortKey: "id",
      render: (row: SystemWithdrawal) => <Link className="text-primary underline font-medium" to={`/system/system-withdrawals/${row.id}`}>#{row.id}</Link>,
    },
    {
      id: "amount", label: "Amount", sortKey: "amount",
      render: (row: SystemWithdrawal) => (
        <span className="font-medium text-amber-700 dark:text-amber-400">रु {Number(row.amount).toLocaleString()}</span>
      ),
    },
    {
      id: "status", label: "Status", sortKey: "status",
      render: (row: SystemWithdrawal) => (
        <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: "created_at", label: "Created", sortKey: "created_at",
      render: (row: SystemWithdrawal) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: SystemWithdrawal) => (
        <div className="flex flex-wrap gap-1">
          <AdminRowActions
            viewHref={`/system/system-withdrawals/${row.id}`}
            onDelete={async () => {
              try {
                await adminApi.deleteSystemWithdrawal(row.id);
                invalidate();
              } catch {
                toast({ variant: "destructive", title: "Failed to delete system withdrawal" });
              }
            }}
            deleteConfirmLabel="Delete this system withdrawal record?"
          />
          {row.status === "pending" && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => setApproveId(row.id)}>Approve</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setRejectId(row.id); setRejectReason(""); }}>Reject</Button>
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
          <h1 className="text-xl md:text-2xl font-bold">System Withdrawals</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage system withdrawals</p>
        </div>
        <Button asChild className="w-full sm:w-auto shrink-0">
          <Link to="/system/system-withdrawals/new">Add System Withdrawal</Link>
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
      />
      <Card>
        <CardContent className="p-0">
          <AdminDataTable
            columns={columns}
            data={results}
            keyFn={(row) => (row as SystemWithdrawal).id}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            isLoading={isLoading}
            emptyMessage="No system withdrawals."
          />
        </CardContent>
        <AdminPagination count={count} pageSize={pageSize} page={page} />
      </Card>
      {error && <p className="text-destructive text-sm">Failed to load.</p>}

      {/* Approve Dialog */}
      <AlertDialog open={approveId !== null} onOpenChange={(o) => !o && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve System Withdrawal #{approveId}?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the system withdrawal as approved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!approveId) return;
              await adminApi.approveSystemWithdrawal(approveId);
              setApproveId(null);
              invalidate();
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject System Withdrawal #{rejectId}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Rejection reason</label>
            <Input
              placeholder="Enter reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!rejectId) return;
              await adminApi.rejectSystemWithdrawal(rejectId, rejectReason);
              setRejectId(null);
              invalidate();
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
