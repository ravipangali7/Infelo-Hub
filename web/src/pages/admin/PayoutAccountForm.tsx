import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import {
  useAdminPayoutAccount,
  useAdminCreatePayoutAccount,
  useAdminUpdatePayoutAccount,
  useAdminUserList,
  adminKeys,
} from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { PayoutAccount, PaymentMethod } from "@/api/types";
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

export default function PayoutAccountForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const accId = !isNew && id ? parseInt(id, 10) : null;
  const { data: acc, isLoading } = useAdminPayoutAccount(accId);
  const { data: users } = useAdminUserList({ page_size: 200 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("esewa");
  const [accStatus, setAccStatus] = useState("pending");
  const [userId, setUserId] = useState("");
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (acc) {
      setPaymentMethod(acc.payment_method || "esewa");
      setAccStatus(acc.status || "pending");
      setUserId(acc.user ? String(acc.user) : "");
    }
  }, [acc]);

  const createMut = useAdminCreatePayoutAccount();
  const updateMut = useAdminUpdatePayoutAccount(accId ?? 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (isNew && !userId) {
      toast({ variant: "destructive", title: "User is required" });
      return;
    }
    if (qrImageFile) {
      const form = new FormData();
      form.append("payment_method", paymentMethod);
      form.append("status", accStatus);
      form.append("phone", (fd.get("phone") as string) || "");
      form.append("bank_name", (fd.get("bank_name") as string) || "");
      form.append("bank_branch", (fd.get("bank_branch") as string) || "");
      form.append("bank_account_no", (fd.get("bank_account_no") as string) || "");
      form.append("bank_account_holder_name", (fd.get("bank_account_holder_name") as string) || "");
      form.append("reject_reason", (fd.get("reject_reason") as string) || "");
      form.append("user", userId);
      form.append("qr_image", qrImageFile);
      if (isNew) {
        createMut.mutate(form, {
          onSuccess: (data) => {
            toast({ title: "Payout account created" });
            navigate(`/system/payout-accounts/${data.id}`);
          },
          onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
        });
      } else if (accId) {
        updateMut.mutate(form, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: adminKeys.payoutAccount(accId) });
            toast({ title: "Saved" });
          },
          onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
        });
      }
      return;
    }

    const body: Partial<PayoutAccount> = {
      payment_method: paymentMethod as PayoutAccount["payment_method"],
      status: accStatus as PayoutAccount["status"],
      phone: (fd.get("phone") as string) || "",
      bank_name: (fd.get("bank_name") as string) || "",
      bank_branch: (fd.get("bank_branch") as string) || "",
      bank_account_no: (fd.get("bank_account_no") as string) || "",
      bank_account_holder_name: (fd.get("bank_account_holder_name") as string) || "",
      reject_reason: (fd.get("reject_reason") as string) || "",
    };
    if (userId) (body as Record<string, unknown>).user = parseInt(userId, 10);

    if (isNew) {
      createMut.mutate(body, {
        onSuccess: (data) => {
          toast({ title: "Payout account created" });
          navigate(`/system/payout-accounts/${data.id}`);
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    } else if (accId) {
      updateMut.mutate(body, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: adminKeys.payoutAccount(accId) });
          toast({ title: "Saved" });
        },
        onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
      });
    }
  };

  if (!isNew && accId && isLoading && !acc) return <Skeleton className="h-64 w-full" />;
  if (!isNew && accId && !acc && !isLoading) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/payout-accounts">Back</Link>
      </div>
    );
  }

  const showBank = paymentMethod === "bank";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add Payout Account" : "Edit Payout Account"}</h1>
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
              <Label>Payment Method *</Label>
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
              <Select value={accStatus} onValueChange={setAccStatus}>
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
            {(paymentMethod === "esewa" || paymentMethod === "khalti") && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone / Account</Label>
                <Input id="phone" name="phone" defaultValue={acc?.phone} />
              </div>
            )}
            {showBank && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input id="bank_name" name="bank_name" defaultValue={acc?.bank_name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_branch">Branch</Label>
                  <Input id="bank_branch" name="bank_branch" defaultValue={acc?.bank_branch} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_no">Account Number</Label>
                  <Input id="bank_account_no" name="bank_account_no" defaultValue={acc?.bank_account_no} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder_name">Account Holder Name</Label>
                  <Input id="bank_account_holder_name" name="bank_account_holder_name" defaultValue={acc?.bank_account_holder_name} />
                </div>
              </>
            )}
            <ImageFileField label="QR image" currentUrl={acc?.qr_image_url} onFileChange={setQrImageFile} />
            <div className="space-y-2">
              <Label htmlFor="reject_reason">Reject reason</Label>
              <Input id="reject_reason" name="reject_reason" defaultValue={acc?.reject_reason ?? ""} />
            </div>
            {!isNew && acc && (
              <p className="text-xs text-muted-foreground">Created: {acc.created_at} | Updated: {acc.updated_at}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/payout-accounts" : `/system/payout-accounts/${accId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
