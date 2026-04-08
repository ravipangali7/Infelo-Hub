import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminAddress, adminKeys } from "@/api/hooks";
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
import { ArrowLeft, Edit, MapPin, Phone, Globe, Map } from "lucide-react";
import { AdminUserViewCard } from "@/components/admin";

export default function AddressAdminView() {
  const { id } = useParams<{ id: string }>();
  const aid = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useAdminAddress(aid);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!aid || isNaN(aid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !a) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (error || !a) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/addresses">Back</Link></div>
  );

  const hasGeo = a.latitude != null && a.longitude != null;

  const handleDelete = async () => {
    await adminApi.deleteAddressAdmin(aid);
    qc.invalidateQueries({ queryKey: adminKeys.addressesAdmin() });
    setDeleteOpen(false);
    navigate("/system/addresses");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/addresses">
            <Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Addresses</Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{a.name || `Address #${a.id}`}</h1>
              <p className="text-muted-foreground">
                {a.city_name ?? (a.city ? `City #${a.city}` : "")}{a.district ? `, ${a.district}` : ""}
                {a.state ? `, ${a.state}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/addresses/${a.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <AdminUserViewCard userId={a.user} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">City / Location</p>
                <p className="text-xl font-bold mt-1">{a.city_name ?? (a.city ? `#${a.city}` : "—")}</p>
                <p className="text-xs text-muted-foreground">{a.district ?? ""}{a.state ? `, ${a.state}` : ""}</p>
              </div>
              <MapPin className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Geo Location</p>
                {hasGeo ? (
                  <>
                    <p className="text-sm font-bold mt-1">{Number(a.latitude).toFixed(4)}°N</p>
                    <p className="text-sm font-bold">{Number(a.longitude).toFixed(4)}°E</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Not available</p>
                )}
              </div>
              <Globe className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Address Details</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {[
              ["ID", `#${a.id}`],
              ["Name / Label", a.name || "—"],
              ["Phone", a.phone || "—"],
              ["Country", a.country || "—"],
              ["State", a.state || "—"],
              ["District", a.district || "—"],
              ["City", a.city_name ?? (a.city ? `City #${a.city}` : "—")],
              ["Full Address", a.address || "—"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm flex-shrink-0 w-32">{label}</span>
                <span className="text-sm font-medium text-right">{val as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" />Contact & Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-0">
            {[
              ["Phone", a.phone || "—"],
              ["Latitude", a.latitude != null ? String(a.latitude) : "—"],
              ["Longitude", a.longitude != null ? String(a.longitude) : "—"],
              ["Created", new Date(a.created_at).toLocaleString()],
              ["Updated", new Date(a.updated_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b last:border-0">
                <span className="text-muted-foreground text-sm flex-shrink-0 w-32">{label}</span>
                {label === "Phone" && a.phone ? (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{val as string}</span>
                  </div>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Map placeholder if geo available */}
      {hasGeo && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Map className="h-4 w-4" />Map Location</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-6 flex flex-col items-center justify-center gap-2">
              <Globe className="h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Lat: {a.latitude}, Long: {a.longitude}</p>
              <a
                href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Map className="h-4 w-4 mr-2" />Open in Google Maps
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full address text */}
      {a.address && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Full Address</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">{a.address}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.country && <Badge variant="outline">{a.country}</Badge>}
              {a.state && <Badge variant="outline">{a.state}</Badge>}
              {a.district && <Badge variant="outline">{a.district}</Badge>}
              {a.city_name && <Badge variant="secondary">{a.city_name}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete address #{a.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this address record. This cannot be undone.
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
