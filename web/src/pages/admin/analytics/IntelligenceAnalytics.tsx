import { Brain, TrendingUp, AlertTriangle, Package, ShieldAlert, ScrollText, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/KpiCard";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsIntelligence } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

export default function IntelligenceAnalytics() {
  const { data, isLoading } = useAnalyticsIntelligence();

  const forecast = data?.forecast;
  const yoy = data?.yoy_comparison;
  const risk = data?.risk_alerts;
  const allTime = data?.all_time_records;

  return (
    <AnalyticsLayout
      title="Business Intelligence"
      description="Revenue forecasting, year-over-year comparison, stock depletion, risk alerts, and audit log"
    >
      {/* All-time records */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">All-Time Records</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-8">
        <KpiCard loading={isLoading} title="All-Time Revenue" value={fmt(allTime?.total_revenue ?? 0)} icon={TrendingUp} iconClass="text-emerald-500" />
        <KpiCard loading={isLoading} title="Total Users" value={(allTime?.total_users ?? 0).toLocaleString()} icon={BarChart3} iconClass="text-sky-500" />
        <KpiCard loading={isLoading} title="Total Orders" value={(allTime?.total_orders ?? 0).toLocaleString()} icon={BarChart3} iconClass="text-violet-500" />
        <KpiCard loading={isLoading} title="Total Deposited" value={fmt(allTime?.total_deposits ?? 0)} icon={TrendingUp} iconClass="text-blue-500" />
        <KpiCard loading={isLoading} title="Total Paid Out" value={fmt(allTime?.total_withdrawals ?? 0)} icon={TrendingUp} iconClass="text-red-500" />
      </div>

      {/* Revenue Forecast */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> Revenue Forecast (Next 30 Days)
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 mb-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Forecast — Next 30 Days</p>
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : (
              <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(forecast?.forecast_30_days ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Forecast — Next 90 Days</p>
            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : (
              <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(forecast?.forecast_90_days ?? 0)}</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">30-Day Revenue Forecast Chart</CardTitle>
          <CardDescription>
            Linear trend based on last 30 days · Avg daily: {fmt(forecast?.avg_daily_revenue ?? 0)} · Trend slope: {(forecast?.trend_slope ?? 0).toFixed(4)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={forecast?.chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [fmt(v), "Forecast"]} />
                <Area type="monotone" dataKey="forecast" stroke="#0ea5e9" fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Year-over-Year */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Year-over-Year Revenue Comparison</p>
      </div>
      <div className="grid gap-4 grid-cols-3 mb-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">YTD {yoy?.this_year}</p>
            {isLoading ? <Skeleton className="h-8 w-24 mx-auto mt-1" /> : (
              <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(yoy?.ytd_revenue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">YTD {yoy?.last_year}</p>
            {isLoading ? <Skeleton className="h-8 w-24 mx-auto mt-1" /> : (
              <p className="text-xl font-bold text-muted-foreground mt-1">{fmt(yoy?.ytd_last_year ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">YoY Change</p>
            {isLoading ? <Skeleton className="h-8 w-24 mx-auto mt-1" /> : (
              <p className={`text-xl font-bold mt-1 ${(yoy?.yoy_pct ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {(yoy?.yoy_pct ?? 0) >= 0 ? "+" : ""}{yoy?.yoy_pct ?? 0}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue — {yoy?.this_year} vs {yoy?.last_year}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={yoy?.monthly ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [fmt(v)]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="this_year" name={String(yoy?.this_year)} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="last_year" name={String(yoy?.last_year)} fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Stock Depletion Forecast */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Stock Depletion Forecast
        </p>
      </div>
      <Card className="mb-8">
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(data?.stock_depletion ?? []).map(p => (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {p.stock} · Avg {p.avg_daily_sales.toFixed(1)}/day
                    </p>
                  </div>
                  {p.days_until_empty != null ? (
                    <Badge variant={p.days_until_empty <= 7 ? "destructive" : p.days_until_empty <= 30 ? "secondary" : "outline"} className="shrink-0">
                      {p.days_until_empty <= 0 ? "Out soon" : `~${p.days_until_empty} days`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">No recent sales</Badge>
                  )}
                </div>
              ))}
              {(data?.stock_depletion ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No at-risk products found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Risk & Alert Indicators
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className={`border ${(risk?.failed_tx_today ?? 0) > 5 ? "border-red-300" : ""}`}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Failed Transactions Today</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className={`text-2xl font-bold mt-1 ${(risk?.failed_tx_today ?? 0) > 5 ? "text-red-500" : ""}`}>
                {risk?.failed_tx_today ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Failed Tx This Week</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold mt-1">{risk?.failed_tx_week ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className={`border ${(risk?.frozen_with_pending ?? 0) > 0 ? "border-amber-300" : ""}`}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Frozen + Pending Requests</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className={`text-2xl font-bold mt-1 ${(risk?.frozen_with_pending ?? 0) > 0 ? "text-amber-500" : ""}`}>
                {risk?.frozen_with_pending ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Withdrawal Total</p>
            {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
              <p className="text-xl font-bold text-amber-500 mt-1">{fmt(risk?.pending_withdrawal_total ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total User Liability</p>
            {isLoading ? <Skeleton className="h-8 w-24 mt-1" /> : (
              <p className="text-xl font-bold text-red-500 mt-1">{fmt(risk?.total_user_liability ?? 0)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspicious withdrawals */}
      {(risk?.suspicious_withdrawal_users ?? []).length > 0 && (
        <Card className="mb-8 border-amber-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Users with Multiple Pending Withdrawals
            </CardTitle>
            <CardDescription>Users with 3+ simultaneous pending withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(risk?.suspicious_withdrawal_users ?? []).map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.user__name || u.user__phone}</p>
                    <p className="text-xs text-muted-foreground">{u.user__phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-amber-600">{fmt(u.total_amount)}</p>
                    <Badge variant="destructive" className="text-[9px]">{u.count} requests</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> Audit Log (Recent System Transactions)
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(data?.audit_log ?? []).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tx.transaction_type === "added" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tx.user__name || tx.user__phone || `User #${tx.user_id}`}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.transaction_for?.replace("_", " ")} · {tx.remarks || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${tx.transaction_type === "added" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.transaction_type === "added" ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <Badge
                      variant={tx.status === "success" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}
                      className="text-[9px] px-1 py-0 h-3.5"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(data?.audit_log ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No system transactions recorded yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
