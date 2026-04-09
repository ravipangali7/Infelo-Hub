import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet, useCreatePaymentRequest, usePaymentRequests } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/api/client";
import type { PaymentMethod } from "@/api/types";
import { PaymentMethodLogo, PAYMENT_METHOD_DISPLAY_LABEL } from "@/components/PaymentMethodLogo";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["esewa", "khalti", "bank"];

function CopyTextButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [ok, setOk] = useState(false);

  const copy = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setOk(true);
      toast({ title: "Copied to clipboard" });
      window.setTimeout(() => setOk(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Could not copy" });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("shrink-0 gap-1.5", className)}
      onClick={copy}
      disabled={!text.trim()}
      title={label}
    >
      {ok ? <Check className="h-4 w-4 text-success shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
      <span className="text-xs font-medium leading-none">{label}</span>
    </Button>
  );
}

function QrDownloadButton({ url, fileName }: { url: string; fileName: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Download started" });
    } catch {
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        toast({ title: "Opening image — use Save as if download did not start" });
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
        toast({ variant: "destructive", title: "Could not download — try opening in a new tab" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto" onClick={download} disabled={busy}>
      <Download className="h-4 w-4 shrink-0" />
      <span className="text-xs font-medium">Save QR image</span>
    </Button>
  );
}

function StepSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="floating-card p-4">
      <div className="flex gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground leading-snug">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function payElsewhereHint(method: PaymentMethod, amountStr: string, minD: number, maxD: number) {
  const amt = Number(amountStr);
  const amtOk = amountStr && !Number.isNaN(amt) && amt >= minD && amt <= maxD;
  const amtText = amtOk ? `रु ${amt.toLocaleString()}` : "the same amount you entered in step 1";

  switch (method) {
    case "esewa":
      return `Open the eSewa app and send ${amtText} to the ID below (Send money). When it succeeds, take a screenshot of the confirmation — you will upload it in the last step.`;
    case "khalti":
      return `Open the Khalti app and send ${amtText} to the ID below. When it succeeds, take a screenshot of the confirmation — you will upload it in the last step.`;
    case "bank":
      return `Transfer ${amtText} using the bank details below (mobile banking, branch, or ATM). When the transfer is done, take a screenshot of the receipt or success screen — you will upload it in the last step.`;
    default:
      return "";
  }
}

const Deposit = () => {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("esewa");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setScreenshotPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  const { data: walletData, isLoading: walletLoading, error: walletError } = useWallet();
  const { data: prData, isLoading: prLoading } = usePaymentRequests("deposit");
  const depositRequests = prData?.results ?? [];
  const createRequest = useCreatePaymentRequest();

  const limits = walletData?.limits;
  const minDeposit = limits?.minimum_deposit ? Number(limits.minimum_deposit) : 100;
  const maxDeposit = limits?.maximum_deposit ? Number(limits.maximum_deposit) : 100000;
  const d = walletData?.deposit_details;

  const handleSubmit = () => {
    const amt = Number(amount);
    if (!amount || amt < minDeposit || amt > maxDeposit || !screenshot) return;
    const formData = new FormData();
    formData.append("type", "deposit");
    formData.append("amount", amount);
    formData.append("payment_method", method);
    formData.append("screenshot", screenshot);
    createRequest.mutate(formData, {
      onSuccess: () => {
        setAmount("");
        setScreenshot(null);
        setShowForm(false);
      },
    });
  };

  if (walletError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">Failed to load wallet.</p>
      </div>
    );
  }

  const bankCopyAllText = d
    ? [
        d.bank_name && `Bank: ${d.bank_name}`,
        d.bank_branch && `Branch: ${d.bank_branch}`,
        d.bank_account_no && `Account number: ${d.bank_account_no}`,
        d.bank_account_holder_name && `Account holder: ${d.bank_account_holder_name}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content py-3 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/wallet" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Deposit</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Request history</h2>
          {prLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : depositRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
              No deposit requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {depositRequests.map((r) => (
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
                  {r.payment_method_display ? (
                    <p className="text-xs text-muted-foreground">{r.payment_method_display}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-2">
          <Button type="button" className="w-full h-12" onClick={() => setShowForm(true)}>
            Add Fund
          </Button>
          <p className="text-center text-xs text-muted-foreground leading-relaxed px-1">
            You pay in eSewa, Khalti, or your bank first, then upload a screenshot here so we can verify and credit your wallet.
          </p>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent
            className={cn(
              "flex max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-lg lg:max-w-2xl flex-col gap-0 overflow-hidden border bg-background p-0 pt-10 sm:w-full",
            )}
          >
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-3 pt-1 text-left sm:px-6">
              <DialogTitle>Add fund</DialogTitle>
              <DialogDescription>
                Four quick steps: amount → how you pay → pay outside this app → upload proof. Allowed range: रु{" "}
                {minDeposit.toLocaleString()} – रु {maxDeposit.toLocaleString()}.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-xs text-foreground/90 leading-relaxed">
                <p className="font-medium text-foreground mb-1.5">How this works</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Enter the amount and choose eSewa, Khalti, or bank.</li>
                  <li>Complete the payment in that app or bank — stay on the success or receipt screen.</li>
                  <li>Return here and upload a clear screenshot, then submit.</li>
                </ol>
              </div>

              <StepSection
                step={1}
                title="Amount"
                description={`Must be between रु ${minDeposit.toLocaleString()} and रु ${maxDeposit.toLocaleString()}.`}
              >
                <Label htmlFor="amount" className="sr-only">
                  Amount in rupees
                </Label>
                <div className="relative">
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
                <div className="flex gap-2 mt-3">
                  {[500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className="flex-1 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </StepSection>

              <StepSection step={2} title="Payment method" description="Pick where you will send money from.">
                <Label id="payment-method-label" className="sr-only">
                  Payment method
                </Label>
                <div role="tablist" aria-labelledby="payment-method-label" className="flex flex-wrap gap-2">
                  {PAYMENT_METHOD_ORDER.map((id) => {
                    const selected = method === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-label={PAYMENT_METHOD_DISPLAY_LABEL[id]}
                        onClick={() => setMethod(id)}
                        className={cn(
                          "flex flex-1 min-w-[5.5rem] max-w-[10rem] items-center justify-center rounded-xl border-2 px-3 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background",
                        )}
                      >
                        <PaymentMethodLogo method={id} decorative imgClassName="h-10 w-full" />
                      </button>
                    );
                  })}
                </div>
              </StepSection>

              <StepSection
                step={3}
                title={
                  method === "esewa"
                    ? "Pay in eSewa"
                    : method === "khalti"
                      ? "Pay in Khalti"
                      : "Bank transfer"
                }
                description={payElsewhereHint(method, amount, minDeposit, maxDeposit)}
              >
                {walletLoading ? (
                  <Skeleton className="h-48 w-full rounded-xl" />
                ) : method === "esewa" && d ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">eSewa phone / ID</p>
                      <div className="flex items-stretch gap-2">
                        <p className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm break-all min-h-[2.5rem]">
                          {d.esewa_phone || "—"}
                        </p>
                        <CopyTextButton text={d.esewa_phone} label="Copy" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-foreground">QR code</p>
                      <p className="text-xs text-muted-foreground -mt-2">Scan with eSewa, or save the image and scan from your photos.</p>
                      {d.esewa_qr_url ? (
                        <>
                          <img
                            src={d.esewa_qr_url}
                            alt="eSewa QR code"
                            className="mx-auto max-h-48 w-auto max-w-full rounded-xl border border-border object-contain bg-white"
                          />
                          <QrDownloadButton url={d.esewa_qr_url} fileName="esewa-qr.png" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
                          No QR image configured. Ask admin to upload eSewa QR in settings.
                        </p>
                      )}
                    </div>
                  </div>
                ) : method === "khalti" && d ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Khalti phone / ID</p>
                      <div className="flex items-stretch gap-2">
                        <p className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm break-all min-h-[2.5rem]">
                          {d.khalti_phone || "—"}
                        </p>
                        <CopyTextButton text={d.khalti_phone} label="Copy" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-foreground">QR code</p>
                      <p className="text-xs text-muted-foreground -mt-2">Scan with Khalti, or save the image and scan from your photos.</p>
                      {d.khalti_qr_url ? (
                        <>
                          <img
                            src={d.khalti_qr_url}
                            alt="Khalti QR code"
                            className="mx-auto max-h-48 w-auto max-w-full rounded-xl border border-border object-contain bg-black"
                          />
                          <QrDownloadButton url={d.khalti_qr_url} fileName="khalti-qr.png" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed border-border">
                          No QR image configured. Ask admin to upload Khalti QR in settings.
                        </p>
                      )}
                    </div>
                  </div>
                ) : method === "bank" && d ? (
                  <div className="space-y-4">
                    {bankCopyAllText ? (
                      <div className="flex justify-end">
                        <CopyTextButton text={bankCopyAllText} label="Copy all" />
                      </div>
                    ) : null}
                    <div className="space-y-3 text-sm">
                      {[
                        { key: "bank", label: "Bank name", value: d.bank_name },
                        { key: "branch", label: "Branch", value: d.bank_branch },
                        { key: "acc", label: "Account number", value: d.bank_account_no },
                        { key: "holder", label: "Account holder", value: d.bank_account_holder_name },
                      ].map((row) => (
                        <div key={row.key}>
                          <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
                          <div className="flex items-stretch gap-2">
                            <p className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 break-all min-h-[2.5rem]">
                              {row.value || "—"}
                            </p>
                            <CopyTextButton text={row.value} label="Copy" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-foreground">Bank QR (optional)</p>
                      {d.bank_qr_url ? (
                        <>
                          <img
                            src={d.bank_qr_url}
                            alt="Bank QR code"
                            className="mx-auto max-h-48 w-auto max-w-full rounded-xl border border-border object-contain bg-white"
                          />
                          <QrDownloadButton url={d.bank_qr_url} fileName="bank-qr.png" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border">
                          No bank QR image configured.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Payment instructions could not be loaded. Pull to refresh or try again later.
                  </p>
                )}
              </StepSection>

              <StepSection
                step={4}
                title="Upload payment proof"
                description="Screenshot of the success message or receipt from eSewa, Khalti, or your bank. Make sure the amount and time are readable."
              >
                <label className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors p-4">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground text-center">
                    {screenshot ? screenshot.name : "Tap to choose an image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  />
                </label>
                {screenshotPreviewUrl && screenshot && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Preview</p>
                    <div className="relative rounded-xl border border-border overflow-hidden bg-muted/30">
                      <img
                        src={screenshotPreviewUrl}
                        alt="Payment screenshot preview"
                        className="w-full max-h-56 object-contain"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setScreenshot(null)}>
                      Remove and choose another
                    </Button>
                  </div>
                )}
              </StepSection>
            </div>

            <div className="shrink-0 space-y-2 border-t border-border bg-background px-4 py-3 sm:px-6">
              {createRequest.isError && (
                <p className="text-destructive text-sm">
                  {(createRequest.error as ApiError).detail ?? "Failed to submit deposit request."}
                </p>
              )}
              <Button
                className="w-full h-12"
                disabled={
                  !amount ||
                  !screenshot ||
                  createRequest.isPending ||
                  Number(amount) < minDeposit ||
                  Number(amount) > maxDeposit
                }
                onClick={handleSubmit}
              >
                {createRequest.isPending ? "Submitting…" : "Submit deposit request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Deposit;
