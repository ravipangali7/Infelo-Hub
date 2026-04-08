import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminAddress, useAdminCityList, useAdminUserList } from "@/api/hooks";
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

export default function AddressAdminForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const addrId = !isNew && id ? parseInt(id, 10) : null;
  const { data: a, isLoading } = useAdminAddress(addrId);
  const { data: cities } = useAdminCityList({ page_size: 200, order_by: "name" });
  const { data: users } = useAdminUserList({ page_size: 200 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cityId, setCityId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (a?.city != null) setCityId(String(a.city));
    else if (a) setCityId("");
    if (a?.user != null) setUserId(String(a.user));
    else if (a) setUserId("");
  }, [a]);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createAddressAdmin>[0]) => adminApi.createAddressAdmin(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.addressesAdmin() });
      navigate(`/system/addresses/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updateAddressAdmin>[1] }) => adminApi.updateAddressAdmin(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.addressesAdmin() });
      if (addrId) qc.invalidateQueries({ queryKey: adminKeys.addressAdmin(addrId) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const user = parseInt(userId || "0", 10);
    if (!user) {
      toast({ variant: "destructive", title: "User ID required" });
      return;
    }
    const body: Parameters<typeof adminApi.createAddressAdmin>[0] = {
      user,
      name: (fd.get("name") as string) || "",
      phone: (fd.get("phone") as string) || "",
      country: (fd.get("country") as string) || "",
      state: (fd.get("state") as string) || "",
      district: (fd.get("district") as string) || "",
      address: (fd.get("address") as string) || "",
      latitude: (fd.get("latitude") as string) || null,
      longitude: (fd.get("longitude") as string) || null,
    };
    if (cityId) body.city = parseInt(cityId, 10);
    else body.city = null;
    if (isNew) createMut.mutate(body);
    else if (addrId) updateMut.mutate({ pk: addrId, body });
  };

  if (!isNew && addrId && isLoading && !a) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!isNew && addrId && !a) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/addresses">Back</Link>
      </div>
    );
  }

  const clist = cities?.results ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add address" : "Edit address"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 max-w-3xl">
            <div className="space-y-2">
              <Label htmlFor="user">User *</Label>
              <SearchableSelect
                value={userId}
                onChange={setUserId}
                options={(users?.results ?? []).map((u) => ({
                  value: String(u.id),
                  label: `#${u.id} ${u.name || u.phone}`,
                }))}
                placeholder="Select user"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <SearchableSelect
                value={cityId}
                onChange={setCityId}
                options={[
                  { value: "", label: "None" },
                  ...clist.map((c) => ({ value: String(c.id), label: `#${c.id} ${c.name}` })),
                ]}
                placeholder="Select city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Label / name</Label>
              <Input id="name" name="name" defaultValue={a?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={a?.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={a?.country} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={a?.state} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" defaultValue={a?.district} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Street address</Label>
              <Input id="address" name="address" defaultValue={a?.address} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" name="latitude" defaultValue={a?.latitude ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" name="longitude" defaultValue={a?.longitude ?? ""} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/addresses" : `/system/addresses/${addrId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
            {!isNew && a && (
              <p className="text-xs text-muted-foreground md:col-span-2">Created: {a.created_at} | Updated: {a.updated_at}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
