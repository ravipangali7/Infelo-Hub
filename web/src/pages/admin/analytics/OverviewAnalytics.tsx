import { useState } from "react";
import { TrendingUp, Users, ShoppingCart, Wallet, Activity, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsOverview } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function fmt(n: number): string {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

function num(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function OverviewAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data, isLoading } = useAnalyticsOverview(range.from, range.to);

  return (
    <AnalyticsLayout
      title="Business Overview"
      description="Platform-wide health — GMV, users, orders, wallet balance"
      actions={
        <DateRangePicker value={range} onChange={setRange} />
      }
    >
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          loading={isLoading}
          title="GMV (Period)"
          value={fmt(data?.gmv.value ?? 0)}
          sub="vs previous period"
          pct={data?.gmv.pct}
          icon={TrendingUp}
          iconClass="text-emerald-500"
        />
        <KpiCard
          loading={isLoading}
          title="Net Revenue"
          value={fmt(data?.net_revenue ?? 0)}
          sub="delivered + paid only"
          icon={TrendingUp}
          iconClass="text-blue-500"
        />
        <KpiCard
          loading={isLoading}
          title="Orders"
          value={num(data?.orders.value ?? 0)}
          sub="vs previous period"
          pct={data?.orders.pct}
          icon={ShoppingCart}
          iconClass="text-violet-500"
        />
        <KpiCard
          loading={isLoading}
          title="New Users"
          value={num(data?.new_users.value ?? 0)}
          sub="vs previous period"
          pct={data?.new_users.pct}
          icon={Users}
          iconClass="text-sky-500"
        />
        <KpiCard
          loading={isLoading}
          title="Total Users"
          value={num(data?.total_users ?? 0)}
          sub={`${num(data?.active_users ?? 0)} active`}
          icon={Users}
          iconClass="text-indigo-500"
        />
        <KpiCard
          loading={isLoading}
          title="DAU"
          value={num(data?.dau ?? 0)}
          sub="Daily Active Users"
          icon={Activity}
          iconClass="text-pink-500"
        />
        <KpiCard
          loading={isLoading}
          title="MAU"
          value={num(data?.mau ?? 0)}
          sub="Monthly Active Users"
          icon={Activity}
          iconClass="text-orange-500"
        />
        <KpiCard
          loading={isLoading}
          title="System Balance"
          value={fmt(data?.system_balance ?? 0)}
          sub="Total user wallets"
          icon={Wallet}
          iconClass="text-amber-500"
        />
      </div>

      {/* Deposit vs Withdrawal Summary */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ArrowDownToLine className="w-4 h-4 text-emerald-500" /> Total Deposits (Approved)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold text-emerald-600">{fmt(data?.deposits_total ?? 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ArrowUpFromLine className="w-4 h-4 text-red-500" /> Total Withdrawals (Approved)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold text-red-500">{fmt(data?.withdrawals_total ?? 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={data?.revenue_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders Trend</CardTitle>
            <CardDescription>Daily order count over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data?.orders_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Orders"]} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Registrations</CardTitle>
          <CardDescription>Daily new registrations over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data?.users_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "New Users"]} />
                <Area type="monotone" dataKey="users" stroke="#0ea5e9" fill="url(#userGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* All-time GMV */}
      {!isLoading && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">All-Time GMV</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{fmt(data?.gmv.all_time ?? 0)}</p>
              </div>
              <div className="text-left sm:text-right min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Platform Growth Rate</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 ${(data?.growth_rate ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {(data?.growth_rate ?? 0) >= 0 ? "+" : ""}{data?.growth_rate ?? 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AnalyticsLayout>
  );
}
