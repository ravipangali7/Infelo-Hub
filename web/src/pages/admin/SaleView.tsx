import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminSale, useAdminDeleteSale, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Store, MapPin, ShoppingCart, DollarSign, Package } from "lucide-react";
import { AdminUserViewCard, AdminAddressDetailCard } from "@/components/admin";
import { PAYMENT_METHOD_DISPLAY_LABEL } from "@/components/PaymentMethodLogo";
import type { PaymentStatus, SalesStatus } from "@/api/types";

const STATUSES: SalesStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled", "rejected"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "delivered") return "default";
  if (s === "cancelled" || s === "rejected") return "destructive";
  return "secondary";
};

const paymentVariant = (s: string) => s === "paid" ? "default" : s === "failed" ? "destructive" : "secondary";

export default function SaleView() {
  const { id } = useParams<{ id: string }>();
  const oid = id ? parseInt(id, 10) : null;
  const { data: o, isLoading, error, refetch } = useAdminSale(oid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nextStatus, setNextStatus] = useState<SalesStatus | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const deleteMut = useAdminDeleteSale();

  useEffect(() => {
    if (o) {
      setNextStatus(o.status);
      setNextPaymentStatus(o.payment_status);
    }
  }, [o]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminKeys.sales({}) });
    if (oid) qc.invalidateQueries({ queryKey: adminKeys.sale(oid) });
  };

  if (!oid || isNaN(oid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !o) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 md:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );
  if (error || !o) return (
    <div className="space-y-2"><p className="text-destructive">Order not found.</p><Link to="/system/sales">Back</Link></div>
  );

  const itemCount = o.items?.length ?? 0;
  const totalItems = o.items?.reduce((s, it) => s + it.quantity, 0) ?? 0;
  const totalRewards = o.items?.reduce((s, it) => s + Number(it.reward ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/sales"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Sales</Button></Link>
          <h1 className="text-3xl font-bold">Order #{o.id}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={statusVariant(o.status)} className="capitalize">{o.status_display || o.status}</Badge>
            <Badge variant={paymentVariant(o.payment_status)}>{o.payment_status_display || o.payment_status}</Badge>
            {o.payment_method && <Badge variant="outline">{PAYMENT_METHOD_DISPLAY_LABEL[o.payment_method] ?? o.payment_method}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {o.vendor && <Link to={`/system/vendors/${o.vendor}`}><Button variant="secondary"><Store className="h-4 w-4 mr-1" />Vendor</Button></Link>}
          <Link to={`/system/sales/${oid}/edit`}><Button variant="outline">Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Total</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              रु {Number(o.total).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Subtotal</p>
            <p className="text-2xl font-bold mt-1">रु {Number(o.subtotal).toLocaleString()}</p>
            {Number(o.discount) > 0 && (
              <p className="text-xs text-orange-600">-रु {Number(o.discount).toLocaleString()} discount</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Shipping</p>
            <p className="text-2xl font-bold mt-1">रु {Number(o.shipping_charge).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Items</p>
            <p className="text-2xl font-bold mt-1">{totalItems} units</p>
            <p className="text-xs text-muted-foreground">{itemCount} product types</p>
          </CardContent>
        </Card>
      </div>

      {o.user ? <AdminUserViewCard userId={o.user} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Details */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["Order ID", `#${o.id}`],
              ["Vendor", null],
              ["Status", null],
              ["Payment Status", null],
              ["Payment Method", o.payment_method ? (PAYMENT_METHOD_DISPLAY_LABEL[o.payment_method] ?? o.payment_method) : "—"],
              ["Subtotal", `रु ${Number(o.subtotal).toLocaleString()}`],
              ["Discount", o.discount_type ? `${o.discount_type}: रु ${Number(o.discount).toLocaleString()}` : "—"],
              ["Shipping", `रु ${Number(o.shipping_charge).toLocaleString()}`],
              ["Total", `रु ${Number(o.total).toLocaleString()}`],
              ["Created", new Date(o.created_at).toLocaleString()],
              ["Updated", new Date(o.updated_at).toLocaleString()],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Vendor" ? (
                  o.vendor ? <Link to={`/system/vendors/${o.vendor}`} className="text-primary underline text-sm">{o.vendor_name ?? `Vendor #${o.vendor}`}</Link> : <span className="text-sm">—</span>
                ) : label === "Status" ? (
                  <Badge variant={statusVariant(o.status)} className="text-xs capitalize">{o.status_display || o.status}</Badge>
                ) : label === "Payment Status" ? (
                  <Badge variant={paymentVariant(o.payment_status)} className="text-xs">{o.payment_status_display || o.payment_status}</Badge>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status Update + Address */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Update Order Status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-36">
                <Select value={(nextStatus ?? o.status) as string} onValueChange={(v) => setNextStatus(v as SalesStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((st) => (
                      <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => { if (nextStatus && nextStatus !== o.status) setConfirmOpen(true); }}
                disabled={!nextStatus || nextStatus === o.status}
              >
                Update
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Update Payment Status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-36">
                <Select value={(nextPaymentStatus ?? o.payment_status) as string} onValueChange={(v) => setNextPaymentStatus(v as PaymentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((ps) => (
                      <SelectItem key={ps} value={ps} className="capitalize">{ps}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                onClick={() => { if (nextPaymentStatus && nextPaymentStatus !== o.payment_status) setPaymentConfirmOpen(true); }}
                disabled={!nextPaymentStatus || nextPaymentStatus === o.payment_status}
              >
                Update
              </Button>
            </CardContent>
          </Card>

          {o.address_detail ? (
            <AdminAddressDetailCard address={o.address_detail} />
          ) : o.address ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Delivery Address</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {o.address_name && <p className="font-medium">{o.address_name}</p>}
                {o.address_phone && <p className="text-muted-foreground">{o.address_phone}</p>}
                {o.address_text && <p>{o.address_text}</p>}
                {(o.address_city || o.address_district || o.address_state) && (
                  <p className="text-muted-foreground">
                    {[o.address_city, o.address_district, o.address_state].filter(Boolean).join(", ")}
                  </p>
                )}
                <Link to={`/system/addresses/${o.address}`} className="text-primary underline text-xs">View address #{o.address}</Link>
              </CardContent>
            </Card>
          ) : null}

          {totalRewards > 0 && (
            <Card className="border-l-4 border-l-emerald-400">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Total Rewards Paid</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      रु {totalRewards.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Line Items ({itemCount} products, {totalItems} units)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {o.items?.map((it) => (
              <div key={it.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                {it.product_image_url ? (
                  <div className="shrink-0 w-full sm:w-24 h-24 rounded-md overflow-hidden border bg-muted">
                    <img src={it.product_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <Link to={`/system/products/${it.product}`} className="text-primary underline font-semibold text-sm leading-tight">
                    {it.product_name}
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm md:grid-cols-2">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="text-right font-medium">रु {Number(it.selling_price).toLocaleString()}</span>
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="text-right font-medium">{it.quantity}</span>
                  <span className="text-muted-foreground">Line Total</span>
                  <span className="text-right font-bold text-emerald-700 dark:text-emerald-400">रु {Number(it.total).toLocaleString()}</span>
                  {it.reward ? (
                    <>
                      <span className="text-muted-foreground">Reward</span>
                      <span className="text-right text-emerald-600 font-medium">रु {Number(it.reward).toLocaleString()}</span>
                    </>
                  ) : null}
                  {it.referred_by ? (
                    <>
                      <span className="text-muted-foreground">Referred By</span>
                      <span className="text-right">
                        <Link to={`/system/users/${it.referred_by}`} className="text-primary underline text-xs">User #{it.referred_by}</Link>
                      </span>
                    </>
                  ) : null}
                </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap justify-end gap-6 text-sm">
            <span className="text-muted-foreground">Subtotal: <strong>रु {Number(o.subtotal).toLocaleString()}</strong></span>
            {Number(o.discount) > 0 && <span className="text-muted-foreground">Discount: <strong className="text-orange-600">-रु {Number(o.discount).toLocaleString()}</strong></span>}
            <span className="text-muted-foreground">Shipping: <strong>रु {Number(o.shipping_charge).toLocaleString()}</strong></span>
            <span className="font-bold text-base">Total: रु {Number(o.total).toLocaleString()}</span>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Order Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Change status from <strong className="capitalize">{o.status}</strong> to <strong className="capitalize">{nextStatus as string}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!nextStatus) return;
              try {
                await adminApi.updateSaleStatus(o.id, nextStatus);
                toast({ title: "Status updated", description: `Order is now ${nextStatus}` });
                setConfirmOpen(false);
                invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed to update" }); }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Payment Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Change payment status from <strong className="capitalize">{o.payment_status}</strong> to <strong className="capitalize">{nextPaymentStatus as string}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!nextPaymentStatus) return;
              try {
                await adminApi.updateSale(o.id, { payment_status: nextPaymentStatus });
                toast({ title: "Payment status updated", description: `Payment is now ${nextPaymentStatus}` });
                setPaymentConfirmOpen(false);
                invalidate(); refetch();
              } catch { toast({ variant: "destructive", title: "Failed to update" }); }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All line items will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(o.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/sales"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
