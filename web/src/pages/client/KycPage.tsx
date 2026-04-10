import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useKycStatus, useSubmitKyc } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const KycPage = () => {
  const { t } = useTranslation(["pages", "client"]);
  const [frontDoc, setFrontDoc] = useState<File | null>(null);
  const [backDoc, setBackDoc] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const { data: user, isLoading, error } = useKycStatus();
  const submitKyc = useSubmitKyc();

  const status = user?.kyc_status ?? "";
  const rejectionReason = user?.kyc_reject_reason ?? null;

  const hasSubmittedDocs = Boolean(
    user?.kyc_document_front_url && user?.kyc_document_back_url
  );

  /** Show upload + submit only when rejected, or pending but documents not on file yet */
  const showUploadForm =
    status === "rejected" || (status === "pending" && !hasSubmittedDocs);

  /** Submitted and awaiting admin — no resubmit */
  const showWaitForApproval = status === "pending" && hasSubmittedDocs;

  useEffect(() => {
    if (!frontDoc) {
      setFrontPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(frontDoc);
    setFrontPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [frontDoc]);

  useEffect(() => {
    if (!backDoc) {
      setBackPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(backDoc);
    setBackPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [backDoc]);

  const handleSubmit = () => {
    if (!frontDoc || !backDoc) return;
    const formData = new FormData();
    formData.append("kyc_document_front", frontDoc);
    formData.append("kyc_document_back", backDoc);
    submitKyc.mutate(formData);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClientAppSeo
          title={`${t("misc.kyc.title")} | ${t("client:brand")}`}
          description={t("misc.kyc.loadFailed")}
          canonicalPath="/kyc"
          siteName={t("client:brand")}
        />
        <p className="text-destructive">{t("misc.kyc.loadFailed")}</p>
      </div>
    );
  }
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <ClientAppSeo
          title={`${t("misc.kyc.title")} | ${t("client:brand")}`}
          description={t("misc.kyc.title")}
          canonicalPath="/kyc"
          siteName={t("client:brand")}
        />
        <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{t("misc.kyc.title")}</h1>
        </header>
        <div className="client-page-container client-page-content pb-8">
          <Skeleton className="h-24 w-full rounded-xl mb-4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientAppSeo
        title={`${t("misc.kyc.title")} | ${t("client:brand")}`}
        description={t("misc.kyc.title")}
        canonicalPath="/kyc"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">{t("misc.kyc.title")}</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-6">
        <div className={`floating-card p-4 ${
          status === "approved" ? "border-success/50 bg-success/5" :
          status === "pending" ? "border-warning/50 bg-warning/5" :
          status === "rejected" ? "border-destructive/50 bg-destructive/5" :
          ""
        }`}>
          <div className="flex items-center gap-3">
            {status === "approved" && <CheckCircle2 className="w-8 h-8 text-success" />}
            {(status === "pending" || showWaitForApproval) && <Clock className="w-8 h-8 text-warning" />}
            {status === "rejected" && <XCircle className="w-8 h-8 text-destructive" />}
            {status !== "approved" && status !== "pending" && status !== "rejected" && (
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-semibold">
                {status === "approved" && "KYC is Approved"}
                {showWaitForApproval && "Wait for approval"}
                {status === "pending" && !showWaitForApproval && "Complete your KYC"}
                {status === "rejected" && "Verification Rejected"}
                {!["approved", "pending", "rejected"].includes(status) && "KYC Not Submitted"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status === "approved" && "Your identity has been verified."}
                {showWaitForApproval && "Your documents were received and are being reviewed. You will be notified when verification is complete."}
                {status === "pending" && !showWaitForApproval && "Please upload clear photos of your government-issued ID (front and back)."}
                {status === "rejected" && (rejectionReason || "Verification was rejected. Please upload new documents below.")}
                {!["approved", "pending", "rejected"].includes(status) && "Please submit your documents."}
              </p>
            </div>
          </div>
        </div>

        {status === "approved" && (
          <Alert className="border-success/30 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-sm">
              KYC is approved. You can use withdrawals (when enabled) and any other features your administrator ties to verification.
            </AlertDescription>
          </Alert>
        )}

        {showWaitForApproval && (
          <>
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-sm">
                No need to submit again — wait for our team to review your documents.
              </AlertDescription>
            </Alert>
            <div className="floating-card p-4">
              <h3 className="font-semibold mb-3">Submitted documents</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ID front</p>
                  <div className="overflow-hidden rounded-lg border bg-muted/20">
                    <img
                      src={user.kyc_document_front_url!}
                      alt="Submitted ID front"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">ID back</p>
                  <div className="overflow-hidden rounded-lg border bg-muted/20">
                    <img
                      src={user.kyc_document_back_url!}
                      alt="Submitted ID back"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showUploadForm && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Please upload clear photos of your government-issued ID. Your administrator may require approved KYC before withdrawals.
            </AlertDescription>
          </Alert>
        )}

        {showUploadForm && (
          <>
            <div className="floating-card p-4">
              <h3 className="font-semibold mb-4">Upload Documents</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">ID Front Side</p>
                  <label className="group flex w-full cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="relative h-36 overflow-hidden rounded-lg bg-muted/30">
                      {frontPreview ? (
                        <img
                          src={frontPreview}
                          alt="Front ID preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                          <Upload className="mb-2 h-8 w-8" />
                          <span className="text-sm">Tap to upload front side</span>
                        </div>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {frontDoc ? frontDoc.name : "No file selected"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFrontDoc(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">ID Back Side</p>
                  <label className="group flex w-full cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="relative h-36 overflow-hidden rounded-lg bg-muted/30">
                      {backPreview ? (
                        <img
                          src={backPreview}
                          alt="Back ID preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                          <Upload className="mb-2 h-8 w-8" />
                          <span className="text-sm">Tap to upload back side</span>
                        </div>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {backDoc ? backDoc.name : "No file selected"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setBackDoc(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12"
              disabled={!frontDoc || !backDoc || submitKyc.isPending}
              onClick={handleSubmit}
            >
              {submitKyc.isPending ? "Submitting..." : status === "rejected" ? "Resubmit for Verification" : "Submit for Verification"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default KycPage;
