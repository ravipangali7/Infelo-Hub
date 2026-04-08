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
        <h1 className="text-2xl font-bold font-display">My Network</h1>
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
                  <span className="text-xs text-muted-foreground">Total Team</span>
                </div>
                <p className="text-2xl font-bold">{totalTeam}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Active Referrals</span>
                </div>
                <p className="text-2xl font-bold text-success">{activeReferrals}</p>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Direct Referrals</span>
                </div>
                <p className="text-2xl font-bold">{directReferrals}</p>
                <p className="text-xs text-success">{activeReferrals} active</p>
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
                  <p className="font-medium text-sm">Team Tree</p>
                  <p className="text-xs text-muted-foreground">View hierarchy</p>
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
                  <p className="font-medium text-sm">All Referrals</p>
                  <p className="text-xs text-muted-foreground">View list</p>
                </div>
              </Link>
            </div>

            <Tabs defaultValue="referrals" className="w-full">
              <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="referrals" className="flex-1 rounded-lg">
                  My Referrals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="referrals" className="mt-4 space-y-3">
                {referrals.length === 0 ? (
                  <div className="floating-card p-6 text-center text-muted-foreground">
                    No referrals yet. Share your link to grow your network.
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
                    View All Referrals <ChevronRight className="w-4 h-4 inline" />
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
