import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClientAppSeo } from "@/components/ClientAppSeo";

function getIcon(type: string) {
  if (type === "added") return TrendingUp;
  if (type === "deducted") return ArrowUpFromLine;
  return ArrowDownToLine;
}

function getColor(type: string) {
  if (type === "added") return "bg-success/10 text-success";
  if (type === "deducted") return "bg-accent/10 text-accent";
  return "bg-primary/10 text-primary";
}

const Transactions = () => {
  const { t } = useTranslation(["pages", "client"]);
  const [tab, setTab] = useState("all");
  const { data, isLoading } = useTransactions(
    tab === "all" ? undefined : (tab === "earning" ? "earning" : tab === "deposit" ? "deposit" : "withdrawal")
  );
  const transactions = data?.results ?? [];

  return (
    <div className="min-h-screen bg-background">
      <ClientAppSeo
        title={`${t("misc.transactions.title")} | ${t("client:brand")}`}
        description={t("misc.transactions.title")}
        canonicalPath="/transactions"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/wallet" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">{t("misc.transactions.title")}</h1>
          </div>
          <button type="button" className="p-3 rounded-xl bg-card border border-border">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="client-page-container client-page-content pb-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl mb-4 grid grid-cols-4">
            <TabsTrigger value="all" className="rounded-lg text-xs">All</TabsTrigger>
            <TabsTrigger value="earning" className="rounded-lg text-xs">Earnings</TabsTrigger>
            <TabsTrigger value="deposit" className="rounded-lg text-xs">Deposits</TabsTrigger>
            <TabsTrigger value="withdraw" className="rounded-lg text-xs">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              transactions.map((tx) => {
                const Icon = getIcon(tx.transaction_type);
                const amt = Number(tx.amount) || 0;
                const isAdded = tx.transaction_type === "added";
                return (
                  <div key={tx.id} className="floating-card flex items-center gap-4 p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getColor(tx.transaction_type)}`}>
                      <Icon className="w-5 h-5" />
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
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`font-semibold ${isAdded ? "text-success" : "text-foreground"}`}>
                      {isAdded ? "+" : "-"}रु {Math.abs(amt).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
            {!isLoading && transactions.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No transactions</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Transactions;
