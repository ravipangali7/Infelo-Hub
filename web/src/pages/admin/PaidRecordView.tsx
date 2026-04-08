import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminPaidRecord, adminKeys } from "@/api/hooks";
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
import { useState } from "react";
import { ArrowLeft, Edit, DollarSign, Store, ShoppingCart, FileText } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";

export default function PaidRecordView() {
  const { id } = useParams<{ id: string }>();
  const rid = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: r, isLoading, error } = useAdminPaidRecord(rid);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!rid || isNaN(rid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !r) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !r) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/paid-records">Back</Link></div>
  );

  const handleDelete = async () => {
    await adminApi.deletePaidRecord(rid);
    qc.invalidateQueries({ queryKey: adminKeys.paidRecords() });
    setDeleteOpen(false);
    navigate("/system/paid-records");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/paid-records">
            <Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Paid Records</Button>
          </Link>
          <h1 className="text-3xl font-bold">{r.name}</h1>
          <p className="text-muted-foreground">
            Paid Record #{r.id} · {r.payment_method_display ?? r.payment_method}
            {r.vendor_name ? ` · ${r.vendor_name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {r.vendor && <Link to={`/system/vendors/${r.vendor}`}><Button variant="secondary"><Store className="h-4 w-4 mr-1" />Vendor</Button></Link>}
          <Link to={`/system/paid-records/${r.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount Paid</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  रु {Number(r.amount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{r.payment_method_display ?? r.payment_method}</p>
              </div>
              <DollarSign className="h-10 w-10 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor</p>
                <p className="text-xl font-bold mt-1">{r.vendor_name ?? "—"}</p>
                {r.vendor && <Link to={`/system/vendors/${r.vendor}`} className="text-xs text-primary underline">View vendor</Link>}
              </div>
              <Store className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Linked Purchase</p>
                <p className="text-xl font-bold mt-1">{r.purchase ? `#${r.purchase}` : "—"}</p>
                {r.purchase && <Link to={`/system/purchases/${r.purchase}`} className="text-xs text-primary underline">View purchase</Link>}
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {r.user ? <AdminUserViewCard userId={r.user} /> : null}

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {[
              ["ID", `#${r.id}`],
              ["Name", r.name],
              ["Amount", `रु ${Number(r.amount).toLocaleString()}`],
              ["Payment Method", r.payment_method_display ?? r.payment_method],
              ["Vendor", r.vendor_name ?? "—"],
              ["User", r.user ? `#${r.user}` : "—"],
              ["Linked Purchase", r.purchase ? `Purchase #${r.purchase}` : "—"],
              ["Created", new Date(r.created_at).toLocaleString()],
              ["Updated", new Date(r.updated_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm flex-shrink-0 w-36">{label}</span>
                {label === "Amount" ? (
                  <Badge variant="outline" className="font-mono">{val as string}</Badge>
                ) : label === "Vendor" && r.vendor ? (
                  <Link to={`/system/vendors/${r.vendor}`} className="text-primary underline text-sm font-medium">{val as string}</Link>
                ) : label === "Linked Purchase" && r.purchase ? (
                  <Link to={`/system/purchases/${r.purchase}`} className="text-primary underline text-sm font-medium">{val as string}</Link>
                ) : (
                  <span className="text-sm font-medium text-right">{val as string}</span>
                )}
              </div>
            ))}
            {r.purchase_total && (
              <div className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm flex-shrink-0 w-36">Purchase Total</span>
                <span className="text-sm font-medium">रु {Number(r.purchase_total).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {r.remarks && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Remarks</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{r.remarks}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete paid record "{r.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this paid record of रु {Number(r.amount).toLocaleString()}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
