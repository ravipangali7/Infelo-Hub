import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShoppingBag,
  MapPin,
  CreditCard,
  Gift,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useOrder, useAddresses } from "@/api/hooks";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const CANCELLED_STATUSES = ["cancelled", "rejected"];

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive",
};

function getStepIndex(steps: { key: string }[], status: string) {
  return steps.findIndex((s) => s.key === status);
}

const OrderDetail = () => {
  const { t } = useTranslation(["pages", "client"]);
  const { id } = useParams();
  const { data: order, isLoading, error } = useOrder(id ? Number(id) : null);
  const { data: addressesData } = useAddresses();

  const STATUS_STEPS = useMemo(
    () => [
      { key: "pending", label: t("orders.step.pending"), icon: Clock },
      { key: "processing", label: t("orders.step.processing"), icon: Package },
      { key: "shipped", label: t("orders.step.shipped"), icon: Truck },
      { key: "delivered", label: t("orders.step.delivered"), icon: CheckCircle2 },
    ],
    [t],
  );

  const STATUS_META = useMemo(
    () =>
      ({
        delivered: { icon: CheckCircle2, label: t("orders.status.delivered"), color: "text-success", bg: "bg-success/15" },
        shipped: { icon: Truck, label: t("orders.status.shipped"), color: "text-primary", bg: "bg-primary/15" },
        processing: { icon: Package, label: t("orders.status.processing"), color: "text-warning", bg: "text-warning bg-warning/15" },
        cancelled: { icon: XCircle, label: t("orders.status.cancelled"), color: "text-destructive", bg: "bg-destructive/15" },
        rejected: { icon: XCircle, label: t("orders.status.rejected"), color: "text-destructive", bg: "bg-destructive/15" },
        pending: { icon: Clock, label: t("orders.status.pending"), color: "text-muted-foreground", bg: "bg-muted" },
      }) as Record<string, { icon: typeof Clock; label: string; color: string; bg: string }>,
    [t],
  );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <ClientAppSeo
          title={`${t("orders.orderLabel")} | ${t("client:brand")}`}
          description={t("orders.notFound")}
          canonicalPath={id ? `/orders/${id}` : "/orders"}
          siteName={t("client:brand")}
        />
        <AlertCircle className="w-12 h-12 text-destructive/60" />
        <p className="text-destructive font-medium">{t("orders.notFound")}</p>
        <Link to="/orders" className="text-sm text-primary underline">
          {t("orders.backToOrders")}
        </Link>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-background">
        <ClientAppSeo
          title={`${t("orders.orderLabel")} | ${t("client:brand")}`}
          description={t("orders.myOrders")}
          canonicalPath={id ? `/orders/${id}` : "/orders"}
          siteName={t("client:brand")}
        />
        <div className="client-page-container client-page-content bg-gradient-primary pt-12 pb-16">
          <Skeleton className="h-6 w-32 rounded-lg bg-white/20 mb-2" />
          <Skeleton className="h-8 w-48 rounded-lg bg-white/20" />
        </div>
        <div className="client-page-container client-page-content -mt-8 pb-8 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending;
  const StatusIcon = statusMeta.icon;
  const isCancelled = CANCELLED_STATUSES.includes(order.status);
  const currentStepIndex = getStepIndex(STATUS_STEPS, order.status);
  const date = order.created_at ? new Date(order.created_at).toLocaleString() : "";
  const subtotal = Number(order.subtotal) || 0;
  const shipping = Number(order.shipping_charge) || 0;
  const discount = Number(order.discount) || 0;
  const total = Number(order.total) || 0;

  const deliveryAddress = addressesData?.results?.find((a) => a.id === order.address);

  const pm = String(order.payment_method ?? "");
  const paymentMethodLabel = ["esewa", "khalti", "bank", "cod", "wallet"].includes(pm)
    ? t(`orders.paymentMethod_${pm}` as "orders.paymentMethod_esewa")
    : order.payment_method;

  const cancelledBody =
    order.status === "cancelled"
      ? t("orders.orderCancelledBodyCancelled")
      : order.status === "rejected"
        ? t("orders.orderCancelledBodyRejected")
        : t("orders.orderCancelledBodyCancelled");

  return (
    <div className="min-h-screen bg-background pb-10">
      <ClientAppSeo
        title={`${t("orders.orderLabel")} #${order.id} | ${t("client:brand")}`}
        description={`${t("orders.orderLabel")} #${order.id}`}
        canonicalPath={`/orders/${order.id}`}
        siteName={t("client:brand")}
      />
      <div className="client-page-container client-page-content bg-gradient-primary relative overflow-hidden pt-4 pb-20">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }}
        />
        <div className="relative z-10">
          <Link to="/orders" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t("orders.myOrders")}</span>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs mb-1">{t("orders.orderLabel")}</p>
              <h1 className="text-2xl font-bold font-display text-white">#{order.id}</h1>
              <p className="text-white/60 text-xs mt-1">{date}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusMeta.bg} backdrop-blur-sm`}>
              <StatusIcon className={`w-3.5 h-3.5 ${statusMeta.color}`} />
              <span className={`text-xs font-semibold ${statusMeta.color}`}>{statusMeta.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="client-page-container client-page-content -mt-10 space-y-4 relative z-10">
        {!isCancelled ? (
          <div className="floating-card p-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-border mx-8" />
              {STATUS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = currentStepIndex >= i;
                const active = currentStepIndex === i;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${done ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground"}
                      ${active ? "ring-2 ring-primary ring-offset-2" : ""}
                    `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-medium text-center leading-tight
                      ${done ? "text-primary" : "text-muted-foreground"}
                    `}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="floating-card p-4 border-l-4 border-destructive">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive">{t("orders.orderCancelledTitle", { status: statusMeta.label })}</p>
                <p className="text-xs text-muted-foreground">{cancelledBody}</p>
              </div>
            </div>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className="floating-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">
                {order.items.length === 1
                  ? t("orders.itemsSingular", { count: order.items.length })
                  : t("orders.itemsPlural", { count: order.items.length })}
              </h3>
            </div>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        रु {Number(item.selling_price).toLocaleString()} × {item.quantity}
                      </p>
                      {item.reward && Number(item.reward) > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                          <Gift className="w-3 h-3" />
                          {t("orders.rewardBadge", { amount: Number(item.reward).toLocaleString() })}
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-sm shrink-0">रु {Number(item.total).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="floating-card p-4">
          <h3 className="font-semibold text-sm mb-3">{t("orders.priceBreakdown")}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("orders.subtotal")}</span>
              <span>रु {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("orders.shipping")}</span>
              <span>{shipping > 0 ? `रु ${shipping.toLocaleString()}` : t("orders.free")}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("orders.discount")}</span>
                <span className="text-success">-रु {discount.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>{t("orders.total")}</span>
              <span className="text-primary text-lg">रु {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="floating-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">{t("orders.payment")}</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{paymentMethodLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("orders.paymentMethod")}</p>
            </div>
            <Badge
              className={`border-0 font-medium ${PAYMENT_STATUS_STYLE[order.payment_status] ?? "bg-muted text-muted-foreground"}`}
            >
              {order.payment_status_display ?? order.payment_status}
            </Badge>
          </div>
        </div>

        <div className="floating-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">{t("orders.deliveryAddress")}</h3>
          </div>
          {deliveryAddress ? (
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{deliveryAddress.name}</p>
              <p className="text-muted-foreground">{deliveryAddress.phone}</p>
              <p className="text-muted-foreground">{deliveryAddress.address}</p>
              <p className="text-muted-foreground">
                {[deliveryAddress.district, deliveryAddress.state, deliveryAddress.country || "Nepal"].filter(Boolean).join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t("orders.addressUnavailable")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
