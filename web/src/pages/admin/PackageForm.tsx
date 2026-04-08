import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminPackage } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";

const FIELDS = [
  "amount",
  "discount",
  "direct_referral",
  "level_one",
  "level_two",
  "level_three",
  "level_four",
  "level_five",
  "level_six",
  "level_seven",
] as const;

export default function PackageForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const pkgId = !isNew && id ? parseInt(id, 10) : null;
  const { data: pkg, isLoading } = useAdminPackage(pkgId);
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createPackage>[0]) => adminApi.createPackage(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.packages() });
      navigate(`/system/packages/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updatePackage>[1] }) => adminApi.updatePackage(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.packages() });
      if (pkgId) qc.invalidateQueries({ queryKey: adminKeys.package(pkgId) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!name) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    const body: Record<string, string> = { name };
    for (const f of FIELDS) {
      body[f] = (fd.get(f) as string) || "0";
    }
    if (isNew) createMut.mutate(body as Parameters<typeof adminApi.createPackage>[0]);
    else if (pkgId) updateMut.mutate({ pk: pkgId, body: body as Parameters<typeof adminApi.updatePackage>[1] });
  };

  if (!isNew && pkgId && isLoading && !pkg) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!isNew && pkgId && !pkg) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/packages">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add package" : "Edit package"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Compensation &amp; pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 max-w-3xl">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={pkg?.name} />
            </div>
            {FIELDS.map((f) => (
              <div key={f} className="space-y-2">
                <Label htmlFor={f}>{f.replace(/_/g, " ")}</Label>
                <Input id={f} name={f} defaultValue={pkg?.[f] ?? "0"} />
              </div>
            ))}
            {!isNew && pkg && (
              <div className="space-y-2 md:col-span-2">
                <Label>Linked Products (read-only)</Label>
                <div className="rounded-md border p-2 text-sm">
                  {pkg.products?.length
                    ? pkg.products.map((row) => `#${row.product} ${row.product_name} x${row.quantity}`).join(", ")
                    : "No linked products"}
                </div>
              </div>
            )}
            {!isNew && pkg && (
              <p className="text-xs text-muted-foreground md:col-span-2">Created: {pkg.created_at} | Updated: {pkg.updated_at}</p>
            )}
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/packages" : `/system/packages/${pkgId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
