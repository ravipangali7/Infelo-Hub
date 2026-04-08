import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminPushNotification, useAdminDeletePushNotification, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHUNK = 25;

export default function PushNotificationView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const pk = id ? Number(id) : null;
  const { data, isLoading } = useAdminPushNotification(pk);
  const deleteMut = useAdminDeletePushNotification();
  const qc = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendSummary, setSendSummary] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  const runSend = async () => {
    if (!pk || !data) return;
    const totalReceivers = data.receivers.length;
    if (totalReceivers === 0) {
      toast.error("No receivers on this notification.");
      return;
    }
    setSending(true);
    setProgress(0);
    setSendSummary(null);
    let offset = 0;
    let ok = 0;
    let fail = 0;
    const errors: string[] = [];
    let total = totalReceivers;
    try {
      while (offset < total) {
        const r = await adminApi.sendPushNotificationChunk(pk, { offset, limit: CHUNK });
        total = r.total;
        ok += r.success_count;
        fail += r.failure_count;
        for (const f of r.failures) {
          errors.push(`${f.phone}: ${f.error}`);
        }
        offset += CHUNK;
        const pct = total > 0 ? Math.min(100, Math.round((Math.min(offset, total) / total) * 100)) : 100;
        setProgress(pct);
      }
      setSendSummary({ ok, fail, errors: errors.slice(0, 30) });
      if (fail === 0) toast.success(`Sent to ${ok} device(s).`);
      else toast.warning(`Done: ${ok} sent, ${fail} failed.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed (check Firebase server config).");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = () => {
    if (!pk) return;
    if (!confirm("Delete this push notification?")) return;
    deleteMut.mutate(pk, {
      onSuccess: () => {
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: adminKeys.pushNotifications() });
        navigate("/system/push-notifications");
      },
      onError: () => toast.error("Delete failed"),
    });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/system/push-notifications">
          <Button variant="outline" size="icon" type="button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{data.title}</h1>
          <p className="text-muted-foreground text-sm">#{data.id}</p>
        </div>
        <Button type="button" onClick={() => { setSendOpen(true); setSendSummary(null); setProgress(0); }}>
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/system/push-notifications/${data.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
        <Button variant="destructive" type="button" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{data.message}</p>
          {data.image_url ? (
            <img src={data.image_url} alt="" className="max-h-48 rounded-lg border object-contain" />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receivers ({data.receivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
            {data.receivers.map((u) => (
              <li key={u.id}>
                {u.name || "—"} <span className="text-muted-foreground">({u.phone})</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={sendOpen} onOpenChange={(o) => !sending && setSendOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send push notification</DialogTitle>
            <DialogDescription>
              Delivers FCM to each receiver who has a device token registered. Server must have Firebase credentials
              configured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {sending ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            ) : null}
            {sendSummary ? (
              <div className="text-sm space-y-2 rounded-md border p-3 bg-muted/40">
                <p>
                  <span className="text-success font-medium">{sendSummary.ok}</span> sent,{" "}
                  <span className={sendSummary.fail ? "text-destructive font-medium" : ""}>{sendSummary.fail}</span>{" "}
                  failed
                </p>
                {sendSummary.errors.length > 0 ? (
                  <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto list-disc pl-4">
                    {sendSummary.errors.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={sending} onClick={() => setSendOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled={sending || data.receivers.length === 0} onClick={() => void runSend()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                "Start send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
