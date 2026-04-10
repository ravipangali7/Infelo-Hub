import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayoutAccounts, useDeletePayoutAccount, useCreatePayoutAccount } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/api/client";
import type { PaymentMethod, PayoutAccount } from "@/api/types";
import { PaymentMethodLogo, PaymentMethodSelectOptionContent } from "@/components/PaymentMethodLogo";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const PAYMENT_METHODS = [
  { value: "esewa" as const, label: "eSewa" },
  { value: "khalti" as const, label: "Khalti" },
  { value: "bank" as const, label: "Bank" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return { icon: CheckCircle2, label: "Approved", color: "bg-success/10 text-success" };
    case "pending":
      return { icon: Clock, label: "Pending", color: "bg-warning/10 text-warning" };
    case "rejected":
      return { icon: XCircle, label: "Rejected", color: "bg-destructive/10 text-destructive" };
    default:
      return { icon: Clock, label: "Pending", color: "bg-muted text-muted-foreground" };
  }
};

const PayoutAccounts = () => {
  const { t } = useTranslation(["pages", "client"]);
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("esewa");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);

  const { data, isLoading, error } = usePayoutAccounts();
  const deleteAccount = useDeletePayoutAccount();
  const createAccount = useCreatePayoutAccount();
  const accounts = data?.results ?? [];

  const openAdd = () => {
    setPaymentMethod("esewa");
    setPhone("");
    setBankName("");
    setBankBranch("");
    setBankAccountNo("");
    setBankHolder("");
    setQrImage(null);
    setAddOpen(true);
  };

  const handleCreate = () => {
    if (paymentMethod === "bank") {
      if (!bankName.trim() || !bankAccountNo.trim() || !bankHolder.trim()) {
        toast({ variant: "destructive", title: "Fill bank name, account number, and account holder." });
        return;
      }
    } else if (!phone.trim()) {
      toast({ variant: "destructive", title: "Enter your wallet phone or ID for this method." });
      return;
    }

    const body: Partial<PayoutAccount> = {
      payment_method: paymentMethod,
      phone: paymentMethod === "bank" ? "" : phone.trim(),
      bank_name: paymentMethod === "bank" ? bankName.trim() : "",
      bank_branch: paymentMethod === "bank" ? bankBranch.trim() : "",
      bank_account_no: paymentMethod === "bank" ? bankAccountNo.trim() : "",
      bank_account_holder_name: paymentMethod === "bank" ? bankHolder.trim() : "",
    };

    const payload: Partial<PayoutAccount> | FormData =
      qrImage != null
        ? (() => {
            const fd = new FormData();
            fd.append("payment_method", body.payment_method!);
            fd.append("phone", body.phone ?? "");
            fd.append("bank_name", body.bank_name ?? "");
            fd.append("bank_branch", body.bank_branch ?? "");
            fd.append("bank_account_no", body.bank_account_no ?? "");
            fd.append("bank_account_holder_name", body.bank_account_holder_name ?? "");
            fd.append("qr_image", qrImage);
            return fd;
          })()
        : body;

    createAccount.mutate(
      payload,
      {
        onSuccess: () => {
          setAddOpen(false);
          toast({ title: "Payout account submitted", description: "It will appear as pending until approved." });
        },
        onError: (e) => {
          const err = e as ApiError;
          toast({
            variant: "destructive",
            title: "Could not add account",
            description: err.detail || "Please check your details and try again.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <ClientAppSeo
        title={`${t("misc.payout.title")} | ${t("client:brand")}`}
        description={t("misc.payout.title")}
        canonicalPath="/payout-accounts"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content flex items-center justify-between py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{t("misc.payout.title")}</h1>
        </div>
        <Button size="sm" className="gap-1" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-3">
        {error && <p className="text-destructive text-sm">Failed to load accounts.</p>}
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          accounts.map((account) => {
            const status = getStatusBadge(account.status);
            const StatusIcon = status.icon;
            return (
              <div key={account.id} className="floating-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <PaymentMethodLogo method={account.payment_method} decorative imgClassName="h-9 w-8" />
                    <div>
                      <p className="font-semibold capitalize">{account.payment_method_display || account.payment_method}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.phone || (account.bank_name ? `${account.bank_name} - ${account.bank_account_no}` : "—")}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${status.color} border-0`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                {account.status === "rejected" && account.reject_reason ? (
                  <p className="text-sm text-destructive mb-3">Reject reason: {account.reject_reason}</p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-destructive text-sm flex items-center gap-1"
                    onClick={() => setRemoveId(account.id)}
                    disabled={deleteAccount.isPending}
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
        {!isLoading && accounts.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">No payout accounts yet. Tap Add to register one.</p>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add payout account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <PaymentMethodSelectOptionContent method={m.value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(paymentMethod === "esewa" || paymentMethod === "khalti") && (
              <div className="space-y-2">
                <Label htmlFor="pa-phone">Phone / wallet ID</Label>
                <Input
                  id="pa-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Registered number or ID"
                  autoComplete="off"
                />
              </div>
            )}
            {paymentMethod === "bank" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pa-bank-name">Bank name</Label>
                  <Input id="pa-bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-branch">Branch</Label>
                  <Input id="pa-branch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-acc">Account number</Label>
                  <Input id="pa-acc" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pa-holder">Account holder name</Label>
                  <Input id="pa-holder" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="pa-qr">QR code image (optional)</Label>
              <Input
                id="pa-qr"
                type="file"
                accept="image/*"
                className="cursor-pointer text-sm file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
                onChange={(e) => setQrImage(e.target.files?.[0] ?? null)}
              />
              {qrImage ? (
                <p className="text-xs text-muted-foreground truncate">{qrImage.name}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createAccount.isPending}>
              {createAccount.isPending ? "Saving…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={removeId != null} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payout account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this payout account from your profile. You can add a new account to resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeId == null) return;
                deleteAccount.mutate(removeId, {
                  onSuccess: () => {
                    setRemoveId(null);
                    toast({ title: "Payout account removed" });
                  },
                  onError: (e) => {
                    const err = e as ApiError;
                    toast({
                      variant: "destructive",
                      title: "Could not remove account",
                      description: err.detail || "Please try again.",
                    });
                  },
                });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PayoutAccounts;
