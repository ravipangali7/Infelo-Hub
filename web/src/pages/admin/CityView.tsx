import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminCity, useAdminShippingChargeList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDataTable } from "@/components/admin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, MapPin, Truck, DollarSign, Calendar } from "lucide-react";

export default function CityView() {
  const { id } = useParams<{ id: string }>();
  const cityId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: city, isLoading, error } = useAdminCity(cityId);
  const { data: scData } = useAdminShippingChargeList(cityId ? { city: String(cityId), page_size: 50 } : undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!cityId || isNaN(cityId)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !city) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !city) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/cities">Back</Link></div>
  );

  const charges = scData?.results ?? [];
  const chargeCount = scData?.count ?? 0;
  const minCharge = charges.length ? Math.min(...charges.map(c => Number(c.charge))) : null;
  const maxCharge = charges.length ? Math.max(...charges.map(c => Number(c.charge))) : null;
  const avgCharge = charges.length ? charges.reduce((s, c) => s + Number(c.charge), 0) / charges.length : null;

  const handleDelete = async () => {
    await adminApi.deleteCity(city.id);
    qc.invalidateQueries({ queryKey: adminKeys.cities() });
    setDeleteOpen(false);
    navigate("/system/cities");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/cities">
            <Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Cities</Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{city.name}</h1>
              <p className="text-muted-foreground">City #{city.id} · {chargeCount} shipping charge{chargeCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/cities/${city.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Shipping Charges</p>
                <p className="text-2xl font-bold mt-1">{chargeCount}</p>
                <p className="text-xs text-muted-foreground">rate entries</p>
              </div>
              <Truck className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Min Charge</p>
                <p className="text-2xl font-bold mt-1">{minCharge !== null ? `रु ${minCharge.toLocaleString()}` : "—"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Max Charge</p>
                <p className="text-2xl font-bold mt-1">{maxCharge !== null ? `रु ${maxCharge.toLocaleString()}` : "—"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-200 dark:text-amber-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Charge</p>
                <p className="text-2xl font-bold mt-1">{avgCharge !== null ? `रु ${avgCharge.toFixed(0)}` : "—"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />City Details</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {[
              ["ID", `#${city.id}`],
              ["Name", city.name],
              ["Shipping Charges", String(chargeCount)],
              ["Created", new Date(city.created_at).toLocaleString()],
              ["Updated", new Date(city.updated_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-xs text-muted-foreground">{new Date(city.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-xs text-muted-foreground">{new Date(city.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Charges Table */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0" />Shipping Charges ({chargeCount})</CardTitle>
          <Link to="/system/shipping-charges/new" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">Add Charge</Button>
          </Link>
        </CardHeader>
        {charges.length > 0 ? (
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "ID",
                  render: (c) => (
                    <Link to={`/system/shipping-charges/${c.id}`} className="text-primary underline font-medium">#{c.id}</Link>
                  ),
                },
                {
                  id: "charge",
                  label: "Charge",
                  render: (c) => (
                    <Badge variant="outline" className="font-mono md:ml-auto md:block w-fit">रु {Number(c.charge).toLocaleString()}</Badge>
                  ),
                },
                {
                  id: "created",
                  label: "Created",
                  render: (c) => (
                    <span className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</span>
                  ),
                },
                {
                  id: "actions",
                  label: "Actions",
                  render: (c) => (
                    <div className="flex flex-wrap gap-1">
                      <Link to={`/system/shipping-charges/${c.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link>
                      <Link to={`/system/shipping-charges/${c.id}/edit`}><Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button></Link>
                    </div>
                  ),
                },
              ]}
              data={charges}
              keyFn={(c) => c.id}
            />
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-muted-foreground text-sm text-center py-6">No shipping charges configured for this city.</p>
            <div className="text-center">
              <Link to="/system/shipping-charges/new"><Button size="sm">Add first charge</Button></Link>
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete city "{city.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the city. Associated shipping charges may also be affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete City
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
