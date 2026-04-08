import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminTransaction, useAdminDeleteTransaction } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const statusColor = (s: string) =>
  s === "success" ? "default" : s === "failed" ? "destructive" : "secondary";

const typeColor = (t: string) =>
  t === "added" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";

export default function TransactionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pid = id ? parseInt(id, 10) : null;
  const { data: tx, isLoading, error } = useAdminTransaction(pid);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteTransaction();
  const { toast } = useToast();

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !tx) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (error || !tx) return (
    <div className="space-y-2">
      <p className="text-destructive">Transaction not found.</p>
      <Link to="/system/transactions"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
    </div>
  );

  const isAdded = tx.transaction_type === "added";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/transactions"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Transactions</Button></Link>
          <h1 className="text-3xl font-bold">Transaction #{tx.id}</h1>
          <p className="text-muted-foreground mt-1">{new Date(tx.created_at).toLocaleString()}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>Delete</Button>
          <Badge variant={statusColor(tx.status)} className="text-sm px-3 py-1">
            {tx.status === "success" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
            {tx.status === "failed" && <XCircle className="h-3 w-3 mr-1 inline" />}
            {tx.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
            {tx.status_display || tx.status}
          </Badge>
        </div>
      </div>

      <AdminUserViewCard userId={tx.user} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`border-l-4 ${isAdded ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Amount</p>
              {isAdded ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
            <p className={`text-3xl font-bold ${typeColor(tx.transaction_type)}`}>
              {isAdded ? "+" : "-"}रु {Number(tx.amount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Type</p>
            <Badge variant={isAdded ? "default" : "destructive"} className="text-sm">
              {isAdded ? <TrendingUp className="h-3 w-3 mr-1 inline" /> : <TrendingDown className="h-3 w-3 mr-1 inline" />}
              {tx.transaction_type_display || tx.transaction_type}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">For</p>
            <p className="text-lg font-semibold capitalize">{tx.transaction_for_display || tx.transaction_for || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>Transaction Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">ID</span>
            <span className="font-medium">#{tx.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Amount</span>
            <span className={`font-bold text-lg ${typeColor(tx.transaction_type)}`}>
              {isAdded ? "+" : "-"}रु {Number(tx.amount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Type</span>
            <Badge variant={isAdded ? "default" : "destructive"}>{tx.transaction_type_display || tx.transaction_type}</Badge>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">For</span>
            <span className="capitalize">{tx.transaction_for_display || tx.transaction_for || "—"}</span>
          </div>
          {tx.payment_request_type && (
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Payment Request</span>
              <span className="capitalize">{tx.payment_request_type} ({tx.payment_request_status || "—"})</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusColor(tx.status)}>{tx.status_display || tx.status}</Badge>
          </div>
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">System Transaction</span>
            <span>{tx.is_system ? "Yes" : "No"}</span>
          </div>
          {tx.remarks && (
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Remarks</span>
              <span className="text-right max-w-xs">{tx.remarks}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(tx.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Updated</span>
            <span>{new Date(tx.updated_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>Remove this ledger row permanently. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMut.mutate(tx.id, {
                  onSuccess: () => {
                    toast({ title: "Transaction deleted" });
                    navigate("/system/transactions");
                  },
                  onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
