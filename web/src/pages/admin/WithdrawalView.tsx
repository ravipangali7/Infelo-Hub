import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminWithdrawal, useAdminDeleteWithdrawal, adminKeys } from "@/api/hooks";
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
import { ArrowLeft, CheckCircle2, XCircle, Clock, CreditCard, ImageIcon } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";

const statusColor = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function WithdrawalView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: withdrawal, isLoading, error, refetch } = useAdminWithdrawal(pid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteWithdrawal();

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !withdrawal) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (error || !withdrawal) return (
    <div className="space-y-2">
      <p className="text-destructive">Withdrawal not found.</p>
      <Link to="/system/withdrawals"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
    </div>
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.withdrawals({}) });
    if (pid) qc.invalidateQueries({ queryKey: adminKeys.withdrawal(pid) });
  };

  const isPending = withdrawal.status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/system/withdrawals"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Withdrawals</Button></Link>
          </div>
          <h1 className="text-3xl font-bold">Withdrawal #{withdrawal.id}</h1>
          <p className="text-muted-foreground mt-1">Submitted {new Date(withdrawal.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/withdrawals/${pid}/edit`}>
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

      <AdminUserViewCard userId={withdrawal.user} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Amount Requested</p>
            <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              रु {Number(withdrawal.amount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-2">
              <Badge variant={statusColor(withdrawal.status)} className="text-sm px-3 py-1">
                {withdrawal.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                {withdrawal.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                {withdrawal.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                {withdrawal.status_display || withdrawal.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <div className="flex items-center gap-2 mt-1">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-xl font-semibold capitalize">{withdrawal.payment_method_display || withdrawal.payment_method}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Withdrawal Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">ID</span>
              <span className="font-medium">#{withdrawal.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-orange-700 dark:text-orange-400">रु {Number(withdrawal.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Source wallet</span>
              <span>
                {withdrawal.withdrawal_wallet_type_display?.trim()
                  ? withdrawal.withdrawal_wallet_type_display
                  : withdrawal.withdrawal_wallet_type === "topup"
                    ? "Top-up wallet"
                    : withdrawal.withdrawal_wallet_type === "earning"
                      ? "Earning wallet"
                      : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize">{withdrawal.payment_method_display || withdrawal.payment_method}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Transaction / Reference ID</span>
              <span className="font-mono text-xs max-w-[60%] text-right break-all">
                {withdrawal.payment_transaction_id || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusColor(withdrawal.status)}>{withdrawal.status_display || withdrawal.status}</Badge>
            </div>
            {withdrawal.paid_date_time && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Paid at</span>
                <span>{new Date(withdrawal.paid_date_time).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(withdrawal.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(withdrawal.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {withdrawal.payout_account_detail && (
            <Card>
              <CardHeader><CardTitle>Payout Account</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link to={`/system/payout-accounts/${withdrawal.payout_account_detail.id}`} className="text-primary underline font-medium">
                  Account #{withdrawal.payout_account_detail.id}
                </Link>
                <p className="text-sm">
                  {withdrawal.payout_account_detail.payment_method_display || withdrawal.payout_account_detail.payment_method}
                </p>
                <p className="text-sm text-muted-foreground">
                  {withdrawal.payout_account_detail.phone || withdrawal.payout_account_detail.bank_account_no || "—"}
                </p>
              </CardContent>
            </Card>
          )}
          {withdrawal.remarks && (
            <Card>
              <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{withdrawal.remarks}</p></CardContent>
            </Card>
          )}
          {withdrawal.reject_reason && (
            <Card className="border-destructive">
              <CardHeader><CardTitle className="text-destructive">Rejection Reason</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-destructive">{withdrawal.reject_reason}</p></CardContent>
            </Card>
          )}
          {withdrawal.screenshot_url && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Screenshot</CardTitle></CardHeader>
              <CardContent>
                <a href={withdrawal.screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={withdrawal.screenshot_url} alt="Screenshot" className="max-h-64 rounded-md border object-contain w-full" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deduct <strong>रु {Number(withdrawal.amount).toLocaleString()}</strong> from User #{withdrawal.user}&apos;s earning wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await adminApi.approveWithdrawal(withdrawal.id);
                toast({ title: "Withdrawal approved" });
                setApproveOpen(false);
                invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed" }); }
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Withdrawal #{withdrawal.id}</DialogTitle></DialogHeader>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={async () => {
              try {
                await adminApi.rejectWithdrawal(withdrawal.id, rejectReason);
                toast({ title: "Withdrawal rejected" });
                setRejectOpen(false); setRejectReason("");
                invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed" }); }
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(withdrawal.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/withdrawals"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
