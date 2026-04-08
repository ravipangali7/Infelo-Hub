import { useState, useEffect } from "react";
import { useAdminSiteSettings, useAdminSaveSiteSettings } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Globe, Phone, Mail, Facebook, Instagram, BarChart3 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function SiteSettings() {
  const { data, isLoading } = useAdminSiteSettings();
  const saveSiteSettings = useAdminSaveSiteSettings();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [googleAnalyticsScript, setGoogleAnalyticsScript] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && data.name !== undefined) {
      setName(data.name ?? "");
      setTitle(data.title ?? "");
      setSubtitle(data.subtitle ?? "");
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setEmail(data.email ?? "");
      setFacebook(data.facebook ?? "");
      setInstagram(data.instagram ?? "");
      setTiktok(data.tiktok ?? "");
      setYoutube(data.youtube ?? "");
      setGoogleAnalyticsScript(data.google_analytics_script ?? "");
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("name", name.trim() || "Site");
    fd.append("title", title.trim());
    fd.append("subtitle", subtitle.trim());
    fd.append("phone", phone.trim());
    fd.append("whatsapp", whatsapp.trim());
    fd.append("email", email.trim());
    fd.append("facebook", facebook.trim());
    fd.append("instagram", instagram.trim());
    fd.append("tiktok", tiktok.trim());
    fd.append("youtube", youtube.trim());
    fd.append("google_analytics_script", googleAnalyticsScript);
    if (logoFile) fd.append("logo", logoFile);

    saveSiteSettings.mutate(fd, {
      onSuccess: () => { toast.success("Site settings saved"); setSaving(false); },
      onError: () => { toast.error("Failed to save settings"); setSaving(false); },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div><h1 className="text-2xl font-bold">Site Settings</h1></div>
        <Card><CardContent className="p-6 space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-muted-foreground">Configure site-wide information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <ImageFileField label="Upload Logo" currentUrl={logoFile ? undefined : data?.logo_url} onFileChange={setLogoFile} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Site Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Store" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Tagline / Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your best shopping destination" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short description" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" /> Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="9779XXXXXXXXX" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email"><Mail className="w-4 h-4 inline mr-1" />Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Facebook className="w-5 h-5" /> Social Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram"><Instagram className="w-4 h-4 inline mr-1" />Instagram URL</Label>
              <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok URL</Label>
              <Input id="tiktok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@yourhandle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube URL</Label>
              <Input id="youtube" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Google Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Paste the full snippet from Google Analytics (including <code className="text-xs">&lt;script&gt;</code> tags).
              It loads on the public app and on this admin panel.
            </p>
            <Label htmlFor="ga-script">Analytics script</Label>
            <Textarea
              id="ga-script"
              value={googleAnalyticsScript}
              onChange={(e) => setGoogleAnalyticsScript(e.target.value)}
              placeholder={'e.g. <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>\n<script>...</script>'}
              rows={8}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
