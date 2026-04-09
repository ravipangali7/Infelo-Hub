import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePackages, useProfile } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const packageColors = ["from-yellow-400 to-orange-500", "from-purple-400 to-purple-600", "from-slate-400 to-slate-600", "from-emerald-400 to-teal-600"];

const MyPackages = () => {
  const { t } = useTranslation("pages");
  const { data: profile } = useProfile();
  const { data: packagesData, isLoading, error } = usePackages();
  const packages = packagesData?.results ?? [];
  const currentPackageName = profile?.package_name ?? profile?.package;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">{t("misc.myPackages.loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">{t("misc.myPackages.title")}</h1>
      </header>

      <div className="client-page-container client-page-content pb-8 space-y-6">
        {currentPackageName && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("misc.myPackages.activePackage")}</h2>
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-5 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6" />
                    <h3 className="text-xl font-bold">{currentPackageName}</h3>
                  </div>
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {t("misc.myPackages.active")}
                  </Badge>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {currentPackageName ? "Upgrade Options" : "Available Packages"}
          </h2>
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full rounded-xl mb-3" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </>
          ) : packages.length === 0 ? (
            <div className="floating-card p-6 text-center text-muted-foreground">
              No packages available.
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg, i) => (
                <Link key={pkg.id} to={`/package/${pkg.id}`} className="block">
                  <div
                    className={`bg-gradient-to-r ${packageColors[i % packageColors.length]} text-white rounded-xl p-4 flex items-center justify-between`}
                  >
                    <div>
                      <h3 className="font-bold">{pkg.name}</h3>
                    </div>
                    <p className="text-xl font-bold">रु {Number(pkg.amount).toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MyPackages;
