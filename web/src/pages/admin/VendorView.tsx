import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAdminVendor, useAdminDeleteVendor, useAdminSalesList, useAdminPurchaseList, useAdminPaidRecordList, useAdminReceivedRecordList } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin";
import { ArrowLeft, Edit, Store, TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, User } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function VendorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vid = id ? parseInt(id, 10) : null;
  const { data: v, isLoading, error } = useAdminVendor(vid);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteVendor();
  const { toast } = useToast();

  const vendorParam = vid ? { vendor: String(vid), page_size: 5, page: 1 } : undefined;
  const { data: salesData } = useAdminSalesList(vendorParam);
  const { data: purchasesData } = useAdminPurchaseList(vendorParam);
  const { data: paidData } = useAdminPaidRecordList(vendorParam);
  const { data: receivedData } = useAdminReceivedRecordList(vendorParam);

  if (!vid || isNaN(vid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !v) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !v) return (
    <div className="space-y-2"><p className="text-destructive">Vendor not found.</p><Link to="/system/vendors">Back</Link></div>
  );

  const sales = salesData?.results ?? [];
  const purchases = purchasesData?.results ?? [];
  const paidRecords = paidData?.results ?? [];
  const receivedRecords = receivedData?.results ?? [];

  const totalSalesRevenue = sales.reduce((s, o) => s + Number(o.total), 0);
  const totalPurchasesValue = purchases.reduce((s, p) => s + Number(p.total), 0);
  const totalPaid = paidRecords.reduce((s, r) => s + Number(r.amount), 0);
  const totalReceived = receivedRecords.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/vendors"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Vendors</Button></Link>
          <div className="flex items-center gap-3">
            {v.logo_url && <img src={v.logo_url} alt="" className="h-14 w-14 rounded-lg border object-contain" />}
            <div>
              <h1 className="text-3xl font-bold">{v.name}</h1>
              <p className="text-muted-foreground">{v.phone || "No phone"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {v.user && <Link to={`/system/users/${v.user}`}><Button variant="secondary"><User className="h-4 w-4 mr-1" />{v.user_name || "User"}</Button></Link>}
          <Link to={`/system/vendors/${v.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payable to Vendor</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">
                  रु {Number(v.payable).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Amount vendor is owed</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200 dark:text-orange-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Receivable from Vendor</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  रु {Number(v.receivable).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Amount vendor owes</p>
              </div>
              <TrendingDown className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Balance</p>
                <p className={`text-2xl font-bold mt-1 ${Number(v.receivable) - Number(v.payable) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                  रु {(Number(v.receivable) - Number(v.payable)).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Receivable − Payable</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Transactions</p>
                <p className="text-2xl font-bold mt-1">{(salesData?.count ?? 0) + (purchasesData?.count ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{salesData?.count ?? 0} sales · {purchasesData?.count ?? 0} purchases</p>
              </div>
              <Store className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Recent Sales Revenue</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">रु {totalSalesRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">5 most recent orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Recent Purchase Value</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">रु {totalPurchasesValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">5 most recent purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Paid Records</p>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-400 mt-1">रु {totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{paidData?.count ?? 0} total paid records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Received Records</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">रु {totalReceived.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{receivedData?.count ?? 0} total received records</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor details */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-4 w-4" />Vendor Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            ["ID", `#${v.id}`],
            ["Name", v.name],
            ["Phone", v.phone || "—"],
            ["Linked User", v.user ? (v.user_name || `User #${v.user}`) : "—"],
            ["Payable", `रु ${Number(v.payable).toLocaleString()}`],
            ["Receivable", `रु ${Number(v.receivable).toLocaleString()}`],
            ["Created", new Date(v.created_at).toLocaleString()],
            ["Updated", new Date(v.updated_at).toLocaleString()],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-1 border-b last:border-0">
              <span className="text-muted-foreground text-sm">{label}</span>
              {label === "Linked User" && v.user ? (
                <Link to={`/system/users/${v.user}`} className="text-primary underline text-sm">{v.user_name || `User #${v.user}`}</Link>
              ) : (
                <span className="text-sm font-medium">{val}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      {sales.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 shrink-0" />Recent Sales</CardTitle>
            <Link to={`/system/sales?vendor=${v.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All ({salesData?.count})</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "order",
                  label: "Order",
                  render: (s) => <Link to={`/system/sales/${s.id}`} className="text-primary underline">#{s.id}</Link>,
                },
                {
                  id: "user",
                  label: "User",
                  render: (s) => (
                    <Link to={`/system/users/${s.user}`} className="text-primary underline text-xs">{s.user_name || `#${s.user}`}</Link>
                  ),
                },
                {
                  id: "total",
                  label: "Total",
                  render: (s) => <span className="font-medium">रु {Number(s.total).toLocaleString()}</span>,
                },
                {
                  id: "status",
                  label: "Status",
                  render: (s) => <Badge variant="secondary" className="text-xs capitalize">{s.status}</Badge>,
                },
                {
                  id: "date",
                  label: "Date",
                  render: (s) => <span className="text-xs">{new Date(s.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={sales}
              keyFn={(s) => s.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Purchases */}
      {purchases.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0" />Recent Purchases</CardTitle>
            <Link to={`/system/purchases?vendor=${v.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All ({purchasesData?.count})</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "purchase",
                  label: "Purchase",
                  render: (p) => <Link to={`/system/purchases/${p.id}`} className="text-primary underline">#{p.id}</Link>,
                },
                {
                  id: "total",
                  label: "Total",
                  render: (p) => <span className="font-medium">रु {Number(p.total).toLocaleString()}</span>,
                },
                {
                  id: "items",
                  label: "Items",
                  render: (p) => `${p.items?.length ?? 0} items`,
                },
                {
                  id: "date",
                  label: "Date",
                  render: (p) => <span className="text-xs">{new Date(p.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={purchases}
              keyFn={(p) => p.id}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {v.name}. Linked products may be unlinked. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMut.mutate(v.id, {
                  onSuccess: () => {
                    toast({ title: "Vendor deleted" });
                    navigate("/system/vendors");
                  },
                  onError: () => toast({ variant: "destructive", title: "Failed to delete vendor" }),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
