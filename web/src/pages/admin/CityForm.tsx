import { useParams, Link } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminCity } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";

export default function CityForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = useAdminFormNewMode();
  const cityId = !isNew && id ? parseInt(id, 10) : null;
  const { data: city, isLoading } = useAdminCity(cityId);
  const qc = useQueryClient();
  const { toast } = useToast();
  const createMutation = useMutation({
    mutationFn: (data: { name: string; district?: string; province?: string }) => adminApi.createCity(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.cities() });
      toast({ title: "City created." });
      window.location.href = `/system/cities/${data.id}`;
    },
    onError: (e: { detail?: string }) => { toast({ variant: "destructive", title: "Error", description: e.detail }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id: pk,
      name,
      district,
      province,
    }: {
      id: number;
      name: string;
      district?: string;
      province?: string;
    }) => adminApi.updateCity(pk, { name, district, province }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.city(cityId!) });
      toast({ title: "Saved." });
    },
    onError: (e: { detail?: string }) => { toast({ variant: "destructive", title: "Error", description: e.detail }); },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const district = ((fd.get("district") as string) || "").trim();
    const province = ((fd.get("province") as string) || "").trim();
    if (!name) { toast({ variant: "destructive", title: "Name required." }); return; }
    if (isNew) createMutation.mutate({ name, district, province });
    else if (cityId) updateMutation.mutate({ id: cityId, name, district, province });
  };

  if (!isNew && cityId && isLoading && !city) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!isNew && cityId && !city) {
    return <div><p className="text-destructive">Not found.</p><Link to="/system/cities">Back</Link></div>;
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{isNew ? "Add City" : "Edit City"}</h1></div>
      <Card>
        <CardHeader><CardTitle>{isNew ? "New city" : "Edit"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={city?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" name="district" defaultValue={city?.district} placeholder="e.g. Kathmandu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input id="province" name="province" defaultValue={city?.province} placeholder="e.g. Bagmati" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{isNew ? "Create" : "Save"}</Button>
              <Link to={isNew ? "/system/cities" : `/system/cities/${cityId}`}><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
