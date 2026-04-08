import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminDeposit, useAdminDeleteDeposit, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Clock, ImageIcon } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";

const statusColor = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function DepositView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: deposit, isLoading, error, refetch } = useAdminDeposit(pid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteDeposit();

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !deposit) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (error || !deposit) return (
    <div className="space-y-2">
      <p className="text-destructive">Deposit not found.</p>
      <Link to="/system/deposits"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
    </div>
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.deposits({}) });
    if (pid) qc.invalidateQueries({ queryKey: adminKeys.deposit(pid) });
  };

  const isPending = deposit.status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/system/deposits"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Deposits</Button></Link>
          </div>
          <h1 className="text-3xl font-bold">Deposit #{deposit.id}</h1>
          <p className="text-muted-foreground mt-1">
            Submitted {new Date(deposit.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/deposits/${pid}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          {isPending && (
            <>
              <Button onClick={() => setApproveOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <AdminUserViewCard userId={deposit.user} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              रु {Number(deposit.amount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-2">
              <Badge variant={statusColor(deposit.status)} className="text-sm px-3 py-1">
                {deposit.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                {deposit.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                {deposit.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                {deposit.status_display || deposit.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="text-xl font-semibold capitalize mt-1">{deposit.payment_method_display || deposit.payment_method}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Deposit Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">ID</span>
              <span className="font-medium">#{deposit.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">रु {Number(deposit.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Method</span>
              <span>{deposit.payment_method_display || deposit.payment_method}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Transaction / Reference ID</span>
              <span className="font-mono text-xs max-w-[60%] text-right break-all">
                {deposit.payment_transaction_id || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusColor(deposit.status)}>{deposit.status_display || deposit.status}</Badge>
            </div>
            {deposit.paid_date_time && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Paid at</span>
                <span>{new Date(deposit.paid_date_time).toLocaleString()}</span>
              </div>
            )}
            {deposit.payout_account_detail && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Payout Account</span>
                <Link to={`/system/payout-accounts/${deposit.payout_account_detail.id}`} className="text-primary underline">
                  {deposit.payout_account_detail.payment_method_display || deposit.payout_account_detail.payment_method}
                </Link>
              </div>
            )}
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(deposit.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(deposit.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {deposit.remarks && (
            <Card>
              <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">{deposit.remarks}</p>
              </CardContent>
            </Card>
          )}
          {deposit.reject_reason && (
            <Card className="border-destructive">
              <CardHeader><CardTitle className="text-destructive">Rejection Reason</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{deposit.reject_reason}</p>
              </CardContent>
            </Card>
          )}
          {deposit.screenshot_url && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Payment Screenshot</CardTitle></CardHeader>
              <CardContent>
                <a href={deposit.screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={deposit.screenshot_url} alt="Payment screenshot" className="max-h-64 rounded-md border object-contain w-full" />
                </a>
                <a href={deposit.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-2 block">
                  Open full size
                </a>
              </CardContent>
            </Card>
          )}
          {!deposit.screenshot_url && !deposit.remarks && !deposit.reject_reason && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No screenshot attached</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve dialog */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Deposit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will credit <strong>रु {Number(deposit.amount).toLocaleString()}</strong> to User #{deposit.user}&apos;s topup wallet and record a transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await adminApi.approveDeposit(deposit.id);
                toast({ title: "Deposit approved", description: `रु ${Number(deposit.amount).toLocaleString()} credited.` });
                setApproveOpen(false);
                invalidate();
                refetch();
              } catch { toast({ variant: "destructive", title: "Failed to approve" }); }
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Deposit #{deposit.id}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Provide a rejection reason for the user.</p>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={async () => {
              try {
                await adminApi.rejectDeposit(deposit.id, rejectReason);
                toast({ title: "Deposit rejected" });
                setRejectOpen(false);
                setRejectReason("");
                invalidate();
                refetch();
              } catch { toast({ variant: "destructive", title: "Failed to reject" }); }
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deposit?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(deposit.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/deposits"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
