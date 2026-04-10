import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOrders } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

function getItemPreview(items: { product_name: string }[] = [], t: (k: string, o?: Record<string, unknown>) => string) {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0].product_name;
  if (items.length === 2) return `${items[0].product_name}, ${items[1].product_name}`;
  return `${items[0].product_name}, ${items[1].product_name} ${t("orders.itemPreviewMore", { count: items.length - 2 })}`;
}

const MyOrders = () => {
  const { t } = useTranslation(["pages", "client"]);
  const { data, isLoading, error } = useOrders();
  const orders = data?.results ?? [];

  const STATUS_META = useMemo(
    () =>
      ({
        delivered: {
          icon: CheckCircle2,
          label: t("orders.status.delivered"),
          cardBorder: "border-l-success",
          badgeClass: "bg-success/10 text-success",
        },
        shipped: {
          icon: Truck,
          label: t("orders.status.shipped"),
          cardBorder: "border-l-primary",
          badgeClass: "bg-primary/10 text-primary",
        },
        processing: {
          icon: Package,
          label: t("orders.status.processing"),
          cardBorder: "border-l-warning",
          badgeClass: "bg-warning/10 text-warning",
        },
        cancelled: {
          icon: XCircle,
          label: t("orders.status.cancelled"),
          cardBorder: "border-l-destructive",
          badgeClass: "bg-destructive/10 text-destructive",
        },
        rejected: {
          icon: XCircle,
          label: t("orders.status.rejected"),
          cardBorder: "border-l-destructive",
          badgeClass: "bg-destructive/10 text-destructive",
        },
        pending: {
          icon: Clock,
          label: t("orders.status.pending"),
          cardBorder: "border-l-border",
          badgeClass: "bg-muted text-muted-foreground",
        },
      }) as Record<
        string,
        { icon: typeof Clock; label: string; cardBorder: string; badgeClass: string }
      >,
    [t],
  );

  const orderCountLabel =
    orders.length === 1 ? t("orders.orderSingular", { count: orders.length }) : t("orders.orderPlural", { count: orders.length });

  return (
    <div className="min-h-screen bg-background">
      <ClientAppSeo
        title={`${t("orders.myOrders")} | ${t("client:brand")}`}
        description={t("orders.myOrders")}
        canonicalPath="/orders"
        siteName={t("client:brand")}
      />
      <header className="client-page-container client-page-content flex items-center gap-4 py-3 sticky top-0 bg-background/80 backdrop-blur-xl z-40 border-b border-border">
        <Link to="/profile" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold font-display">{t("orders.myOrders")}</h1>
          {!isLoading && !error && <p className="text-xs text-muted-foreground">{orderCountLabel}</p>}
        </div>
      </header>

      <div className="client-page-container client-page-content py-4 pb-10 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </>
        ) : error ? (
          <div className="floating-card p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <XCircle className="w-10 h-10 text-destructive/50" />
            <p className="font-medium text-foreground">{t("orders.failedLoad")}</p>
            <p className="text-sm">{t("orders.tryRefresh")}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="floating-card p-10 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <p className="font-semibold text-lg font-display">{t("orders.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("orders.emptyHint")}</p>
            </div>
            <Link
              to="/shop"
              className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
            >
              {t("orders.browseShop")}
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const status = STATUS_META[order.status] ?? STATUS_META.pending;
            const StatusIcon = status.icon;
            const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : "";
            const itemPreview = getItemPreview(order.items ?? [], t);
            const itemCount = order.items?.length ?? 0;
            const itemsLabel =
              itemCount === 1 ? t("orders.itemsSingular", { count: itemCount }) : t("orders.itemsPlural", { count: itemCount });

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className={`floating-card p-4 flex flex-col gap-3 border-l-4 ${status.cardBorder} hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold font-display text-base">#{order.id}</p>
                      <Badge className={`${status.badgeClass} border-0 text-[10px] px-2 py-0.5`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {order.payment_status && (
                      <Badge
                        className={`${PAYMENT_STATUS_CLASS[order.payment_status] ?? "bg-muted text-muted-foreground"} border-0 text-[10px] px-2 py-0.5 capitalize`}
                      >
                        {order.payment_status_display ?? order.payment_status}
                      </Badge>
                    )}
                  </div>
                </div>

                {itemPreview && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{itemPreview}</p>}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">{itemsLabel}</p>
                    <p className="font-bold text-primary">रु {Number(order.total).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    {t("orders.viewDetails")}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyOrders;
