import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminSystemWithdrawal, useAdminDeleteSystemWithdrawal, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Clock, DollarSign, FileText } from "lucide-react";

const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function SystemWithdrawalView() {
  const { id } = useParams<{ id: string }>();
  const wid = id ? parseInt(id, 10) : null;
  const { data: w, isLoading, error, refetch } = useAdminSystemWithdrawal(wid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteSystemWithdrawal();

  useEffect(() => { if (w) setRemarks(w.remarks || ""); }, [w]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawals({}) });
    if (wid) qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawal(wid) });
  };

  if (!wid || isNaN(wid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !w) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !w) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/system-withdrawals">Back</Link></div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/system-withdrawals"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />System Withdrawals</Button></Link>
          <h1 className="text-3xl font-bold">System Withdrawal #{w.id}</h1>
          <p className="text-muted-foreground mt-1">Created {new Date(w.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/system-withdrawals/${wid}/edit`}><Button variant="outline">Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          {w.status === "pending" && (
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

      {/* Status Banner */}
      <div className={`rounded-lg p-4 flex items-center gap-3 border ${
        w.status === "approved" ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200" :
        w.status === "rejected" ? "bg-red-50 dark:bg-red-950 border-red-200" :
        "bg-amber-50 dark:bg-amber-950 border-amber-200"
      }`}>
        {w.status === "approved" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {w.status === "rejected" && <XCircle className="h-5 w-5 text-red-600" />}
        {w.status === "pending" && <Clock className="h-5 w-5 text-amber-600" />}
        <div>
          <p className="font-medium capitalize">{w.status_display || w.status}</p>
          {w.reject_reason && <p className="text-sm text-red-700 dark:text-red-300">{w.reject_reason}</p>}
        </div>
        <Badge variant={statusColor(w.status)} className="ml-auto capitalize">{w.status}</Badge>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Withdrawal Amount</p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-400 mt-1">
                  रु {Number(w.amount).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-violet-200 dark:text-violet-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Status</p>
            <div className="mt-2">
              <Badge variant={statusColor(w.status)} className="text-sm px-3 py-1">
                {w.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                {w.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                {w.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                {w.status_display || w.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Submitted</p>
            <p className="text-base font-semibold mt-1">{new Date(w.created_at).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">Updated: {new Date(w.updated_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle>Withdrawal Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${w.id}`],
              ["Amount", `रु ${Number(w.amount).toLocaleString()}`],
              ["Status", null],
              ["Created", new Date(w.created_at).toLocaleString()],
              ["Updated", new Date(w.updated_at).toLocaleString()],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Status" ? (
                  <Badge variant={statusColor(w.status)} className="text-xs capitalize">{w.status}</Badge>
                ) : (
                  <span className={`text-sm font-medium ${label === "Amount" ? "text-violet-700 dark:text-violet-400 text-base font-bold" : ""}`}>{val as string}</span>
                )}
              </div>
            ))}
            {w.reject_reason && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 text-sm text-red-700 dark:text-red-300">
                <strong>Rejected:</strong> {w.reject_reason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remarks editor */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Remarks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="remarks">Internal remarks (admin notes)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Add internal notes about this withdrawal..."
              />
            </div>
            <Button
              onClick={async () => {
                setSaving(true);
                try {
                  await adminApi.patchSystemWithdrawal(w.id, { remarks });
                  toast({ title: "Remarks saved" });
                  invalidate(); refetch();
                } catch { toast({ variant: "destructive", title: "Failed to save" }); }
                finally { setSaving(false); }
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Remarks"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons for pending */}
      {w.status === "pending" && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => setApproveOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />Approve Withdrawal
            </Button>
            <Button variant="destructive" onClick={() => setRejectOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />Reject Withdrawal
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve System Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve withdrawal of <strong>रु {Number(w.amount).toLocaleString()}</strong> from the system balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await adminApi.approveSystemWithdrawal(w.id);
                toast({ title: "Approved" });
                setApproveOpen(false); invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed" }); }
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject System Withdrawal #{w.id}</DialogTitle></DialogHeader>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={async () => {
              try {
                await adminApi.rejectSystemWithdrawal(w.id, rejectReason);
                toast({ title: "Rejected" });
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
            <AlertDialogTitle>Delete System Withdrawal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(w.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/system-withdrawals"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
