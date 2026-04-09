import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Link2, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubmission } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const SubmissionDetail = () => {
  const { t } = useTranslation("pages");
  const { id } = useParams();
  const raw = id ? Number(id) : NaN;
  const submissionId = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
  const { data: submission, isLoading, error } = useSubmission(submissionId);

  if (submissionId === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-destructive">{t("campaigns.invalidLink")}</p>
        <Link to="/campaigns?tab=submissions" className="text-primary underline text-sm">
          {t("campaigns.backToSubmissions")}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-destructive">{t("campaigns.submissionNotFound")}</p>
        <Link to="/campaigns?tab=submissions" className="text-primary underline text-sm">
          {t("campaigns.backToSubmissions")}
        </Link>
      </div>
    );
  }

  if (isLoading || !submission) {
    return (
      <div className="min-h-screen bg-background">
        <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <Link to="/campaigns?tab=submissions" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{t("campaigns.submissionTitle")}</h1>
        </header>
        <div className="client-page-container client-page-content pb-8 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const isRejected = submission.status === "rejected";
  const proofs = submission.proofs ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/campaigns?tab=submissions" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold truncate">{t("campaigns.mySubmission")}</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-4">
        <div className="floating-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg flex-1 min-w-0">{submission.campaign_name}</h2>
            <Badge
              variant={
                submission.status === "approved"
                  ? "default"
                  : submission.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
              className="shrink-0"
            >
              {submission.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {submission.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
              {submission.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
              {submission.status_display ?? submission.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("campaigns.submittedOn", { datetime: new Date(submission.created_at).toLocaleString() })}
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/campaign/${submission.campaign}`}>{t("campaigns.viewCampaign")}</Link>
          </Button>
        </div>

        {isRejected && (
          <div className="floating-card p-4 space-y-3 border-destructive/30">
            <p className="text-sm font-medium text-destructive">{t("campaigns.rejectionReason")}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {submission.reject_reason?.trim() || t("campaigns.noRejectReason")}
            </p>
            <Button className="w-full" asChild>
              <Link to={`/campaign/${submission.campaign}`}>{t("campaigns.submitAgain")}</Link>
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("campaigns.proofsHeading")}</h3>
          {proofs.length === 0 ? (
            <div className="floating-card p-6 text-center text-sm text-muted-foreground">{t("campaigns.noProofsOnFile")}</div>
          ) : (
            proofs.map((proof) => (
              <div key={proof.id} className="floating-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium">{proof.title || t("campaigns.proofNumber", { id: proof.id })}</p>
                  <div className="flex gap-2">
                    {proof.image_url && (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {t("campaigns.badgeImage")}
                      </Badge>
                    )}
                    {proof.link && (
                      <Badge variant="outline" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        {t("campaigns.badgeLink")}
                      </Badge>
                    )}
                  </div>
                </div>
                {proof.remarks && <p className="text-sm text-muted-foreground">{proof.remarks}</p>}
                {proof.image_url && (
                  <a href={proof.image_url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={proof.image_url}
                      alt={proof.title || ""}
                      className="max-h-64 w-full rounded-md border object-contain bg-muted/30"
                    />
                  </a>
                )}
                {proof.link && (
                  <a
                    href={proof.link}
                    className="text-primary underline text-sm break-all inline-flex items-center gap-1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Link2 className="h-3 w-3 shrink-0" />
                    {proof.link}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetail;
