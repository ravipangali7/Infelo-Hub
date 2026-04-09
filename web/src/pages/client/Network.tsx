import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Users, UserCheck, TrendingUp, ChevronRight, GitBranch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useReferrals, useTeamTree } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

function countTreeNodes(node: { user?: unknown; children?: unknown[] }): number {
  if (!node) return 0;
  let n = 1;
  const children = node.children ?? [];
  for (const c of children) {
    n += countTreeNodes(c as { user?: unknown; children?: unknown[] });
  }
  return n;
}

const Network = () => {
  const { t } = useTranslation("pages");
  const { data: referralsData, isLoading: refLoading } = useReferrals();
  const { data: treeData, isLoading: treeLoading } = useTeamTree();

  const referrals = referralsData?.results ?? [];
  const directReferrals = referrals.length;
  const activeReferrals = referrals.filter((r) => r.status === "active").length;
  const totalTeam = treeData ? countTreeNodes(treeData as { user?: unknown; children?: unknown[] }) : 0;

  const isLoading = refLoading || treeLoading;

  return (
    <div className="min-h-screen">
      <header className="client-page-container client-page-content pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display">{t("misc.network.title")}</h1>
      </header>

      <div className="client-page-container client-page-content space-y-6 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("misc.network.totalTeam")}</span>
                </div>
                <p className="text-2xl font-bold">{totalTeam}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">{t("misc.network.activeReferrals")}</span>
                </div>
                <p className="text-2xl font-bold text-success">{activeReferrals}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("misc.network.directReferrals")}</span>
                </div>
                <p className="text-2xl font-bold">{directReferrals}</p>
                <p className="text-xs text-success">{t("misc.network.activeCount", { count: activeReferrals })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/team-tree"
                className="floating-card p-4 flex items-center gap-3 hover:shadow-lg transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t("misc.network.teamTree")}</p>
                  <p className="text-xs text-muted-foreground">{t("misc.network.viewHierarchy")}</p>
                </div>
              </Link>
              <Link
                to="/referrals"
                className="floating-card p-4 flex items-center gap-3 hover:shadow-lg transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t("misc.network.allReferrals")}</p>
                  <p className="text-xs text-muted-foreground">{t("misc.network.viewList")}</p>
                </div>
              </Link>
            </div>

            <Tabs defaultValue="referrals" className="w-full">
              <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="referrals" className="flex-1 rounded-lg">
                  {t("misc.network.myReferralsTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="referrals" className="mt-4 space-y-3">
                {referrals.length === 0 ? (
                  <div className="floating-card p-6 text-center text-muted-foreground">
                    {t("misc.network.emptyReferrals")}
                  </div>
                ) : (
                  referrals.slice(0, 5).map((ref) => (
                    <div key={ref.id} className="floating-card flex items-center gap-4 p-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {(ref.name || ref.phone || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{ref.name || ref.phone || "—"}</h4>
                          <Badge
                            variant={ref.status === "active" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {ref.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ref.phone}</p>
                        {ref.package_name && (
                          <p className="text-xs text-primary">{ref.package_name} Package</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">
                          {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {referrals.length > 0 && (
                  <Link
                    to="/referrals"
                    className="block text-center text-sm text-primary font-medium py-3"
                  >
                    {t("misc.network.viewAllReferrals")} <ChevronRight className="w-4 h-4 inline" />
                  </Link>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Network;
