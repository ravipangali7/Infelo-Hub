import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminCampaign, useAdminProductList } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignStatus } from "@/api/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageFileField } from "@/components/ImageFileField";

const STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: "coming", label: "Coming" },
  { value: "running", label: "Running" },
  { value: "finished", label: "Finished" },
  { value: "deactivate", label: "Deactivate" },
];

export default function CampaignForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const cid = !isNew && id ? parseInt(id, 10) : null;
  const { data: c, isLoading } = useAdminCampaign(cid);
  const { data: products } = useAdminProductList({ page_size: 100 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<CampaignStatus>("coming");
  const [productId, setProductId] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ogShareImageFile, setOgShareImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (c) {
      setStatus(c.status);
      setProductId(c.product != null ? String(c.product) : "");
    }
  }, [c]);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createCampaign>[0]) => adminApi.createCampaign(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.campaigns() });
      navigate(`/system/campaigns/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updateCampaign>[1] }) => adminApi.updateCampaign(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.campaigns() });
      if (cid) qc.invalidateQueries({ queryKey: adminKeys.campaign(cid) });
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
    const ogTitle = ((fd.get("og_share_title") as string) || "").trim();
    const ogDesc = ((fd.get("og_share_description") as string) || "").trim();

    if (imageFile || ogShareImageFile) {
      const form = new FormData();
      form.append("name", name);
      form.append("status", status);
      form.append("description", (fd.get("description") as string) || "");
      form.append("og_share_title", ogTitle);
      form.append("og_share_description", ogDesc);
      form.append("video_link", (fd.get("video_link") as string) || "");
      form.append("commission_type", (fd.get("commission_type") as string) || "flat");
      form.append("commission", (fd.get("commission") as string) || "0");
      form.append("product", productId || "");
      if (imageFile) form.append("image", imageFile);
      if (ogShareImageFile) form.append("og_share_image", ogShareImageFile);
      if (isNew) createMut.mutate(form);
      else if (cid) updateMut.mutate({ pk: cid, body: form });
      return;
    }

    const body: Parameters<typeof adminApi.createCampaign>[0] = {
      name,
      status,
      description: (fd.get("description") as string) || "",
      og_share_title: ogTitle,
      og_share_description: ogDesc,
      video_link: (fd.get("video_link") as string) || "",
      commission_type: (fd.get("commission_type") as string) || "flat",
      commission: (fd.get("commission") as string) || "0",
    };
    if (productId) body.product = parseInt(productId, 10);
    else body.product = null;
    if (isNew) createMut.mutate(body);
    else if (cid) updateMut.mutate({ pk: cid, body });
  };

  if (!isNew && cid && isLoading && !c) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!isNew && cid && !c) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/campaigns">Back</Link>
      </div>
    );
  }

  const plist = products?.results ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add campaign" : "Edit campaign"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={c?.name} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked product</Label>
              <SearchableSelect
                value={productId}
                onChange={setProductId}
                options={[
                  { value: "", label: "None" },
                  ...plist.map((p) => ({
                    value: String(p.id),
                    label: `#${p.id} ${p.name}`,
                    image: p.image_url || p.image || null,
                  })),
                ]}
                placeholder="Select product"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} defaultValue={c?.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_link">Video link</Label>
              <Input id="video_link" name="video_link" defaultValue={c?.video_link} />
            </div>
            <ImageFileField label="Image" currentUrl={c?.image_url} onFileChange={setImageFile} />
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Social share (Open Graph)</p>
              <p className="text-xs text-muted-foreground">
                Optional. When empty, the campaign name, description, and main image are used. Share links that need a crawler-friendly preview should use the “social preview” URL from the public campaign page.
              </p>
              <div className="space-y-2">
                <Label htmlFor="og_share_title">Share title</Label>
                <Input id="og_share_title" name="og_share_title" defaultValue={c?.og_share_title} placeholder="Override title in link previews" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og_share_description">Share description</Label>
                <Textarea id="og_share_description" name="og_share_description" rows={2} defaultValue={c?.og_share_description} />
              </div>
              <ImageFileField
                label="Share image (optional)"
                currentUrl={ogShareImageFile ? undefined : c?.og_share_image_url}
                onFileChange={setOgShareImageFile}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commission_type">Commission type</Label>
                <Input id="commission_type" name="commission_type" placeholder="flat / percentage" defaultValue={c?.commission_type ?? "flat"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission</Label>
                <Input id="commission" name="commission" defaultValue={c?.commission ?? "0"} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/campaigns" : `/system/campaigns/${cid}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
            {!isNew && c && (
              <p className="text-xs text-muted-foreground">Created: {c.created_at} | Updated: {c.updated_at}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
