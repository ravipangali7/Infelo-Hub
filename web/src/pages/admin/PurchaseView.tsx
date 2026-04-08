import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminPurchase, useAdminDeletePurchase } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin";
import { ArrowLeft, Store, User, Package, DollarSign, Layers, ShoppingCart } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: p, isLoading, error } = useAdminPurchase(pid);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeletePurchase();

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !p) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (error || !p) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/purchases">Back</Link></div>
  );

  const itemCount = p.items?.length ?? 0;
  const totalUnits = p.items?.reduce((s, it) => s + it.quantity, 0) ?? 0;
  const avgUnitPrice = totalUnits > 0 ? Number(p.total) / totalUnits : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/purchases"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Purchases</Button></Link>
          <h1 className="text-3xl font-bold">Purchase #{p.id}</h1>
          <p className="text-muted-foreground">{p.vendor_name ?? "Vendor"}{p.user ? ` · ${p.user_name || `User #${p.user}`}` : ""} · {new Date(p.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {p.vendor && <Link to={`/system/vendors/${p.vendor}`}><Button variant="secondary"><Store className="h-4 w-4 mr-1" />Vendor</Button></Link>}
          {p.user && <Link to={`/system/users/${p.user}`}><Button variant="secondary"><User className="h-4 w-4 mr-1" />User</Button></Link>}
          <Link to={`/system/purchases/${pid}/edit`}><Button variant="outline">Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  रु {Number(p.total).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Subtotal</p>
                <p className="text-2xl font-bold mt-1">रु {Number(p.subtotal).toLocaleString()}</p>
                {Number(p.discount) > 0 && <p className="text-xs text-orange-600">-रु {Number(p.discount).toLocaleString()} discount</p>}
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Items</p>
                <p className="text-2xl font-bold mt-1">{totalUnits} units</p>
                <p className="text-xs text-muted-foreground">{itemCount} product types</p>
              </div>
              <Package className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Unit Cost</p>
                <p className="text-2xl font-bold mt-1">रु {avgUnitPrice.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Per unit</p>
              </div>
              <Layers className="h-8 w-8 text-amber-200 dark:text-amber-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Purchase Details */}
        <Card className="col-span-1">
          <CardHeader><CardTitle>Purchase Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${p.id}`],
              ["Vendor", p.vendor ? (p.vendor_name ?? "Vendor") : "—"],
              ["User", p.user ? (p.user_name || `User #${p.user}`) : "—"],
              ["Subtotal", `रु ${Number(p.subtotal).toLocaleString()}`],
              ["Discount", p.discount_type ? `${p.discount_type}: ${p.discount}` : "—"],
              ["Total", `रु ${Number(p.total).toLocaleString()}`],
              ["Products", String(itemCount)],
              ["Units", String(totalUnits)],
              ["Created", new Date(p.created_at).toLocaleString()],
              ["Updated", new Date(p.updated_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Vendor" && p.vendor ? (
                  <Link to={`/system/vendors/${p.vendor}`} className="text-primary underline text-sm">{p.vendor_name ?? `Vendor #${p.vendor}`}</Link>
                ) : label === "User" && p.user ? (
                  <Link to={`/system/users/${p.user}`} className="text-primary underline text-sm">{p.user_name || `User #${p.user}`}</Link>
                ) : (
                  <span className="text-sm font-medium">{val}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Margin analysis */}
        <Card className="col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" />Cost Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-lg font-bold">रु {Number(p.subtotal).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-xs text-muted-foreground">Discount</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-400">
                  {Number(p.discount) > 0 ? `-रु ${Number(p.discount).toLocaleString()}` : "—"}
                </p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">रु {Number(p.total).toLocaleString()}</p>
              </div>
            </div>
            {Number(p.discount) > 0 && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">Discount applied: <span className="text-orange-600">{p.discount_type}</span></p>
                <p className="text-muted-foreground">Saved: रु {Number(p.discount).toLocaleString()} ({(Number(p.discount) / Math.max(Number(p.subtotal), 1) * 100).toFixed(1)}% of subtotal)</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0" />Purchase Items ({itemCount} products, {totalUnits} units)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <AdminDataTable
            columns={[
              { id: "product", label: "Product", render: (it) => <span className="font-medium">{it.product_name}</span> },
              {
                id: "unit",
                label: "Unit Cost",
                render: (it) => <span className="md:text-right block">रु {Number(it.purchasing_price).toLocaleString()}</span>,
              },
              {
                id: "qty",
                label: "Quantity",
                render: (it) => <span className="md:text-right block">{it.quantity}</span>,
              },
              {
                id: "line",
                label: "Line Total",
                render: (it) => <span className="md:text-right block font-bold">रु {Number(it.total).toLocaleString()}</span>,
              },
              {
                id: "link",
                label: "Link",
                render: (it) => (
                  <Link to={`/system/products/${it.product}`} className="text-primary underline text-xs">View</Link>
                ),
              },
            ]}
            data={p.items ?? []}
            keyFn={(it) => it.id}
          />
          <div className="p-4 border-t bg-muted/30 flex justify-end gap-8 text-sm">
            <span className="text-muted-foreground">Subtotal: <strong>रु {Number(p.subtotal).toLocaleString()}</strong></span>
            {Number(p.discount) > 0 && <span className="text-muted-foreground">Discount: <strong className="text-orange-600">-रु {Number(p.discount).toLocaleString()}</strong></span>}
            <span className="font-bold text-base">Total: रु {Number(p.total).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All line items will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              deleteMut.mutate(p.id, {
                onSuccess: () => { toast({ title: "Deleted" }); navigate("/system/purchases"); },
                onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
              });
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
