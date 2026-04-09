import { useEffect, type MouseEvent } from "react";
import { Outlet, useLocation, useNavigate, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  Home,
  ShoppingBag,
  Wallet,
  User,
  ClipboardList,
  ShoppingCart,
  LayoutGrid,
  Menu,
  Heart,
  GraduationCap,
  Receipt,
  MapPin,
  CreditCard,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getToken, getUser, setAuthRedirectReason } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useNotificationUnreadCount, usePublicSiteSettings } from "@/api/hooks";
import { SiteAnalyticsScripts } from "@/components/SiteAnalyticsScripts";
import { useCart } from "@/contexts/CartContext";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const bottomNavConfig = [
  { path: "/", icon: Home, navKey: "home" as const },
  { path: "/shop", icon: ShoppingBag, navKey: "shop" as const },
  { path: "/orders", icon: ClipboardList, navKey: "orders" as const },
  { path: "/wallet", icon: Wallet, navKey: "wallet" as const },
  { path: "/profile", icon: User, navKey: "profile" as const },
];

const protectedPaths = ["/orders", "/wallet", "/profile"];

const coreDesktopNav = [
  { path: "/", navKey: "home" as const, auth: false },
  { path: "/shop", navKey: "shop" as const, auth: false },
  { path: "/shop", navKey: "categories" as const, auth: false },
  { path: "/orders", navKey: "orders" as const, auth: true },
] as const;

const overflowNavConfig = [
  { path: "/wallet", navKey: "wallet" as const, auth: true, icon: Wallet },
  { path: "/cart", navKey: "cart" as const, auth: true, icon: ShoppingCart },
  { path: "/wishlist", navKey: "wishlist" as const, auth: true, icon: Heart },
  { path: "/learn-to-earn", navKey: "learnToEarn" as const, auth: false, icon: GraduationCap },
  { path: "/campaigns", navKey: "campaigns" as const, auth: false, icon: ShoppingBag },
  { path: "/transactions", navKey: "transactions" as const, auth: true, icon: Receipt },
  { path: "/deposit", navKey: "deposit" as const, auth: true, icon: ArrowDownToLine },
  { path: "/withdraw", navKey: "withdraw" as const, auth: true, icon: ArrowUpFromLine },
  { path: "/addresses", navKey: "addresses" as const, auth: true, icon: MapPin },
  { path: "/payout-accounts", navKey: "payoutAccounts" as const, auth: true, icon: CreditCard },
  { path: "/kyc", navKey: "kyc" as const, auth: true, icon: ShieldCheck },
] as const;

function LanguageSelect({ className }: { className?: string }) {
  const { t } = useTranslation("client");
  const value = i18n.language.startsWith("ne") ? "ne" : "en";
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        void i18n.changeLanguage(v);
      }}
    >
      <SelectTrigger className={cn("h-9 w-[108px] rounded-xl text-xs", className)} aria-label={t("language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[80]">
        <SelectItem value="en">{t("langEn")}</SelectItem>
        <SelectItem value="ne">{t("langNe")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

const ClientLayout = () => {
  const { t } = useTranslation("client");
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { data: unreadNotif } = useNotificationUnreadCount();
  const notifUnread = unreadNotif?.unread_count ?? 0;
  const { data: publicSite } = usePublicSiteSettings();

  useActivityTracker({ platform: "client" });

  useEffect(() => {
    const msg = (location.state as { staffOnlyMessage?: string } | null)?.staffOnlyMessage;
    if (msg) {
      toast({
        variant: "destructive",
        title: i18n.t("client:staffToastTitle"),
        description: msg || i18n.t("client:staffToastDescription"),
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const user = getUser();
  if (user && (!user.is_active || user.status === "freeze" || user.status === "deactivate")) {
    setAuthRedirectReason(
      !user.is_active ? "ACCOUNT_DISABLED" : user.status === "deactivate" ? "ACCOUNT_DEACTIVATED" : "ACCOUNT_FROZEN"
    );
    return <Navigate to="/account-blocked" replace />;
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const requireAuthNav = (path: string, e: MouseEvent) => {
    if (!getToken()) {
      e.preventDefault();
      navigate("/login", { state: { from: path } });
    }
  };

  const brand = t("brand");

  return (
    <div className="min-h-screen bg-background animated-bg">
      <SiteAnalyticsScripts html={publicSite?.google_analytics_script} />
      <header className="client-desktop-header hidden lg:block">
        <div className="client-page-content flex h-14 items-center gap-6 px-4 xl:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logo} alt={brand} className="h-9 w-auto" />
            <span className="font-display text-lg font-semibold text-primary">{brand}</span>
          </Link>

          <nav className="flex flex-1 items-center gap-6">
            {coreDesktopNav.map((item) => {
              const active = item.navKey === "categories" ? isActive("/shop") : isActive(item.path);
              const label = t(`nav.${item.navKey}`);
              return (
                <Link
                  key={`${item.path}-${item.navKey}`}
                  to={item.path}
                  onClick={(e) => item.auth && requireAuthNav(item.path, e)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.navKey === "categories" && <LayoutGrid className="h-4 w-4 opacity-70" />}
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelect />
            {user?.is_staff ? (
              <Link
                to="/system"
                onClick={(e) => requireAuthNav("/system", e)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
                aria-label={t("ariaSuperadmin")}
                title={t("adminPanel")}
              >
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </Link>
            ) : null}
            <Link
              to="/notifications"
              onClick={(e) => requireAuthNav("/notifications", e)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
              aria-label={t("notifications")}
            >
              <Bell className="h-5 w-5" />
              {getToken() && notifUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {notifUnread > 9 ? "9+" : notifUnread}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              onClick={(e) => requireAuthNav("/cart", e)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
              aria-label={t("ariaCart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              onClick={(e) => requireAuthNav("/profile", e)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
              aria-label={t("ariaProfile")}
            >
              <User className="h-5 w-5" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={t("moreMenu")}>
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[70]">
                <DropdownMenuLabel className="lg:hidden">{t("language")}</DropdownMenuLabel>
                <div className="px-2 pb-2 pt-0 lg:hidden">
                  <LanguageSelect className="w-full" />
                </div>
                <DropdownMenuSeparator className="lg:hidden" />
                <DropdownMenuLabel>{t("more")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.is_staff ? (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/system"
                      onClick={(e) => requireAuthNav("/system", e)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      {t("superadmin")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {overflowNavConfig.map((item) => {
                  const Icon = item.icon ?? ShoppingBag;
                  const label = t(`nav.${item.navKey}`);
                  return (
                    <DropdownMenuItem key={item.path + item.navKey} asChild>
                      <Link
                        to={item.path}
                        onClick={(e) => item.auth && requireAuthNav(item.path, e)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Icon className="h-4 w-4 opacity-70" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="client-main pb-24 lg:pb-0">
        <Outlet />
      </main>

      <nav className="bottom-nav z-50 lg:hidden">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {bottomNavConfig.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const label = t(`nav.${item.navKey}`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => {
                  if (!getToken() && protectedPaths.includes(item.path)) {
                    e.preventDefault();
                    navigate("/login", { state: { from: item.path } });
                  }
                }}
                className={cn("bottom-nav-item flex-1", active && "active")}
              >
                <div
                  className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    active && "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ClientLayout;
