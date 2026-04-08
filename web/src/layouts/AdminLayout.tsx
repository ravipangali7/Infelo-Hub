import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { getToken, clearToken, getUser, setUser } from "@/api/client";
import { getMe } from "@/api/endpoints";
import { useAdminPendingCounts } from "@/api/hooks";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  CreditCard,
  Building2,
  ArrowDownToLine,
  ArrowUpFromLine,
  FolderTree,
  Package,
  Megaphone,
  ClipboardCheck,
  Box,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  ScrollText,
  Menu,
  ChevronDown,
  MapPin,
  Truck,
  FileText,
  Banknote,
  Wallet,
  Image,
  Globe,
  BookOpen,
  LineChart,
  Share2,
  MousePointerClick,
  Brain,
  Bell,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logoT.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type MenuItem = {
  path: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  badgeKey?: keyof PendingCounts;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

type PendingCounts = {
  payout_accounts: number;
  deposits: number;
  withdrawals: number;
  kyc: number;
  submissions: number;
  sales: number;
};

const menuGroups: MenuGroup[] = [
  {
    label: "Overview",
    items: [
      { path: "/system", icon: LayoutDashboard, label: "Dashboard", exact: true },
      { path: "/system/my-notifications", icon: Inbox, label: "My notifications" },
    ],
  },
  {
    label: "Human Resource",
    items: [
      { path: "/system/users", icon: Users, label: "Users" },
      { path: "/system/kyc", icon: ShieldCheck, label: "KYC Management", badgeKey: "kyc" },
      { path: "/system/payout-accounts", icon: CreditCard, label: "Payout Accounts", badgeKey: "payout_accounts" },
      { path: "/system/vendors", icon: Building2, label: "Vendors" },
    ],
  },
  {
    label: "Payment Requests",
    items: [
      { path: "/system/deposits", icon: ArrowDownToLine, label: "Deposits", badgeKey: "deposits" },
      { path: "/system/withdrawals", icon: ArrowUpFromLine, label: "Withdrawals", badgeKey: "withdrawals" },
    ],
  },
  {
    label: "Location",
    items: [
      { path: "/system/cities", icon: MapPin, label: "Cities" },
      { path: "/system/shipping-charges", icon: Truck, label: "Shipping Charges" },
      { path: "/system/addresses", icon: FileText, label: "Addresses" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { path: "/system/categories", icon: FolderTree, label: "Categories" },
      { path: "/system/products", icon: Package, label: "Products" },
    ],
  },
  {
    label: "Campaign",
    items: [
      { path: "/system/campaigns", icon: Megaphone, label: "Campaigns" },
      { path: "/system/submissions", icon: ClipboardCheck, label: "Submissions", badgeKey: "submissions" },
    ],
  },
  // {
  //   label: "Package",
  //   items: [
  //     { path: "/system/packages", icon: Box, label: "Packages" },
  //   ],
  // },
  {
    label: "Finance",
    items: [
      { path: "/system/purchases", icon: ShoppingCart, label: "Purchases" },
      { path: "/system/sales", icon: Receipt, label: "Sales", badgeKey: "sales" },
      { path: "/system/paid-records", icon: Banknote, label: "Paid Records" },
      { path: "/system/received-records", icon: Wallet, label: "Received Records" },
      { path: "/system/transactions", icon: BarChart3, label: "Transactions" },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/system/banners", icon: Image, label: "Banners" },
      { path: "/system/push-notifications", icon: Bell, label: "Push notifications" },
      { path: "/system/site-settings", icon: Globe, label: "Site Settings" },
      { path: "/system/cms-pages", icon: BookOpen, label: "CMS Pages" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { path: "/system/analytics", icon: LineChart, label: "Overview", exact: true },
      { path: "/system/analytics/users", icon: Users, label: "Users" },
      { path: "/system/analytics/sales", icon: ShoppingCart, label: "Sales & Orders" },
      { path: "/system/analytics/products", icon: Package, label: "Products & Vendors" },
      { path: "/system/analytics/earning", icon: Share2, label: "Earning Programs" },
      { path: "/system/analytics/finance", icon: Wallet, label: "Finance" },
      { path: "/system/analytics/behaviour", icon: MousePointerClick, label: "Behaviour" },
      { path: "/system/analytics/sms", icon: MessageSquare, label: "SMS" },
      { path: "/system/analytics/intelligence", icon: Brain, label: "Intelligence" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/system/settings", icon: Settings, label: "Settings" },
      { path: "/system/system-withdrawals", icon: ArrowUpFromLine, label: "System Withdrawals" },
      { path: "/system/activity-logs", icon: ScrollText, label: "Activity Logs" },
      { path: "/system/sms-logs", icon: MessageSquare, label: "SMS Logs" },
    ],
  },
];

type StaffGate = "checking" | "no_token" | "not_staff" | "ok";

function initialStaffGate(): StaffGate {
  if (!getToken()) return "no_token";
  const u = getUser();
  if (u?.is_staff) return "ok";
  if (u && !u.is_staff) return "not_staff";
  return "checking";
}

const STAFF_ONLY_MSG =
  "The admin panel is only for staff. Use the client app from the home page, or sign in with a staff account.";

function AdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(menuGroups.map(g => g.label));
  const [pendingModalOpen, setPendingModalOpen] = useState(false);

  // Activity tracking for admin panel
  useActivityTracker({ platform: "admin" });

  // Pending counts for sidebar badges — polls every 30s
  const { data: countsData } = useAdminPendingCounts();
  const counts: PendingCounts = {
    payout_accounts: countsData?.payout_accounts ?? 0,
    deposits: countsData?.deposits ?? 0,
    withdrawals: countsData?.withdrawals ?? 0,
    kyc: countsData?.kyc ?? 0,
    submissions: countsData?.submissions ?? 0,
    sales: countsData?.sales ?? 0,
  };

  const handleLogout = () => {
    clearToken();
    navigate("/login");
    window.location.reload();
  };
  const pendingItems = [
    { key: "kyc", label: "KYC", count: counts.kyc, path: "/system/kyc" },
    { key: "payout_accounts", label: "Payout Accounts", count: counts.payout_accounts, path: "/system/payout-accounts" },
    { key: "deposits", label: "Deposits", count: counts.deposits, path: "/system/deposits" },
    { key: "withdrawals", label: "Withdrawals", count: counts.withdrawals, path: "/system/withdrawals" },
    { key: "submissions", label: "Campaign Submissions", count: counts.submissions, path: "/system/submissions" },
    { key: "sales", label: "Sales", count: counts.sales, path: "/system/sales" },
  ];
  const totalPending = pendingItems.reduce((sum, item) => sum + item.count, 0);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/system" className="flex items-center gap-3">
          <img src={logo} alt="Infelo Hub" className="h-8 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              {group.label}
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                expandedGroups.includes(group.label) && "rotate-180"
              )} />
            </button>
            {expandedGroups.includes(group.label) && (
              <div className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path, item.exact);
                  const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center shrink-0"
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col admin-sidebar text-white transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 admin-sidebar text-white">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 md:h-16 border-b border-border bg-card flex items-center px-3 md:px-4 lg:px-6 gap-2 md:gap-4">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen(true);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="flex-1" />
          {/* Total pending badge in header */}
          {totalPending > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground min-w-0">
              <span className="inline-flex items-center gap-1 min-w-0">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                <span className="truncate">
                  <span className="md:hidden">{totalPending} pending</span>
                  <span className="hidden md:inline">{totalPending} pending actions</span>
                </span>
              </span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10" onClick={() => setPendingModalOpen(true)}>
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            {totalPending > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 leading-none">
                {totalPending > 99 ? "99+" : totalPending}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm min-w-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs md:text-sm font-medium shrink-0">
              A
            </div>
            <span className="hidden sm:inline font-medium truncate">Admin</span>
            {getToken() ? (
              <button
                type="button"
                onClick={handleLogout}
                data-track="admin_logout"
                className="text-muted-foreground hover:text-foreground text-[10px] md:text-xs ml-1 md:ml-2 shrink-0"
              >
                Log out
              </button>
            ) : (
              <Link to="/login" className="text-primary text-[10px] md:text-xs ml-1 md:ml-2 shrink-0">Log in</Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-auto text-sm md:text-base">
          <Outlet />
        </main>
      </div>
      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pending Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className="w-full flex items-center justify-between rounded-md border p-3 text-left hover:bg-muted"
                onClick={() => {
                  setPendingModalOpen(false);
                  navigate(item.path);
                }}
              >
                <span className="text-sm">{item.label}</span>
                <Badge variant={item.count > 0 ? "destructive" : "secondary"}>{item.count}</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AdminLayout = () => {
  const location = useLocation();
  const [gate, setGate] = useState<StaffGate>(initialStaffGate);

  useEffect(() => {
    if (gate !== "checking") return;
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setGate("no_token");
        return;
      }
      try {
        const user = await getMe();
        if (cancelled) return;
        setUser(user);
        if (!user.is_staff) setGate("not_staff");
        else setGate("ok");
      } catch {
        if (!cancelled) {
          clearToken();
          setGate("no_token");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gate]);

  if (gate === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (gate === "no_token") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (gate === "not_staff") {
    return (
      <Navigate
        to="/"
        replace
        state={{ staffOnlyMessage: STAFF_ONLY_MSG }}
      />
    );
  }

  return <AdminLayoutInner />;
};

export default AdminLayout;
