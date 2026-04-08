import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useWallet,
  usePayoutAccounts,
  useCreatePaymentRequest,
  usePaymentRequests,
  useKycStatus,
} from "@/api/hooks";
import { ApiError } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentMethodLogo } from "@/components/PaymentMethodLogo";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const walletTypes = [
  { id: "earning", name: "Earning Wallet" },
  { id: "topup", name: "Top-up Wallet" },
];

const Withdraw = () => {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletType, setWalletType] = useState("earning");
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);

  const { data: walletData } = useWallet();
  const { data: kycUser } = useKycStatus();
  const { data: accountsData } = usePayoutAccounts();
  const { data: prData, isLoading: prLoading } = usePaymentRequests("withdraw");
  const withdrawRequests = prData?.results ?? [];
  const createRequest = useCreatePaymentRequest();

  const earning = Number(walletData?.earning_wallet) || 0;
  const topup = Number(walletData?.topup_wallet) || 0;
  const limits = walletData?.limits;
  const feePct = limits?.withdrawal_admin_fee_type === "percentage" ? Number(limits?.withdrawal_admin_fee) || 0 : 0;
  const feeFlat = limits?.withdrawal_admin_fee_type === "flat" ? Number(limits?.withdrawal_admin_fee) || 0 : 0;

  const balance = walletType === "earning" ? earning : topup;
  const fee = feePct ? (Number(amount) * feePct) / 100 : feeFlat;
  const netAmount = Number(amount) - fee;

  const payoutAccounts = accountsData?.results?.filter((a) => a.status === "approved") ?? [];
  const kycCompulsory = limits?.is_kyc_compulsory !== false;
  const kycBlocksWithdraw = kycCompulsory && kycUser?.kyc_status !== "approved";

  const withdrawalDisabled =
    limits?.is_withdrawal === false ||
    (walletType === "earning" && limits?.is_earning_withdrawal === false) ||
    (walletType === "topup" && limits?.is_topup_withdrawal === false);

  const handleSubmit = () => {
    if (!selectedAccount || !amount || Number(amount) <= 0) return;
    createRequest.mutate(
      {
        type: "withdraw",
        amount: String(Number(amount)),
        payout_account: selectedAccount,
        wallet_type: walletType,
      },
      {
        onSuccess: () => {
          setAmount("");
          setSelectedAccount(null);
          setShowForm(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content py-3 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/wallet" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Withdraw</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-6">
        <Alert className="border-warning/50 bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            Withdrawals are processed within 24-48 hours after approval.
          </AlertDescription>
        </Alert>
        {withdrawalDisabled && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              Withdrawals are currently disabled by Administration.
            </AlertDescription>
          </Alert>
        )}
        {kycBlocksWithdraw && !withdrawalDisabled && (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              Verified identity (KYC) is required before you can withdraw.{" "}
              <Link to="/kyc" className="font-medium text-primary underline underline-offset-2">
                Complete verification
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Request history</h2>
          {prLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : withdrawRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
              No withdrawal requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {withdrawRequests.map((r) => (
                <div key={r.id} className="floating-card p-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold">रु {Number(r.amount).toLocaleString()}</span>
                    <Badge
                      variant={
                        r.status === "rejected" ? "destructive" : r.status === "approved" ? "secondary" : "outline"
                      }
                      className="text-[10px] shrink-0"
                    >
                      {r.status_display}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <Button
          type="button"
          className="w-full h-12"
          disabled={withdrawalDisabled || kycBlocksWithdraw}
          onClick={() => setShowForm(true)}
        >
          Withdraw Fund
        </Button>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent
            className={cn(
              "flex max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-lg lg:max-w-2xl flex-col gap-0 overflow-hidden border bg-background p-0 pt-10 sm:w-full",
            )}
          >
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-3 pt-1 text-left sm:px-6">
              <DialogTitle>Withdraw fund</DialogTitle>
              <DialogDescription>
                Choose wallet, amount, and payout account. Withdrawals are reviewed before processing.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        <div className="floating-card p-4">
          <Label className="text-sm font-medium mb-3 block">Select Wallet</Label>
          <RadioGroup value={walletType} onValueChange={setWalletType} className="space-y-3">
            {walletTypes.map((wallet) => {
              const bal = wallet.id === "earning" ? earning : topup;
              return (
                <label
                  key={wallet.id}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    walletType === wallet.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={wallet.id} className="sr-only" />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        walletType === wallet.id ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {walletType === wallet.id && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="font-medium">{wallet.name}</span>
                  </div>
                  <span className="font-bold">रु {bal.toLocaleString()}</span>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="floating-card p-4">
          <Label htmlFor="amount" className="text-sm font-medium">
            Enter Amount
          </Label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">रु</span>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10 h-14 text-2xl font-bold"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Available: रु {balance.toLocaleString()}</p>
        </div>

        <div className="floating-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Select Payout Account</Label>
            <Link to="/payout-accounts" className="text-xs text-primary font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add New
            </Link>
          </div>
          <div className="space-y-3">
            {payoutAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No approved payout account found. Please add and wait for approval before withdrawing.
              </p>
            )}
            {payoutAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccount(account.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  selectedAccount === account.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <PaymentMethodLogo method={account.payment_method} decorative imgClassName="h-9 w-8" />
                <div className="flex-1">
                  <p className="font-medium capitalize">{account.payment_method_display || account.payment_method}</p>
                  <p className="text-sm text-muted-foreground">{account.phone || account.bank_account_no || "—"}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedAccount === account.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {selectedAccount === account.id && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {amount && Number(amount) > 0 && (
          <div className="floating-card p-4">
            <h3 className="font-semibold mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>रु {Number(amount).toLocaleString()}</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="text-destructive">-रु {fee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>You'll receive</span>
                <span className="text-success">रु {netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {createRequest.isError && (
          <p className="text-destructive text-sm">
            {(createRequest.error as ApiError).detail ?? "Failed to submit withdrawal request."}
          </p>
        )}
        <Button
          className="w-full h-12"
          disabled={
            !amount ||
            Number(amount) <= 0 ||
            !selectedAccount ||
            withdrawalDisabled ||
            kycBlocksWithdraw ||
            Number(amount) > balance ||
            createRequest.isPending
          }
          onClick={handleSubmit}
        >
          {createRequest.isPending ? "Submitting…" : "Request Withdrawal"}
        </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Withdraw;
