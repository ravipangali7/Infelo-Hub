import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminCreateBanner } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function BannersNew() {
  const navigate = useNavigate();
  const createBanner = useAdminCreateBanner();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!imageFile) { toast.error("Image is required"); return; }

    setSaving(true);
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("link", link.trim());
    fd.append("order", order);
    fd.append("is_active", isActive ? "true" : "false");
    fd.append("image", imageFile);

    createBanner.mutate(fd, {
      onSuccess: () => {
        toast.success("Banner created");
        navigate("/system/banners");
      },
      onError: () => {
        toast.error("Failed to create banner");
        setSaving(false);
      },
    });
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <Link to="/system/banners">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Banner</h1>
          <p className="text-muted-foreground">Add a new shop banner</p>
        </div>
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
              <Label>Image *</Label>
              <ImageFileField
                label="Banner Image"
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
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Banner"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
