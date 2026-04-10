import { useState, useEffect } from "react";
import { useAdminSiteSettings, useAdminSaveSiteSettings } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageFileField } from "@/components/ImageFileField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Globe, Phone, Mail, Facebook, Instagram, BarChart3, Search } from "lucide-react";
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
  const [seoHomeOgFile, setSeoHomeOgFile] = useState<File | null>(null);
  const [seoShopOgFile, setSeoShopOgFile] = useState<File | null>(null);
  const [seoCampaignsOgFile, setSeoCampaignsOgFile] = useState<File | null>(null);
  const [seoLearnOgFile, setSeoLearnOgFile] = useState<File | null>(null);
  const [seoHomeTitle, setSeoHomeTitle] = useState("");
  const [seoHomeDesc, setSeoHomeDesc] = useState("");
  const [seoHomeKw, setSeoHomeKw] = useState("");
  const [seoShopTitle, setSeoShopTitle] = useState("");
  const [seoShopDesc, setSeoShopDesc] = useState("");
  const [seoShopKw, setSeoShopKw] = useState("");
  const [seoCampaignsTitle, setSeoCampaignsTitle] = useState("");
  const [seoCampaignsDesc, setSeoCampaignsDesc] = useState("");
  const [seoCampaignsKw, setSeoCampaignsKw] = useState("");
  const [seoLearnTitle, setSeoLearnTitle] = useState("");
  const [seoLearnDesc, setSeoLearnDesc] = useState("");
  const [seoLearnKw, setSeoLearnKw] = useState("");
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
      setSeoHomeTitle(data.seo_home_meta_title ?? "");
      setSeoHomeDesc(data.seo_home_meta_description ?? "");
      setSeoHomeKw(data.seo_home_meta_keywords ?? "");
      setSeoShopTitle(data.seo_shop_meta_title ?? "");
      setSeoShopDesc(data.seo_shop_meta_description ?? "");
      setSeoShopKw(data.seo_shop_meta_keywords ?? "");
      setSeoCampaignsTitle(data.seo_campaigns_list_meta_title ?? "");
      setSeoCampaignsDesc(data.seo_campaigns_list_meta_description ?? "");
      setSeoCampaignsKw(data.seo_campaigns_list_meta_keywords ?? "");
      setSeoLearnTitle(data.seo_learn_meta_title ?? "");
      setSeoLearnDesc(data.seo_learn_meta_description ?? "");
      setSeoLearnKw(data.seo_learn_meta_keywords ?? "");
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
    fd.append("seo_home_meta_title", seoHomeTitle.trim());
    fd.append("seo_home_meta_description", seoHomeDesc.trim());
    fd.append("seo_home_meta_keywords", seoHomeKw.trim());
    fd.append("seo_shop_meta_title", seoShopTitle.trim());
    fd.append("seo_shop_meta_description", seoShopDesc.trim());
    fd.append("seo_shop_meta_keywords", seoShopKw.trim());
    fd.append("seo_campaigns_list_meta_title", seoCampaignsTitle.trim());
    fd.append("seo_campaigns_list_meta_description", seoCampaignsDesc.trim());
    fd.append("seo_campaigns_list_meta_keywords", seoCampaignsKw.trim());
    fd.append("seo_learn_meta_title", seoLearnTitle.trim());
    fd.append("seo_learn_meta_description", seoLearnDesc.trim());
    fd.append("seo_learn_meta_keywords", seoLearnKw.trim());
    if (logoFile) fd.append("logo", logoFile);
    if (seoHomeOgFile) fd.append("seo_home_og_image", seoHomeOgFile);
    if (seoShopOgFile) fd.append("seo_shop_og_image", seoShopOgFile);
    if (seoCampaignsOgFile) fd.append("seo_campaigns_list_og_image", seoCampaignsOgFile);
    if (seoLearnOgFile) fd.append("seo_learn_og_image", seoLearnOgFile);

    saveSiteSettings.mutate(fd, {
      onSuccess: () => { toast.success("Site settings saved"); setSaving(false); },
      onError: () => { toast.error("Failed to save settings"); setSaving(false); },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div><h1 className="text-2xl font-bold">Site Settings</h1></div>
        <Card><CardContent className="p-6 space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" /> SEO — public pages
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal pt-1">
              Optional overrides for meta title, description, keywords, and Open Graph images. Leave blank to use tagline / subtitle / logo defaults.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Home (/)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-home-title">Meta title</Label>
                  <Input id="seo-home-title" value={seoHomeTitle} onChange={(e) => setSeoHomeTitle(e.target.value)} placeholder="Override browser tab title" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-home-desc">Meta description</Label>
                  <Textarea id="seo-home-desc" value={seoHomeDesc} onChange={(e) => setSeoHomeDesc(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-home-kw">Meta keywords</Label>
                  <Input id="seo-home-kw" value={seoHomeKw} onChange={(e) => setSeoHomeKw(e.target.value)} placeholder="comma, separated" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>OG / social image</Label>
                  <ImageFileField
                    label="Upload image"
                    currentUrl={seoHomeOgFile ? undefined : data?.seo_home_og_image_url}
                    onFileChange={setSeoHomeOgFile}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Shop (/shop)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-shop-title">Meta title</Label>
                  <Input id="seo-shop-title" value={seoShopTitle} onChange={(e) => setSeoShopTitle(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-shop-desc">Meta description</Label>
                  <Textarea id="seo-shop-desc" value={seoShopDesc} onChange={(e) => setSeoShopDesc(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-shop-kw">Meta keywords</Label>
                  <Input id="seo-shop-kw" value={seoShopKw} onChange={(e) => setSeoShopKw(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>OG / social image</Label>
                  <ImageFileField
                    label="Upload image"
                    currentUrl={seoShopOgFile ? undefined : data?.seo_shop_og_image_url}
                    onFileChange={setSeoShopOgFile}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Campaigns list (/campaigns)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-camp-title">Meta title</Label>
                  <Input id="seo-camp-title" value={seoCampaignsTitle} onChange={(e) => setSeoCampaignsTitle(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-camp-desc">Meta description</Label>
                  <Textarea id="seo-camp-desc" value={seoCampaignsDesc} onChange={(e) => setSeoCampaignsDesc(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-camp-kw">Meta keywords</Label>
                  <Input id="seo-camp-kw" value={seoCampaignsKw} onChange={(e) => setSeoCampaignsKw(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>OG / social image</Label>
                  <ImageFileField
                    label="Upload image"
                    currentUrl={seoCampaignsOgFile ? undefined : data?.seo_campaigns_list_og_image_url}
                    onFileChange={setSeoCampaignsOgFile}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Learn to earn (/learn-to-earn)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-learn-title">Meta title</Label>
                  <Input id="seo-learn-title" value={seoLearnTitle} onChange={(e) => setSeoLearnTitle(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-learn-desc">Meta description</Label>
                  <Textarea id="seo-learn-desc" value={seoLearnDesc} onChange={(e) => setSeoLearnDesc(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="seo-learn-kw">Meta keywords</Label>
                  <Input id="seo-learn-kw" value={seoLearnKw} onChange={(e) => setSeoLearnKw(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>OG / social image</Label>
                  <ImageFileField
                    label="Upload image"
                    currentUrl={seoLearnOgFile ? undefined : data?.seo_learn_og_image_url}
                    onFileChange={setSeoLearnOgFile}
                  />
                </div>
              </div>
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
