import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminPayoutAccount, useAdminDeletePayoutAccount, adminKeys } from "@/api/hooks";
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
import { ArrowLeft, CheckCircle2, XCircle, Clock, CreditCard, QrCode } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";

const statusColor = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function PayoutAccountView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: account, isLoading, error, refetch } = useAdminPayoutAccount(pid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeletePayoutAccount();

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !account) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
    </div>
  );
  if (error || !account) return (
    <div className="space-y-2">
      <p className="text-destructive">Payout account not found.</p>
      <Link to="/system/payout-accounts"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
    </div>
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.payoutAccounts({}) });
    if (pid) qc.invalidateQueries({ queryKey: adminKeys.payoutAccount(pid) });
  };

  const isPending = account.status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/payout-accounts"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Payout Accounts</Button></Link>
          <h1 className="text-3xl font-bold">Payout Account #{account.id}</h1>
          <p className="text-muted-foreground mt-1">{account.user_name || `User #${account.user}`} · {account.payment_method_display || account.payment_method}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/payout-accounts/${pid}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          {isPending && (
            <>
              <Button onClick={() => setApproveOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1" />Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" />Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-lg p-4 flex items-center gap-3 ${
        account.status === "approved" ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200" :
        account.status === "rejected" ? "bg-red-50 dark:bg-red-950 border border-red-200" :
        "bg-amber-50 dark:bg-amber-950 border border-amber-200"
      }`}>
        {account.status === "approved" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {account.status === "rejected" && <XCircle className="h-5 w-5 text-red-600" />}
        {account.status === "pending" && <Clock className="h-5 w-5 text-amber-600" />}
        <div>
          <p className="font-medium capitalize">{account.status_display || account.status}</p>
          {account.reject_reason && <p className="text-sm text-muted-foreground">{account.reject_reason}</p>}
        </div>
        <Badge variant={statusColor(account.status)} className="ml-auto">{account.status_display || account.status}</Badge>
      </div>

      <AdminUserViewCard userId={account.user} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-medium">#{account.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium capitalize">{account.payment_method_display || account.payment_method}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusColor(account.status)}>{account.status_display || account.status}</Badge>
            </div>
            {account.phone && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{account.phone}</span>
              </div>
            )}
            {account.bank_name && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Bank Name</span>
                <span>{account.bank_name}</span>
              </div>
            )}
            {account.bank_branch && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Branch</span>
                <span>{account.bank_branch}</span>
              </div>
            )}
            {account.bank_account_no && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Account No.</span>
                <span className="font-mono">{account.bank_account_no}</span>
              </div>
            )}
            {account.bank_account_holder_name && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Holder Name</span>
                <span>{account.bank_account_holder_name}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(account.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(account.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {account.qr_image_url ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />QR Code</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <img src={account.qr_image_url} alt="QR Code" className="max-h-64 rounded-md border object-contain" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No QR code attached</p>
              </CardContent>
            </Card>
          )}
          {account.reject_reason && (
            <Card className="border-destructive">
              <CardHeader><CardTitle className="text-destructive">Rejection Reason</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-destructive">{account.reject_reason}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payout Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the {account.payment_method_display || account.payment_method} account for User #{account.user}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await adminApi.approvePayoutAccount(account.id);
                toast({ title: "Account approved" });
                setApproveOpen(false); invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed" }); }
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payout Account #{account.id}</DialogTitle></DialogHeader>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={async () => {
              try {
                await adminApi.rejectPayoutAccount(account.id, rejectReason);
                toast({ title: "Account rejected" });
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
            <AlertDialogTitle>Delete Payout Account?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(account.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/payout-accounts"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
