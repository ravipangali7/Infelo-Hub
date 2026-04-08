import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAdminBanner, useAdminUpdateBanner, useAdminDeleteBanner } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BannersEdit() {
  const { id } = useParams<{ id: string }>();
  const bannerId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { data: banner, isLoading } = useAdminBanner(bannerId);
  const updateBanner = useAdminUpdateBanner(bannerId ?? 0);
  const deleteBanner = useAdminDeleteBanner();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (banner) {
      setTitle(banner.title ?? "");
      setLink(banner.link ?? "");
      setOrder(String(banner.order ?? 0));
      setIsActive(banner.is_active ?? true);
    }
  }, [banner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("link", link.trim());
    fd.append("order", order);
    fd.append("is_active", isActive ? "true" : "false");
    if (imageFile) fd.append("image", imageFile);

    updateBanner.mutate(fd, {
      onSuccess: () => {
        toast.success("Banner updated");
        navigate("/system/banners");
      },
      onError: () => {
        toast.error("Failed to update banner");
        setSaving(false);
      },
    });
  };

  const handleDelete = () => {
    if (!bannerId) return;
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    deleteBanner.mutate(bannerId, {
      onSuccess: () => { toast.success("Banner deleted"); navigate("/system/banners"); },
      onError: () => toast.error("Failed to delete banner"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-8 w-40" />
        <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Link to="/system/banners">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Banner</h1>
          <p className="text-muted-foreground">#{bannerId}</p>
        </div>
        <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Banner Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Banner title" required />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageFileField
                label="Replace Image"
                currentUrl={imageFile ? undefined : banner?.image_url}
                onFileChange={setImageFile}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link URL</Label>
              <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com" type="url" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input id="order" value={order} onChange={(e) => setOrder(e.target.value)} type="number" min="0" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/system/banners")}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
