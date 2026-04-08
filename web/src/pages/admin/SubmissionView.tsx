import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminSubmission, useAdminDeleteSubmission, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Clock, ImageIcon, Link2, FileText } from "lucide-react";
import { AdminUserViewCard, AdminCampaignDetailCard } from "@/components/admin";

const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";

export default function SubmissionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sid = id ? parseInt(id, 10) : null;
  const { data: s, isLoading, error, refetch } = useAdminSubmission(sid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteSubmission();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.submissions({}) });
    if (sid) qc.invalidateQueries({ queryKey: adminKeys.submission(sid) });
  };

  if (!sid || isNaN(sid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !s) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !s) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/submissions">Back</Link></div>
  );

  const proofCount = s.proofs?.length ?? 0;
  const imageProofs = s.proofs?.filter(p => p.image_url) ?? [];
  const linkProofs = s.proofs?.filter(p => p.link) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/submissions"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Submissions</Button></Link>
          <h1 className="text-3xl font-bold">Submission #{s.id}</h1>
          <p className="text-muted-foreground mt-1">{s.campaign_name}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={statusColor(s.status)} className="text-sm px-3">
              {s.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
              {s.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
              {s.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
              {s.status_display || s.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/campaigns/${s.campaign}`}><Button variant="outline">Campaign</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
          {s.status === "pending" && (
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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Status</p>
            <div className="mt-2">
              <Badge variant={statusColor(s.status)} className="text-sm px-3 py-1">
                {s.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                {s.status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                {s.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                {s.status_display || s.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Total Proofs</p>
            <p className="text-2xl font-bold mt-1">{proofCount}</p>
            <p className="text-xs text-muted-foreground">{imageProofs.length} images · {linkProofs.length} links</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Submitted</p>
            <p className="text-base font-semibold mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleTimeString()}</p>
          </CardContent>
        </Card>
      </div>

      <AdminUserViewCard userId={s.user} />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${s.id}`],
              ["Campaign", s.campaign_name],
              ["Status", null],
              ["Created", new Date(s.created_at).toLocaleString()],
              ["Updated", new Date(s.updated_at).toLocaleString()],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Status" ? (
                  <Badge variant={statusColor(s.status)} className="text-xs">{s.status_display || s.status}</Badge>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reject reason / proofs overview */}
        <div className="col-span-2 space-y-4">
          {s.campaign_detail ? (
            <AdminCampaignDetailCard campaign={s.campaign_detail} />
          ) : null}
          {s.reject_reason && (
            <Card className="border-destructive">
              <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><XCircle className="h-4 w-4" />Rejection Reason</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-destructive">{s.reject_reason}</p></CardContent>
            </Card>
          )}
          {proofCount === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No proofs submitted</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Proofs */}
      {s.proofs && s.proofs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Submission Proofs ({proofCount})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {s.proofs.map((proof) => (
              <div key={proof.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{proof.title || `Proof #${proof.id}`}</p>
                  <div className="flex gap-2">
                    {proof.image_url && <Badge variant="outline" className="text-xs"><ImageIcon className="h-3 w-3 mr-1" />Image</Badge>}
                    {proof.link && <Badge variant="outline" className="text-xs"><Link2 className="h-3 w-3 mr-1" />Link</Badge>}
                  </div>
                </div>
                {proof.remarks && <p className="text-sm text-muted-foreground">{proof.remarks}</p>}
                {proof.image_url && (
                  <a href={proof.image_url} target="_blank" rel="noreferrer" className="block">
                    <img src={proof.image_url} alt={proof.title || "Proof"} className="max-h-64 rounded-md border object-contain" />
                  </a>
                )}
                {proof.link && (
                  <a href={proof.link} className="text-primary underline text-sm flex items-center gap-1" target="_blank" rel="noreferrer">
                    <Link2 className="h-3 w-3" />{proof.link}
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Submission?</AlertDialogTitle>
            <AlertDialogDescription>This marks campaign task #{s.id} as approved for User #{s.user}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await adminApi.approveSubmission(s.id);
                toast({ title: "Submission approved" });
                setApproveOpen(false); invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed" }); }
            }}>Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Submission #{s.id}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Provide a reason for rejection.</p>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={async () => {
              try {
                await adminApi.rejectSubmission(s.id, rejectReason);
                toast({ title: "Submission rejected" });
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
            <AlertDialogTitle>Delete submission?</AlertDialogTitle>
            <AlertDialogDescription>Remove this submission and all proofs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMut.mutate(s.id, {
                  onSuccess: () => {
                    toast({ title: "Submission deleted" });
                    navigate("/system/submissions");
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
