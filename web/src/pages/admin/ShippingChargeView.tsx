import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminShippingCharge, adminKeys } from "@/api/hooks";
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
import { ArrowLeft, Edit, Truck, MapPin, DollarSign, Calendar } from "lucide-react";

export default function ShippingChargeView() {
  const { id } = useParams<{ id: string }>();
  const scId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: row, isLoading, error } = useAdminShippingCharge(scId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!scId || isNaN(scId)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !row) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !row) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/shipping-charges">Back</Link></div>
  );

  const handleDelete = async () => {
    await adminApi.deleteShippingCharge(row.id);
    qc.invalidateQueries({ queryKey: adminKeys.shippingCharges() });
    setDeleteOpen(false);
    navigate("/system/shipping-charges");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/shipping-charges">
            <Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Shipping Charges</Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Shipping Charge #{row.id}</h1>
              <p className="text-muted-foreground">{row.city_name ?? `City #${row.city}`}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/shipping-charges/${row.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Shipping Charge</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">रु {Number(row.charge).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">delivery fee</p>
              </div>
              <DollarSign className="h-10 w-10 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">City</p>
                <p className="text-xl font-bold mt-1">{row.city_name ?? `#${row.city}`}</p>
                {row.city && (
                  <Link to={`/system/cities/${row.city}`} className="text-xs text-primary underline">View city</Link>
                )}
              </div>
              <MapPin className="h-10 w-10 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</p>
                <p className="text-base font-bold mt-1">{new Date(row.updated_at).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleTimeString()}</p>
              </div>
              <Calendar className="h-10 w-10 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" />Charge Details</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {[
              ["ID", `#${row.id}`],
              ["City", row.city_name ?? `City #${row.city}`],
              ["Charge Amount", `रु ${Number(row.charge).toLocaleString()}`],
              ["Created", new Date(row.created_at).toLocaleString()],
              ["Updated", new Date(row.updated_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "City" && row.city ? (
                  <Link to={`/system/cities/${row.city}`} className="text-primary underline text-sm font-medium">{val}</Link>
                ) : label === "Charge Amount" ? (
                  <Badge variant="outline" className="font-mono">{val}</Badge>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />City Reference</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{row.city_name ?? `City #${row.city}`}</p>
                {row.city && (
                  <Link to={`/system/cities/${row.city}`}>
                    <Button variant="outline" size="sm" className="mt-2">View City Dashboard</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shipping charge #{row.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the रु {Number(row.charge).toLocaleString()} charge for {row.city_name}. This cannot be undone.
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
