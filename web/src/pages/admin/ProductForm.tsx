import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminFormNewMode } from "@/hooks/useAdminFormNewMode";
import { useAdminProduct, useAdminCategoryList, useAdminVendorList } from "@/api/hooks";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageFileField } from "@/components/ImageFileField";

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = useAdminFormNewMode();
  const productId = !isNew && id ? parseInt(id, 10) : null;
  const { data: p, isLoading } = useAdminProduct(productId);
  const { data: cats } = useAdminCategoryList({ page_size: 100 });
  const { data: vendors } = useAdminVendorList({ page_size: 100 });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isAff, setIsAff] = useState(false);
  const [isPurchaseReward, setIsPurchaseReward] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [discountType, setDiscountType] = useState("flat");
  const [affRewardType, setAffRewardType] = useState("flat");
  const [purchaseRewardType, setPurchaseRewardType] = useState("flat");

  useEffect(() => {
    if (p) {
      setIsActive(p.is_active);
      setIsFeatured(p.is_featured ?? false);
      setIsAff(p.is_affiliation);
      setIsPurchaseReward(p.is_purchase_reward);
      setCategoryId(p.category != null ? String(p.category) : "");
      setVendorId(p.vendor != null ? String(p.vendor) : "");
      setDiscountType(p.discount_type ?? "flat");
      setAffRewardType(p.affiliation_reward_type ?? "flat");
      setPurchaseRewardType(p.purchase_reward_type ?? "flat");
    }
  }, [p]);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof adminApi.createProduct>[0]) => adminApi.createProduct(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      toast({ title: "Product created" });
      navigate(`/system/products/${data.id}`);
    },
    onError: (e: { detail?: string }) => toast({ variant: "destructive", title: "Error", description: e.detail }),
  });

  const updateMut = useMutation({
    mutationFn: ({ pk, body }: { pk: number; body: Parameters<typeof adminApi.updateProduct>[1] }) => adminApi.updateProduct(pk, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      if (productId) qc.invalidateQueries({ queryKey: adminKeys.product(productId) });
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
      form.append("is_active", isActive ? "true" : "false");
      form.append("is_featured", isFeatured ? "true" : "false");
      form.append("is_affiliation", isAff ? "true" : "false");
      form.append("is_purchase_reward", isPurchaseReward ? "true" : "false");
      form.append("affiliation_reward_type", affRewardType);
      form.append("affiliation_reward", (fd.get("affiliation_reward") as string) || "0");
      form.append("purchase_reward_type", purchaseRewardType);
      form.append("purchase_reward", (fd.get("purchase_reward") as string) || "0");
      form.append("short_description", (fd.get("short_description") as string) || "");
      form.append("long_description", (fd.get("long_description") as string) || "");
      form.append("stock", String(parseInt((fd.get("stock") as string) || "0", 10) || 0));
      form.append("discount_type", discountType);
      form.append("discount", (fd.get("discount") as string) || "0");
      form.append("purchasing_price", (fd.get("purchasing_price") as string) || "0");
      form.append("selling_price", (fd.get("selling_price") as string) || "0");
      form.append("category", categoryId || "");
      form.append("vendor", vendorId || "");
      form.append("image", imageFile);
      if (isNew) createMut.mutate(form);
      else if (productId) updateMut.mutate({ pk: productId, body: form });
      return;
    }

    const body: Parameters<typeof adminApi.createProduct>[0] = {
      name,
      is_active: isActive,
      is_featured: isFeatured,
      is_affiliation: isAff,
      is_purchase_reward: isPurchaseReward,
      affiliation_reward_type: affRewardType,
      affiliation_reward: (fd.get("affiliation_reward") as string) || "0",
      purchase_reward_type: purchaseRewardType,
      purchase_reward: (fd.get("purchase_reward") as string) || "0",
      short_description: (fd.get("short_description") as string) || "",
      long_description: (fd.get("long_description") as string) || "",
      stock: parseInt((fd.get("stock") as string) || "0", 10) || 0,
      discount_type: discountType,
      discount: (fd.get("discount") as string) || "0",
      purchasing_price: (fd.get("purchasing_price") as string) || "0",
      selling_price: (fd.get("selling_price") as string) || "0",
    };
    if (categoryId) body.category = parseInt(categoryId, 10);
    else body.category = null;
    if (vendorId) body.vendor = parseInt(vendorId, 10);
    else body.vendor = null;
    if (isNew) createMut.mutate(body);
    else if (productId) updateMut.mutate({ pk: productId, body });
  };

  if (!isNew && productId && isLoading && !p) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!isNew && productId && !p) {
    return (
      <div>
        <p className="text-destructive">Not found.</p>
        <Link to="/system/products">Back</Link>
      </div>
    );
  }

  const catList = cats?.results ?? [];
  const venList = vendors?.results ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? "Add product" : "Edit product"}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 max-w-4xl">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={p?.name} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <SearchableSelect
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { value: "", label: "None" },
                  ...catList.map((c) => ({
                    value: String(c.id),
                    label: `#${c.id} ${c.name}`,
                    image: c.image_url || c.image || null,
                  })),
                ]}
                placeholder="Select category"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <SearchableSelect
                value={vendorId}
                onChange={setVendorId}
                options={[
                  { value: "", label: "None" },
                  ...venList.map((v) => ({
                    value: String(v.id),
                    label: `#${v.id} ${v.name}`,
                    image: v.logo_url || v.logo || null,
                  })),
                ]}
                placeholder="Select vendor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" name="stock" type="number" min={0} defaultValue={p?.stock ?? 0} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} id="is_active" />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="is_featured" />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isAff} onCheckedChange={setIsAff} id="is_aff" />
                <Label htmlFor="is_aff">Affiliation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isPurchaseReward} onCheckedChange={setIsPurchaseReward} id="is_pr" />
                <Label htmlFor="is_pr">Purchase reward</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 max-w-4xl">
            <div className="space-y-2">
              <Label htmlFor="purchasing_price">Purchasing price</Label>
              <Input id="purchasing_price" name="purchasing_price" defaultValue={p?.purchasing_price ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling price</Label>
              <Input id="selling_price" name="selling_price" defaultValue={p?.selling_price ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label>Discount type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <Input id="discount" name="discount" type="number" min={0} defaultValue={p?.discount ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label>Affiliation reward type</Label>
              <Select value={affRewardType} onValueChange={setAffRewardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliation_reward">Affiliation reward</Label>
              <Input id="affiliation_reward" name="affiliation_reward" type="number" min={0} defaultValue={p?.affiliation_reward ?? "0"} />
            </div>
            <div className="space-y-2">
              <Label>Purchase reward type</Label>
              <Select value={purchaseRewardType} onValueChange={setPurchaseRewardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_reward">Purchase reward</Label>
              <Input id="purchase_reward" name="purchase_reward" type="number" min={0} defaultValue={p?.purchase_reward ?? "0"} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-4xl">
            <div className="space-y-2">
              <Label htmlFor="short_description">Short</Label>
              <Textarea id="short_description" name="short_description" rows={2} defaultValue={p?.short_description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="long_description">Long</Label>
              <Textarea id="long_description" name="long_description" rows={4} defaultValue={p?.long_description} />
            </div>
            <ImageFileField label="Image" currentUrl={p?.image_url} onFileChange={setImageFile} />
            {!isNew && p && (
              <p className="text-xs text-muted-foreground">Created: {p.created_at} | Updated: {p.updated_at}</p>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
            {isNew ? "Create" : "Save"}
          </Button>
          <Link to={isNew ? "/system/products" : `/system/products/${productId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
