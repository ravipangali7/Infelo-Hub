import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo, useRef } from "react";
import { ArrowLeft, Clock, Gift, Loader2, Plus, Share2, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCampaign, useSubmissions, useCreateSubmission, useCreateSubmissionProof, useProductById } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/api/client";
import { getToken } from "@/api/client";
import type { CampaignProofInput } from "@/api/types";
import { RouteSeo } from "@/components/RouteSeo";
import { absoluteUrl, crawlerShareCampaignUrl, plainTextExcerpt } from "@/lib/seo";

type ImagePick = {
  key: string;
  file: File;
  preview: string;
};

function newImagePick(file: File): ImagePick {
  return {
    key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    file,
    preview: URL.createObjectURL(file),
  };
}

function campaignImageDownloadName(campaignName: string, imageUrl: string): string {
  try {
    const u = new URL(imageUrl);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    if (seg && /\.[a-z0-9]{2,5}$/i.test(seg)) return decodeURIComponent(seg);
  } catch {
    /* ignore */
  }
  const base =
    campaignName
      .replace(/[^\w\s.-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "campaign";
  return `${base}.jpg`;
}

function CampaignImageDownloadButton({
  url,
  fileName,
  className,
}: {
  url: string;
  fileName: string;
  className?: string;
}) {
  const { toast } = useToast();
  const { t } = useTranslation("pages");
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
      toast({ title: t("deposit.downloadStarted") });
    } catch {
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
        toast({ title: t("deposit.openingImage") });
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
        toast({ variant: "destructive", title: t("deposit.couldNotDownload") });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={download}
      disabled={busy}
      aria-label={t("campaigns.downloadCampaignImageAria")}
    >
      <Download className="w-3 h-3 shrink-0" />
      {t("campaigns.download")}
    </button>
  );
}

const CampaignDetail = () => {
  const { t } = useTranslation(["pages", "client"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: campaign, isLoading, error } = useCampaign(id ? Number(id) : null);
  const { data: submissionsData, isLoading: submissionsLoading } = useSubmissions();
  const { data: relatedProduct } = useProductById(campaign?.product ?? null);
  const { mutateAsync: createSubmission, isPending: submitPending } = useCreateSubmission();
  const { mutateAsync: createProof } = useCreateSubmissionProof();
  const isLoggedIn = !!getToken();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [images, setImages] = useState<ImagePick[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  const campaignSubs = useMemo(() => {
    if (!campaign) return [];
    const submissions = submissionsData?.results ?? [];
    return submissions
      .filter((s) => s.campaign === campaign.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [submissionsData, campaign]);

  const blockingSubmission = campaignSubs.find((s) => s.status === "pending" || s.status === "approved");
  const latestRejected = campaignSubs.find((s) => s.status === "rejected");

  const resetProofForm = useCallback(() => {
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
    setRemarks("");
    setLinks([""]);
    setFileInputKey((k) => k + 1);
  }, []);

  const addLinkRow = () => setLinks((rows) => [...rows, ""]);
  const updateLink = (index: number, value: string) => {
    setLinks((rows) => rows.map((l, i) => (i === index ? value : l)));
  };
  const removeLinkRow = (index: number) => {
    setLinks((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const onScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setImages((prev) => [...prev, ...Array.from(list, (f) => newImagePick(f))]);
    setFileInputKey((k) => k + 1);
    e.target.value = "";
  };

  const removeImagePick = (key: string) => {
    setImages((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.key !== key);
    });
  };

  const handleOpenDialog = () => {
    resetProofForm();
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetProofForm();
  };

  const handleConfirmSubmit = async () => {
    if (!campaign) return;

    const filledLinks = links.map((l) => l.trim()).filter(Boolean);
    if (filledLinks.length === 0 && images.length === 0) {
      toast({
        variant: "destructive",
        title: t("campaigns.validationProofTitle"),
        description: t("campaigns.validationProofDesc"),
      });
      return;
    }

    const remarksTrim = remarks.trim();
    let proof_items: CampaignProofInput[];
    if (filledLinks.length > 0) {
      proof_items = filledLinks.map((link, i) => ({
        link,
        title: "",
        remarks: i === 0 ? remarksTrim : "",
      }));
    } else {
      proof_items = [{ title: "Screenshots", link: "", remarks: remarksTrim }];
    }

    setSubmittingAll(true);
    try {
      const submission = await createSubmission({
        campaign: campaign.id,
        proof_items,
      });

      for (const img of images) {
        const fd = new FormData();
        fd.append("image", img.file);
        await createProof({ submissionId: submission.id, formData: fd });
      }

      toast({ title: t("campaigns.submissionReceived"), description: t("campaigns.submissionReceivedDesc") });
      setDialogOpen(false);
      resetProofForm();
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : t("campaigns.couldNotSubmit");
      toast({ variant: "destructive", title: t("campaigns.submissionFailed"), description: msg });
    } finally {
      setSubmittingAll(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">{t("campaigns.notFound")}</p>
      </div>
    );
  }
  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen bg-background">
        <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <Link to="/campaigns" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{t("campaigns.detailTitle")}</h1>
        </header>
        <div className="client-page-container client-page-content pb-8">
          <Skeleton className="w-full aspect-video rounded-2xl mb-4" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const imageUrl = campaign.image_url || campaign.image;
  const isActive = campaign.status === "running";
  const brand = t("client:brand");
  const seoTitle = `${(campaign.og_share_title || campaign.name).trim()} | ${brand}`;
  const seoDescription =
    plainTextExcerpt(campaign.og_share_description || campaign.description || "", 300) ||
    t("campaigns.defaultCampaignOgDescription");
  const seoImage =
    (campaign.og_share_image_url || campaign.image_url || "").trim() || absoluteUrl("/og-image.png");
  const sharePreviewUrl = crawlerShareCampaignUrl(campaign.id);

  const copySharePreviewLink = async () => {
    const url = sharePreviewUrl || `${window.location.origin}/campaign/${campaign.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("campaigns.socialPreviewLinkCopied") });
    } catch {
      toast({ variant: "destructive", title: t("campaigns.couldNotSubmit") });
    }
  };

  const renderAction = () => {
    if (!isActive) return null;

    if (submissionsLoading) {
      return <Skeleton className="h-12 w-full rounded-xl" />;
    }

    if (!isLoggedIn) {
      return (
        <Button className="w-full" size="lg" type="button" onClick={() => navigate("/login", { state: { from: `/campaign/${campaign.id}` } })}>
          {t("campaigns.logInToParticipate")}
        </Button>
      );
    }

    if (blockingSubmission) {
      return (
        <div className="floating-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("campaigns.yourSubmission")}</p>
            <Badge variant={blockingSubmission.status === "approved" ? "default" : "secondary"}>
              {blockingSubmission.status_display ?? blockingSubmission.status}
            </Badge>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/submission/${blockingSubmission.id}`}>{t("campaigns.viewSubmission")}</Link>
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" asChild>
            <Link to="/campaigns?tab=submissions">{t("campaigns.mySubmissionsLink")}</Link>
          </Button>
        </div>
      );
    }

    return (
      <>
        {latestRejected && (
          <div className="floating-card p-4 space-y-3 border-destructive/20">
            <p className="text-sm text-muted-foreground">{t("campaigns.previousRejected")}</p>
            {latestRejected.reject_reason && (
              <p className="text-xs text-destructive line-clamp-3">{latestRejected.reject_reason}</p>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/submission/${latestRejected.id}`}>{t("campaigns.viewRejectedSubmission")}</Link>
            </Button>
          </div>
        )}
        <Button className="w-full" size="lg" type="button" onClick={handleOpenDialog}>
          {t("campaigns.submitForCampaign")}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("campaigns.submitProofTitle")}</DialogTitle>
              <DialogDescription>{t("campaigns.submitProofDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="submit-remarks">{t("campaigns.remarksOptional")}</Label>
                <Input
                  id="submit-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={t("campaigns.remarksPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("campaigns.linksLabel")}</Label>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addLinkRow}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("campaigns.addLink")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <Input
                        type="url"
                        inputMode="url"
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                        placeholder={t("campaigns.linkPlaceholder")}
                        className="flex-1"
                        aria-label={`Link ${index + 1}`}
                      />
                      {links.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-destructive"
                          onClick={() => removeLinkRow(index)}
                          aria-label={`Remove link ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="w-10 shrink-0" aria-hidden />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("campaigns.screenshotsOptional")}</Label>
                <input
                  ref={fileInputRef}
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={onScreenshotsChange}
                />
                <div className="flex flex-wrap gap-2">
                  {images.map((img) => (
                    <div
                      key={img.key}
                      className="relative h-20 w-20 rounded-lg border border-border overflow-hidden bg-muted"
                    >
                      <img src={img.preview} alt="" className="h-full w-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-0.5 right-0.5 h-6 w-6 rounded-full shadow-md"
                        onClick={() => removeImagePick(img.key)}
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    {t("campaigns.chooseFile")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t("campaigns.addMoreImagesHint")}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                {t("campaigns.cancel")}
              </Button>
              <Button type="button" onClick={handleConfirmSubmit} disabled={submitPending || submittingAll}>
                {submitPending || submittingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("campaigns.submitting")}
                  </>
                ) : (
                  t("campaigns.submit")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <RouteSeo
        title={seoTitle}
        description={seoDescription}
        imageUrl={seoImage}
        canonicalPath={`/campaign/${campaign.id}`}
        siteName={brand}
        ogUrl={sharePreviewUrl || undefined}
      />
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/campaigns" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">{t("campaigns.detailTitle")}</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-6">
        <div className="relative rounded-2xl overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={campaign.name}
              className="w-full h-64 sm:h-80 object-contain object-center"
            />
          ) : (
            <div className="w-full h-64 sm:h-80 flex items-center justify-center">
              <Gift className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <Badge className="bg-success text-success-foreground border-0 mb-2">
              <Clock className="w-3 h-3 mr-1" />
              {isActive ? t("campaigns.activeBadge") : campaign.status_display ?? campaign.status}
            </Badge>
            <h2 className="text-xl font-bold">{campaign.name}</h2>
          </div>
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
            {imageUrl && (
              <CampaignImageDownloadButton
                url={imageUrl}
                fileName={campaignImageDownloadName(campaign.name, imageUrl)}
                className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/60 disabled:opacity-60"
              />
            )}
            <button
              type="button"
              onClick={copySharePreviewLink}
              className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/60"
            >
              <Share2 className="h-3 w-3 shrink-0" />
              {t("campaigns.copySocialPreviewLink")}
            </button>
          </div>
        </div>

        <div className="floating-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Gift className="w-7 h-7 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{t("campaigns.commissionLabel")}</p>
            <p className="text-2xl font-bold text-accent">
              {campaign.commission_type === "percentage" ? `${campaign.commission}%` : `रु ${campaign.commission}`}
            </p>
          </div>
        </div>

        {campaign.description && (
          <div className="floating-card p-4">
            <h3 className="font-semibold mb-2">{t("campaigns.aboutCampaign")}</h3>
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          </div>
        )}

        {relatedProduct && (
          <button
            type="button"
            className="floating-card p-4 w-full text-left"
            onClick={() => navigate(`/product/${relatedProduct.slug}`)}
          >
            <p className="text-sm text-muted-foreground mb-2">{t("campaigns.relatedProduct")}</p>
            <div className="flex items-center gap-3">
              {(relatedProduct.image_url || relatedProduct.image) ? (
                <img
                  src={relatedProduct.image_url || relatedProduct.image}
                  alt={relatedProduct.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-medium truncate">{relatedProduct.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{relatedProduct.short_description}</p>
                <p className="text-sm font-semibold mt-1">रु {Number(relatedProduct.selling_price).toLocaleString()}</p>
              </div>
            </div>
          </button>
        )}

        {renderAction()}
      </div>
    </div>
  );
};

export default CampaignDetail;
