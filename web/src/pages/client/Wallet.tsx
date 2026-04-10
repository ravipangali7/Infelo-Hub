import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  ChevronRight,
  Wallet as WalletIcon,
} from "lucide-react";
import { useWallet, useTransactions } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClientAppSeo } from "@/components/ClientAppSeo";

function formatTime(iso: string, t: (key: string) => string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return t("common:timeToday");
  if (diff < 86400000) return t("common:timeYesterday");
  return d.toLocaleDateString();
}

const Wallet = () => {
  const { t } = useTranslation(["pages", "common", "client"]);
  const { data: walletData, isLoading: walletLoading, error: walletError } = useWallet();
  const { data: txData, isLoading: txLoading } = useTransactions();

  const earning = Number(walletData?.earning_wallet) || 0;
  const topup = Number(walletData?.topup_wallet) || 0;
  const transactions = txData?.results ?? [];

  if (walletError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClientAppSeo
          title={`${t("pages:wallet.title")} | ${t("client:brand")}`}
          description={t("pages:wallet.failedLoad")}
          canonicalPath="/wallet"
          siteName={t("client:brand")}
        />
        <p className="text-destructive">{t("pages:wallet.failedLoad")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ClientAppSeo
        title={`${t("pages:wallet.title")} | ${t("client:brand")}`}
        description={t("pages:wallet.title")}
        canonicalPath="/wallet"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display">{t("pages:wallet.title")}</h1>
      </header>

      <div className="client-page-container client-page-content space-y-6 pb-8">
        <div className="wallet-card">
          <div className="relative z-10">
            {walletLoading ? (
              <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white/70 text-sm mb-1">{t("common:totalBalance")}</p>
                    <h2 className="text-3xl font-bold font-display">
                      {t("common:currencyShort")} {(earning + topup).toLocaleString()}
                    </h2>
                  </div>
                  <WalletIcon className="w-8 h-8 text-white/30" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">{t("common:earningWallet")}</p>
                    <p className="text-lg font-semibold">
                      {t("common:currencyShort")} {earning.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-white/60 text-xs mb-1">{t("common:topupWallet")}</p>
                    <p className="text-lg font-semibold">
                      {t("common:currencyShort")} {topup.toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/deposit"
                className="bg-white text-primary font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
              >
                <ArrowDownToLine className="w-4 h-4" />
                {t("client:nav.deposit")}
              </Link>
              <Link
                to="/withdraw"
                className="bg-accent text-white font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                {t("client:nav.withdraw")}
              </Link>
            </div>
          </div>
        </div>

        <section>
          <div className="section-header">
            <h3 className="section-title">{t("pages:wallet.transactionHistory")}</h3>
            <Link to="/transactions" className="text-sm text-primary font-medium flex items-center gap-1">
              {t("common:viewAll")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isAdded = tx.transaction_type === "added";
                const amt = Number(tx.amount) || 0;
                return (
                  <div key={tx.id} className="floating-card flex items-center gap-4 p-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isAdded ? "bg-success/10" : "bg-accent/10"
                      }`}
                    >
                      {isAdded ? (
                        <TrendingUp className="w-5 h-5 text-success" />
                      ) : (
                        <ArrowUpFromLine className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{tx.transaction_for_display || tx.transaction_for}</h4>
                        {tx.status !== "success" && (
                          <Badge
                            variant={tx.status === "failed" ? "destructive" : "secondary"}
                            className="text-[10px] px-1.5 py-0 font-medium shrink-0"
                          >
                            {tx.status_display}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTime(tx.created_at, t)}</p>
                    </div>
                    <span className={`font-semibold ${isAdded ? "text-success" : "text-foreground"}`}>
                      {isAdded ? "+" : "-"}
                      {t("common:currencyShort")} {Math.abs(amt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Wallet;
