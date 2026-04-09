import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useReferrals } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const ReferralList = () => {
  const { t } = useTranslation("pages");
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useReferrals();
  const referrals = data?.results ?? [];
  const filtered = search.trim()
    ? referrals.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (r.phone || "").includes(search)
      )
    : referrals;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">{t("misc.referral.loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/network" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{t("misc.referral.title")}</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("misc.referral.searchPlaceholder")}
            className="pl-10 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : filtered.length === 0 ? (
          <div className="floating-card p-8 text-center text-muted-foreground">
            No referrals yet.
          </div>
        ) : (
          filtered.map((ref) => (
            <div key={ref.id} className="floating-card flex items-center gap-4 p-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {(ref.name || ref.phone || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">{ref.name || ref.phone || "—"}</h4>
                  <Badge variant={ref.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {ref.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{ref.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">Direct</Badge>
                  {ref.package_name && (
                    <Badge variant="secondary" className="text-[10px]">{ref.package_name}</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">
                  {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReferralList;
