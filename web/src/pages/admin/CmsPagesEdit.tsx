import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAdminCmsPage, useAdminUpdateCmsPage, useAdminDeleteCmsPage } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

function toSlug(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function CmsPagesEdit() {
  const { id } = useParams<{ id: string }>();
  const pageId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { data: page, isLoading } = useAdminCmsPage(pageId);
  const updateCmsPage = useAdminUpdateCmsPage(pageId ?? 0);
  const deleteCmsPage = useAdminDeleteCmsPage();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (page) {
      setName(page.name ?? "");
      setSlug(page.slug ?? "");
      setTitle(page.title ?? "");
      setContent(page.content ?? "");
      setIsActive(page.is_active ?? true);
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("slug", slug.trim());
    fd.append("title", title.trim());
    fd.append("content", content.trim());
    fd.append("is_active", isActive ? "true" : "false");
    if (imageFile) fd.append("image", imageFile);

    updateCmsPage.mutate(fd, {
      onSuccess: () => {
        toast.success("Page updated");
        navigate("/system/cms-pages");
      },
      onError: () => {
        toast.error("Failed to update page");
        setSaving(false);
      },
    });
  };

  const handleDelete = () => {
    if (!pageId) return;
    if (!confirm("Delete this page? This cannot be undone.")) return;
    deleteCmsPage.mutate(pageId, {
      onSuccess: () => { toast.success("Page deleted"); navigate("/system/cms-pages"); },
      onError: () => toast.error("Failed to delete page"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Card><CardContent className="p-6 space-y-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/system/cms-pages">
          <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Page</h1>
          <p className="text-muted-foreground">{page?.name} — /{page?.slug}</p>
        </div>
        <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Page Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(toSlug(e.target.value))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required />
            </div>
            <div className="space-y-2">
              <Label>Featured Image</Label>
              <ImageFileField label="Replace Image" currentUrl={imageFile ? undefined : page?.image_url} onFileChange={setImageFile} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Active (publicly visible)</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/system/cms-pages")}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
