import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminSystemWithdrawal, useAdminCreateSystemWithdrawal, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SystemWithdrawalForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const swId = !isNew && id ? parseInt(id, 10) : null;
  const { data: sw, isLoading } = useAdminSystemWithdrawal(swId);
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMut = useAdminCreateSystemWithdrawal();

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Partial<{ remarks: string; reject_reason: string; amount: number }> }) =>
      adminApi.patchSystemWithdrawal(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawals() });
      if (swId) qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawal(swId) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat((fd.get("amount") as string) || "0");
    if (!amount || amount <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than 0" });
      return;
    }
    const remarks = (fd.get("remarks") as string) || "";
    const reject_reason = (fd.get("reject_reason") as string) || "";
    if (isNew) {
      createMut.mutate(
        { amount, remarks } as Parameters<typeof adminApi.createSystemWithdrawal>[0],
        {
          onSuccess: (data) => {
            toast({ title: "System withdrawal created" });
            navigate(`/system/system-withdrawals/${data.id}`);
          },
          onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
        }
      );
    } else if (swId) {
      updateMut.mutate({ pk: swId, body: { amount, remarks, reject_reason } });
    }
  };

  if (!isNew && swId && isLoading && !sw) return <Skeleton className="h-64 w-full" />;
  if (!isNew && swId && !sw && !isLoading) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/system-withdrawals">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add System Withdrawal" : "Edit System Withdrawal"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={sw?.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" rows={3} defaultValue={sw?.remarks} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject_reason">Reject reason</Label>
              <Textarea id="reject_reason" name="reject_reason" rows={2} defaultValue={sw?.reject_reason} />
            </div>
            {!isNew && sw && (
              <p className="text-xs text-muted-foreground">Status: {sw.status_display} | Created: {sw.created_at} | Updated: {sw.updated_at}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/system-withdrawals" : `/system/system-withdrawals/${swId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
