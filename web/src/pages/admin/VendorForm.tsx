import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminUserList, useAdminVendor } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useEffect, useState } from "react";
import { ImageFileField } from "@/components/ImageFileField";

export default function VendorForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const vid = !isNew && id ? parseInt(id, 10) : null;
  const { data: v, isLoading } = useAdminVendor(vid);
  const { data: users } = useAdminUserList({ page_size: 200 });
  const [userId, setUserId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createVendor>[0]) => adminApi.createVendor(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.vendors() });
      navigate(`/system/vendors/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updateVendor>[1] }) => adminApi.updateVendor(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.vendors() });
      if (vid) qc.invalidateQueries({ queryKey: adminKeys.vendor(vid) });
      toast({ title: "Saved" });
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  useEffect(() => {
    if (!v) return;
    setUserId(v.user != null ? String(v.user) : "");
  }, [v]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    if (!name) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }

    if (logoFile) {
      const form = new FormData();
      form.append("name", name);
      form.append("phone", (fd.get("phone") as string) || "");
      form.append("user", userId || "");
      form.append("logo", logoFile);
      if (isNew) createMut.mutate(form);
      else if (vid) updateMut.mutate({ pk: vid, body: form });
      return;
    }

    const body: Parameters<typeof adminApi.createVendor>[0] = {
      name,
      phone: (fd.get("phone") as string) || "",
    };
    if (userId) body.user = parseInt(userId, 10);
    else body.user = null;
    if (isNew) createMut.mutate(body);
    else if (vid) updateMut.mutate({ pk: vid, body });
  };

  if (!isNew && vid && isLoading && !v) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!isNew && vid && !v) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/vendors">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add vendor" : "Edit vendor"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={v?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={v?.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user">Linked user</Label>
              <SearchableSelect
                value={userId}
                onChange={setUserId}
                options={[
                  { value: "", label: "None" },
                  ...(users?.results ?? []).map((u) => ({ value: String(u.id), label: `#${u.id} ${u.name || u.phone}` })),
                ]}
                placeholder="Select user"
              />
            </div>
            <ImageFileField label="Logo" currentUrl={v?.logo_url} onFileChange={setLogoFile} />
            {!isNew && v && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Payable: {v.payable}</p>
                <p>Receivable: {v.receivable}</p>
                <p>Created: {v.created_at} | Updated: {v.updated_at}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/vendors" : `/system/vendors/${vid}`}>
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
