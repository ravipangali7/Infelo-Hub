import { useEffect, type MouseEvent } from "react";
import { Outlet, useLocation, useNavigate, Link, Navigate } from "react-router-dom";
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

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/shop", icon: ShoppingBag, label: "Shop" },
  { path: "/orders", icon: ClipboardList, label: "Orders" },
  { path: "/wallet", icon: Wallet, label: "Wallet" },
  { path: "/profile", icon: User, label: "Profile" },
];

const protectedPaths = ["/orders", "/wallet", "/profile"];

const coreDesktopNav = [
  { path: "/", label: "Home", auth: false },
  { path: "/shop", label: "Shop", auth: false },
  { path: "/shop", label: "Categories", auth: false },
  { path: "/orders", label: "Orders", auth: true },
] as const;

const overflowNavItems: { path: string; label: string; auth: boolean; icon?: typeof Wallet }[] = [
  { path: "/wallet", label: "Wallet", auth: true, icon: Wallet },
  { path: "/cart", label: "Cart", auth: true, icon: ShoppingCart },
  { path: "/wishlist", label: "Wishlist", auth: true, icon: Heart },
  { path: "/learn-to-earn", label: "Learn to earn", auth: false, icon: GraduationCap },
  { path: "/campaigns", label: "Campaigns", auth: false, icon: ShoppingBag },
  { path: "/transactions", label: "Transactions", auth: true, icon: Receipt },
  { path: "/deposit", label: "Deposit", auth: true, icon: ArrowDownToLine },
  { path: "/withdraw", label: "Withdraw", auth: true, icon: ArrowUpFromLine },
  { path: "/addresses", label: "Addresses", auth: true, icon: MapPin },
  { path: "/payout-accounts", label: "Payout accounts", auth: true, icon: CreditCard },
  { path: "/kyc", label: "KYC", auth: true, icon: ShieldCheck },
];

const ClientLayout = () => {
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
        title: "Admin access required",
        description: msg,
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

  return (
    <div className="min-h-screen bg-background animated-bg">
      <SiteAnalyticsScripts html={publicSite?.google_analytics_script} />
      {/* Desktop ecommerce header */}
      <header className="client-desktop-header hidden lg:block">
        <div className="client-page-content flex h-14 items-center gap-6 px-4 xl:px-10">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logo} alt="Infelo Hub" className="h-9 w-auto" />
            <span className="font-display text-lg font-semibold text-primary">Infelo Hub</span>
          </Link>

          <nav className="flex flex-1 items-center gap-6">
            {coreDesktopNav.map((item) => {
              const active = item.label === "Categories" ? isActive("/shop") : isActive(item.path);
              return (
                <Link
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  onClick={(e) => item.auth && requireAuthNav(item.path, e)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label === "Categories" && <LayoutGrid className="h-4 w-4 opacity-70" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {user?.is_staff ? (
              <Link
                to="/system"
                onClick={(e) => requireAuthNav("/system", e)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
                aria-label="Superadmin"
                title="Admin panel"
              >
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </Link>
            ) : null}
            <Link
              to="/notifications"
              onClick={(e) => requireAuthNav("/notifications", e)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-colors hover:bg-muted/60"
              aria-label="Notifications"
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
              aria-label="Cart"
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
              aria-label="Profile"
            >
              <User className="h-5 w-5" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="More navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[70]">
                <DropdownMenuLabel>More</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.is_staff ? (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/system"
                      onClick={(e) => requireAuthNav("/system", e)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      Superadmin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {overflowNavItems.map((item) => {
                  const Icon = item.icon ?? ShoppingBag;
                  return (
                    <DropdownMenuItem key={item.path + item.label} asChild>
                      <Link
                        to={item.path}
                        onClick={(e) => item.auth && requireAuthNav(item.path, e)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Icon className="h-4 w-4 opacity-70" />
                        {item.label}
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
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
                  {item.label}
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
