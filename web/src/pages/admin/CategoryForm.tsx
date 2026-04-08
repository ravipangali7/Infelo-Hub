import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminCategory, useAdminCategoryList } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageFileField } from "@/components/ImageFileField";

export default function CategoryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const catId = !isNew && id ? parseInt(id, 10) : null;
  const { data: cat, isLoading } = useAdminCategory(catId);
  const { data: categories } = useAdminCategoryList({ page_size: 200, order_by: "name" });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(true);
  const [parentId, setParentId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (cat) {
      setIsActive(cat.is_active);
      setParentId(cat.parent != null ? String(cat.parent) : "");
    }
  }, [cat]);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createCategory>[0]) => adminApi.createCategory(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.categories() });
      toast({ title: "Category created" });
      navigate(`/system/categories/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updateCategory>[1] }) => adminApi.updateCategory(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.categories() });
      if (catId) qc.invalidateQueries({ queryKey: adminKeys.category(catId) });
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
    if (imageFile) {
      const form = new FormData();
      form.append("name", name);
      form.append("description", (fd.get("description") as string) || "");
      form.append("is_active", isActive ? "true" : "false");
      form.append("parent", parentId || "");
      form.append("image", imageFile);
      if (isNew) createMut.mutate(form);
      else if (catId) updateMut.mutate({ pk: catId, body: form });
      return;
    }
    const body: Record<string, unknown> = {
      name,
      description: (fd.get("description") as string) || "",
      is_active: isActive,
    };
    if (parentId) body.parent = parseInt(parentId, 10);
    else body.parent = null;
    if (isNew) createMut.mutate(body);
    else if (catId) updateMut.mutate({ pk: catId, body });
  };

  if (!isNew && catId && isLoading && !cat) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!isNew && catId && !cat) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/categories">Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add category" : "Edit category"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={cat?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} defaultValue={cat?.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <SearchableSelect
                value={parentId}
                onChange={setParentId}
                options={[
                  { value: "", label: "None" },
                  ...(categories?.results ?? [])
                    .filter((row) => row.id !== catId)
                    .map((row) => ({
                      value: String(row.id),
                      label: `#${row.id} ${row.name}`,
                      image: row.image_url || row.image || null,
                    })),
                ]}
                placeholder="Select parent category"
              />
            </div>
            <ImageFileField label="Image" currentUrl={cat?.image_url} onFileChange={setImageFile} />
            <div className="flex items-center gap-2">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Active</Label>
            </div>
            {!isNew && cat && (
              <p className="text-xs text-muted-foreground">Created: {cat.created_at} | Updated: {cat.updated_at}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Link to={isNew ? "/system/categories" : `/system/categories/${catId}`}>
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
