import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gift, Clock, CheckCircle2, XCircle, ChevronRight, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaigns, useSubmissions } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { Campaign } from "@/api/types";
import { getToken } from "@/api/client";

const MyCampaigns = () => {
  const isLoggedIn = !!getToken();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTab = isLoggedIn && searchParams.get("tab") === "submissions" ? "submissions" : "browse";

  const {
    data: campaignsData,
    isLoading: campaignsLoading,
    error: campaignsError,
  } = useCampaigns();
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useSubmissions();

  const campaigns = campaignsData?.results ?? [];
  const running = campaigns.filter((c) => c.status === "running");
  const coming = campaigns.filter((c) => c.status === "coming");

  const submissions = submissionsData?.results ?? [];
  const submittedCampaignIds = new Set(submissions.map((s) => s.campaign));

  const active = submissions.filter((s) => s.status === "pending");
  const completed = submissions.filter((s) => s.status === "approved");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const renderSubmissionCard = (sub: (typeof submissions)[0]) => (
    <Link
      key={sub.id}
      to={`/submission/${sub.id}`}
      className="floating-card flex items-center gap-4 p-4"
    >
      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
        <Gift className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{sub.campaign_name}</h3>
          <Badge
            variant={
              sub.status === "approved" ? "default" : sub.status === "rejected" ? "destructive" : "secondary"
            }
            className="text-[10px]"
          >
            {sub.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {sub.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
            {sub.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
            {sub.status_display ?? sub.status}
          </Badge>
        </div>
        {sub.status === "rejected" && sub.reject_reason && (
          <p className="text-xs text-destructive mt-1">{sub.reject_reason}</p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </Link>
  );

  const renderCampaignRow = (campaign: Campaign) => {
    const img = campaign.image_url || campaign.image;
    const hasSubmission = submittedCampaignIds.has(campaign.id);
    const isRunning = campaign.status === "running";

    return (
      <Link
        key={campaign.id}
        to={`/campaign/${campaign.id}`}
        className="floating-card flex items-center gap-4 p-4"
      >
        {img ? (
          <img src={img} alt={campaign.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Gift className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{campaign.name}</h3>
            {hasSubmission && (
              <Badge variant="outline" className="text-[10px]">
                Submitted
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.commission_type === "percentage"
              ? `Up to ${campaign.commission}%`
              : `Earn up to रु ${campaign.commission}`}
          </p>
        </div>
        <div
          className={
            isRunning
              ? "bg-success/10 text-success text-xs font-medium px-3 py-1 rounded-full shrink-0"
              : "bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-full shrink-0"
          }
        >
          {campaign.status_display ?? campaign.status}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </Link>
    );
  };

  const browseSkeleton = (
    <>
      <Skeleton className="h-6 w-40 rounded-xl mb-3" />
      <Skeleton className="h-20 w-full rounded-xl mb-3" />
      <Skeleton className="h-20 w-full rounded-xl mb-6" />
      <Skeleton className="h-6 w-36 rounded-xl mb-3" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </>
  );

  const submissionsSkeleton = (
    <>
      <Skeleton className="h-10 w-full rounded-xl mb-4" />
      <Skeleton className="h-20 w-full rounded-xl mb-3" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Campaigns</h1>
      </header>

      <div className="client-page-container client-page-content pb-8">
        <Tabs
          value={mainTab}
          onValueChange={(v) => {
            if (v === "browse") setSearchParams({});
            else setSearchParams({ tab: "submissions" });
          }}
          className="w-full"
        >
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="browse" className="flex-1 rounded-lg gap-1.5">
              <Megaphone className="w-4 h-4" />
              Campaigns
            </TabsTrigger>
            {isLoggedIn && (
              <TabsTrigger value="submissions" className="flex-1 rounded-lg">
                My submissions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="browse" className="space-y-6 mt-0">
            {campaignsLoading ? (
              browseSkeleton
            ) : campaignsError ? (
              <div className="floating-card p-6 text-center text-destructive text-sm">
                Failed to load campaigns. Please try again later.
              </div>
            ) : (
              <>
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Running
                  </h2>
                  <div className="space-y-3">
                    {running.length === 0 ? (
                      <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                        No running campaigns right now.
                      </div>
                    ) : (
                      running.map(renderCampaignRow)
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Coming soon
                  </h2>
                  <div className="space-y-3">
                    {coming.length === 0 ? (
                      <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                        No upcoming campaigns.
                      </div>
                    ) : (
                      coming.map(renderCampaignRow)
                    )}
                  </div>
                </section>
              </>
            )}
          </TabsContent>

          {isLoggedIn && (
          <TabsContent value="submissions" className="space-y-4 mt-0">
            {submissionsError ? (
              <div className="floating-card p-6 text-center text-destructive text-sm">
                Failed to load your submissions.
              </div>
            ) : submissionsLoading ? (
              submissionsSkeleton
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-4 flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" className="flex-1 min-w-[4.5rem] rounded-lg text-xs sm:text-sm">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="active" className="flex-1 min-w-[4.5rem] rounded-lg text-xs sm:text-sm">
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex-1 min-w-[4.5rem] rounded-lg text-xs sm:text-sm">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex-1 min-w-[4.5rem] rounded-lg text-xs sm:text-sm">
                    Rejected
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {submissions.length === 0 ? (
                    <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                      You have not submitted to any campaign yet. Open the Campaigns tab to join one.
                    </div>
                  ) : (
                    submissions.map(renderSubmissionCard)
                  )}
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                  {active.length === 0 ? (
                    <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                      No submissions awaiting review.
                    </div>
                  ) : (
                    active.map(renderSubmissionCard)
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {completed.length === 0 ? (
                    <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                      No approved submissions yet.
                    </div>
                  ) : (
                    completed.map(renderSubmissionCard)
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4">
                  {rejected.length === 0 ? (
                    <div className="floating-card p-8 text-center text-muted-foreground text-sm">
                      No rejected submissions.
                    </div>
                  ) : (
                    rejected.map(renderSubmissionCard)
                  )}
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default MyCampaigns;
