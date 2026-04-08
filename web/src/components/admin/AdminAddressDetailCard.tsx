import { Link } from "react-router-dom";
import type { Address } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function AdminAddressDetailCard({ address }: { address: Address }) {
  const hasGeo =
    address.latitude != null &&
    address.longitude != null &&
    Number.isFinite(Number(address.latitude)) &&
    Number.isFinite(Number(address.longitude));
  const lat = hasGeo ? Number(address.latitude) : null;
  const lng = hasGeo ? Number(address.longitude) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Address
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/system/addresses/${address.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Open
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {address.name ? (
          <p className="font-semibold text-base">{address.name}</p>
        ) : null}
        <dl className="space-y-2">
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">Phone</dt>
            <dd className="text-right font-medium">{address.phone || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">Street</dt>
            <dd className="text-right">{address.address || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">City</dt>
            <dd className="text-right">{address.city_name ?? (address.city ? `#${address.city}` : "—")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">District</dt>
            <dd className="text-right">{address.district || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">State / Province</dt>
            <dd className="text-right">{address.state || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-muted-foreground shrink-0">Country</dt>
            <dd className="text-right">{address.country || "—"}</dd>
          </div>
          {hasGeo && lat != null && lng != null ? (
            <div className="flex justify-between gap-4 items-center py-1">
              <dt className="text-muted-foreground shrink-0">Coordinates</dt>
              <dd className="text-right">
                <span className="font-mono text-xs">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
                <a
                  href={mapsUrl(lat, lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary underline text-xs"
                >
                  Map
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
