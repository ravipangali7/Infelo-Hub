import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminShippingCharge, useAdminCityList } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function ShippingChargeForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const scId = !isNew && id ? parseInt(id, 10) : null;
  const { data: row, isLoading } = useAdminShippingCharge(scId);
  const { data: cities } = useAdminCityList({ page_size: 200, order_by: "name" });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cityId, setCityId] = useState<string>("");

  useEffect(() => {
    if (row) setCityId(String(row.city));
  }, [row]);

  const createMut = useMutation({
    mutationFn: (body: { city: number; charge: string }) => adminApi.createShippingCharge(body),
    onSuccess: (data: { id: number }) => {
      qc.invalidateQueries({ queryKey: adminKeys.shippingCharges() });
      navigate(`/system/shipping-charges/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: { city?: number; charge?: string } }) => adminApi.updateShippingCharge(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.shippingCharges() });
      if (scId) qc.invalidateQueries({ queryKey: adminKeys.shippingCharge(scId) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const charge = (fd.get("charge") as string)?.trim();
    if (!cityId || !charge) {
      toast({ variant: "destructive", title: "City and charge required" });
      return;
    }
    if (isNew) createMut.mutate({ city: parseInt(cityId, 10), charge });
    else if (scId) updateMut.mutate({ pk: scId, body: { city: parseInt(cityId, 10), charge } });
  };

  if (!isNew && scId && isLoading && !row) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!isNew && scId && !row) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/shipping-charges">Back</Link>
      </div>
    );
  }

  const clist = cities?.results ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add shipping charge" : "Edit shipping charge"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>City</Label>
              <SearchableSelect
                value={cityId}
                onChange={setCityId}
                options={clist.map((c) => ({ value: String(c.id), label: `#${c.id} ${c.name}` }))}
                placeholder="Select city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge">Charge</Label>
              <Input id="charge" name="charge" type="text" required defaultValue={row?.charge} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/shipping-charges" : `/system/shipping-charges/${scId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
            {!isNew && row && (
              <p className="text-xs text-muted-foreground">Created: {row.created_at} | Updated: {row.updated_at}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
