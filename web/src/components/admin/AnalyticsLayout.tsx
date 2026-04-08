import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Building2,
  Share2,
  Megaphone,
  Wallet,
  MousePointerClick,
  Brain,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const analyticsNav = [
  { path: "/system/analytics", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/system/analytics/users", label: "Users", icon: Users },
  { path: "/system/analytics/sales", label: "Sales & Orders", icon: ShoppingCart },
  { path: "/system/analytics/products", label: "Products & Vendors", icon: Package },
  { path: "/system/analytics/earning", label: "Earning Programs", icon: Share2 },
  { path: "/system/analytics/finance", label: "Finance", icon: Wallet },
  { path: "/system/analytics/behaviour", label: "Behaviour", icon: MousePointerClick },
  { path: "/system/analytics/sms", label: "SMS", icon: MessageSquare },
  { path: "/system/analytics/intelligence", label: "Intelligence", icon: Brain },
];

interface AnalyticsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AnalyticsLayout({ children, title, description, actions }: AnalyticsLayoutProps) {
  const location = useLocation();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold font-display">{title}</h1>
          {description && <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {/* Sub-navigation tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 min-w-max pb-0">
          {analyticsNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1 md:gap-1.5 px-2 py-2 md:px-3 md:py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
