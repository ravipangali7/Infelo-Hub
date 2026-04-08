import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminCreateCmsPage } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function toSlug(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function CmsPagesNew() {
  const navigate = useNavigate();
  const createCmsPage = useAdminCreateCmsPage();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(toSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!content.trim()) { toast.error("Content is required"); return; }

    setSaving(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("slug", slug.trim());
    fd.append("title", title.trim());
    fd.append("content", content.trim());
    fd.append("is_active", isActive ? "true" : "false");
    if (imageFile) fd.append("image", imageFile);

    createCmsPage.mutate(fd, {
      onSuccess: () => {
        toast.success("Page created");
        navigate("/system/cms-pages");
      },
      onError: () => {
        toast.error("Failed to create page");
        setSaving(false);
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/system/cms-pages">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New CMS Page</h1>
          <p className="text-muted-foreground">Add a new content page</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Page Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="About Us" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} placeholder="about-us" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About Infelo Hub" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Page content..." rows={10} required />
            </div>
            <div className="space-y-2">
              <Label>Featured Image</Label>
              <ImageFileField label="Upload Image" onFileChange={setImageFile} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Active (publicly visible)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/system/cms-pages")}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Page"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
