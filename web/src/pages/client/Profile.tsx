import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  User,
  ShieldCheck,
  ShoppingBag,
  Megaphone,
  Receipt,
  CreditCard,
  MapPin,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
  Heart,
  Save,
  X,
  LayoutDashboard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProfile, usePublicSiteSettings } from "@/api/hooks";
import { clearToken } from "@/api/client";
import { clientApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const getKycBadge = (status: string, t: (k: string) => string) => {
  switch (status) {
    case "approved":
      return { icon: CheckCircle2, label: t("pages:profile.kycVerified"), color: "bg-success/10 text-success border-success/20" };
    case "pending":
      return { icon: Clock, label: t("pages:profile.kycPending"), color: "bg-warning/10 text-warning border-warning/20" };
    case "rejected":
      return { icon: XCircle, label: t("pages:profile.kycRejected"), color: "bg-destructive/10 text-destructive border-destructive/20" };
    default:
      return { icon: ShieldCheck, label: t("pages:profile.completeKyc"), color: "bg-muted text-muted-foreground" };
  }
};

const Profile = () => {
  const { t } = useTranslation(["pages", "common", "client"]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading, error } = useProfile();
  const { data: siteSettings } = usePublicSiteSettings();
  const kyc = profile ? getKycBadge(profile.kyc_status ?? "", t) : getKycBadge("", t);
  const KycIcon = kyc.icon;

  const menuItems = useMemo(
    () => [
      { icon: ShoppingBag, label: t("pages:profile.myOrders"), path: "/orders", badge: null as string | null },
      { icon: Megaphone, label: t("pages:profile.myCampaigns"), path: "/campaigns", badge: null },
      { icon: Heart, label: t("pages:profile.wishlist"), path: "/wishlist", badge: null },
      { icon: Receipt, label: t("pages:profile.transactions"), path: "/transactions", badge: null },
      { icon: CreditCard, label: t("pages:profile.payoutAccounts"), path: "/payout-accounts", badge: null },
      { icon: MapPin, label: t("pages:profile.addresses"), path: "/addresses", badge: null },
    ],
    [t]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setEditName(profile?.name ?? "");
    setEditEmail(profile?.email ?? "");
    setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await clientApi.updateProfile({ name: editName, email: editEmail });
      await qc.invalidateQueries({ queryKey: ["client", "profile"] });
      toast.success(t("pages:profile.profileUpdated"));
      setEditOpen(false);
    } catch {
      toast.error(t("pages:profile.profileUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  const whatsappNumber = siteSettings?.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">{t("pages:profile.failedLoad")}</p>
      </div>
    );
  }
  if (isLoading || !profile) {
    return (
      <div className="min-h-screen">
        <header className="client-page-container client-page-content pt-6 pb-4">
          <h1 className="text-2xl font-bold font-display">{t("pages:profile.title")}</h1>
        </header>
        <div className="client-page-container client-page-content space-y-6 pb-8">
          <div className="floating-card p-6">
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="client-page-container client-page-content pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display">{t("pages:profile.title")}</h1>
      </header>

      <div className="client-page-container client-page-content space-y-6 pb-8">
        <div className="floating-card p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {(profile.name || profile.phone || t("common:userFallback")).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={openEdit}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shadow-lg"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{profile.name || profile.phone || t("common:userFallback")}</h2>
              <p className="text-sm text-muted-foreground">{profile.phone}</p>
              {profile.email && <p className="text-sm text-muted-foreground truncate">{profile.email}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.package_name && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">{profile.package_name}</Badge>
                )}
                <Link to="/kyc">
                  <Badge className={`${kyc.color} cursor-pointer`}>
                    <KycIcon className="w-3 h-3 mr-1" />
                    {kyc.label}
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="floating-card overflow-hidden">
          {profile.is_staff ? (
            <Link
              to="/system"
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 font-medium">{t("pages:profile.superadmin")}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ) : null}
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={i}
                to={item.path}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge && <Badge className="bg-accent text-white border-0">{item.badge}</Badge>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <div className="floating-card overflow-hidden">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="flex-1 font-medium">{t("pages:profile.support")}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full floating-card flex items-center gap-4 p-4 text-destructive hover:bg-destructive/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="flex-1 font-medium text-left">{t("pages:profile.logout")}</span>
        </button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("pages:profile.editProfile")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("pages:profile.fullName")}</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("auth:register.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t("pages:profile.email")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder={t("pages:profile.emailPlaceholder")}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                {t("common:cancel")}
              </Button>
              <Button className="flex-1" onClick={handleSaveProfile} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? t("pages:profile.saving") : t("common:save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
