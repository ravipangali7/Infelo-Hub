import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import {
  useAdminDeposit,
  useAdminCreateDeposit,
  useAdminUpdateDeposit,
  useAdminPayoutAccountList,
  useAdminUserList,
  adminKeys,
} from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { PaymentRequest, PaymentMethod } from "@/api/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageFileField } from "@/components/ImageFileField";
import { PaymentMethodSelectOptionContent } from "@/components/PaymentMethodLogo";

const PAYMENT_METHODS = [
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "bank", label: "Bank" },
];

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function DepositForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const depId = !isNew && id ? parseInt(id, 10) : null;
  const { data: dep, isLoading } = useAdminDeposit(depId);
  const { data: users } = useAdminUserList({ page_size: 200 });
  const { data: payoutAccounts } = useAdminPayoutAccountList({ page_size: 200 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("esewa");
  const [depStatus, setDepStatus] = useState("pending");
  const [userId, setUserId] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  useEffect(() => {
    if (dep) {
      setPaymentMethod(dep.payment_method || "esewa");
      setDepStatus(dep.status || "pending");
      setUserId(dep.user ? String(dep.user) : "");
      setPayoutAccountId(dep.payout_account ? String(dep.payout_account) : "");
    }
  }, [dep]);

  const createMut = useAdminCreateDeposit();
  const updateMut = useAdminUpdateDeposit(depId ?? 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (isNew && !userId) {
      toast({ variant: "destructive", title: "User is required" });
      return;
    }
    const amount = (fd.get("amount") as string)?.trim();
    if (!amount) {
      toast({ variant: "destructive", title: "Amount is required" });
      return;
    }
    if (screenshotFile) {
      const form = new FormData();
      form.append("amount", amount);
      form.append("payment_method", paymentMethod);
      form.append("status", depStatus);
      form.append("remarks", (fd.get("remarks") as string) || "");
      const pdt = (fd.get("paid_date_time") as string) || "";
      if (pdt) form.append("paid_date_time", pdt);
      form.append("reject_reason", (fd.get("reject_reason") as string) || "");
      form.append("payment_transaction_id", (fd.get("payment_transaction_id") as string) || "");
      form.append("user", userId);
      form.append("payout_account", payoutAccountId || "");
      form.append("screenshot", screenshotFile);
      if (isNew) {
        createMut.mutate(form, {
          onSuccess: (data) => {
            toast({ title: "Deposit created" });
            navigate(`/system/deposits/${data.id}`);
          },
          onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
        });
      } else if (depId) {
        updateMut.mutate(form, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: adminKeys.deposit(depId) });
            toast({ title: "Saved" });
          },
          onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
        });
      }
      return;
    }

    const body: Partial<PaymentRequest> = {
      amount,
      payment_method: paymentMethod as PaymentRequest["payment_method"],
      status: depStatus as PaymentRequest["status"],
      remarks: (fd.get("remarks") as string) || "",
      paid_date_time: (fd.get("paid_date_time") as string) || null,
      reject_reason: (fd.get("reject_reason") as string) || "",
      payment_transaction_id: (fd.get("payment_transaction_id") as string) || "",
    };
    if (payoutAccountId) (body as Record<string, unknown>).payout_account = parseInt(payoutAccountId, 10);
    else (body as Record<string, unknown>).payout_account = null;
    if (userId) (body as Record<string, unknown>).user = parseInt(userId, 10);

    if (isNew) {
      createMut.mutate(body, {
        onSuccess: (data) => {
          toast({ title: "Deposit created" });
          navigate(`/system/deposits/${data.id}`);
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    } else if (depId) {
      updateMut.mutate(body, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: adminKeys.deposit(depId) });
          toast({ title: "Saved" });
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    }
  };

  if (!isNew && depId && isLoading && !dep) return <Skeleton className="h-64 w-full" />;
  if (!isNew && depId && !dep && !isLoading) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/deposits">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add Deposit" : "Edit Deposit"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="user">User *</Label>
              <SearchableSelect
                value={userId}
                onChange={setUserId}
                options={(users?.results ?? []).map((u) => ({
                  value: String(u.id),
                  label: `#${u.id} ${u.name || u.phone}`,
                }))}
                placeholder="Select user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={dep?.amount} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <PaymentMethodSelectOptionContent method={m.value as PaymentMethod} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={depStatus} onValueChange={setDepStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout_account">Payout Account</Label>
              <SearchableSelect
                value={payoutAccountId}
                onChange={setPayoutAccountId}
                options={[
                  { value: "", label: "None" },
                  ...(payoutAccounts?.results ?? []).map((acc) => ({
                    value: String(acc.id),
                    label: `#${acc.id} ${acc.phone || acc.payment_method}`,
                  })),
                ]}
                placeholder="Select payout account"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_date_time">Paid Date/Time</Label>
              <Input id="paid_date_time" name="paid_date_time" type="datetime-local" defaultValue={dep?.paid_date_time ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_transaction_id">Transaction / Reference ID</Label>
              <Input
                id="payment_transaction_id"
                name="payment_transaction_id"
                defaultValue={dep?.payment_transaction_id ?? ""}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>
            <ImageFileField label="Screenshot" currentUrl={dep?.screenshot_url} onFileChange={setScreenshotFile} />
            <div className="space-y-2">
              <Label htmlFor="reject_reason">Reject Reason</Label>
              <Textarea id="reject_reason" name="reject_reason" rows={2} defaultValue={dep?.reject_reason ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" rows={3} defaultValue={dep?.remarks} />
            </div>
            {!isNew && dep && (
              <p className="text-xs text-muted-foreground">Type: {dep.type} | Created: {dep.created_at} | Updated: {dep.updated_at}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/deposits" : `/system/deposits/${depId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
