import { useState } from "react";
import { ShoppingCart, TrendingUp, XCircle, CheckCircle, Clock, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsSales } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", processing: "#3b82f6", shipped: "#8b5cf6",
  delivered: "#10b981", cancelled: "#ef4444", rejected: "#6b7280",
};

const METHOD_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SalesAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data, isLoading } = useAnalyticsSales(range.from, range.to);

  const pipelineData = Object.entries(data?.status_funnel ?? {}).map(([status, vals]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: vals.count,
    amount: vals.amount,
    color: STATUS_COLORS[status] ?? "#94a3b8",
  }));

  const peakDaysData = (data?.peak_days ?? []).map(row => ({
    name: row.day_name,
    orders: row.count,
  }));

  return (
    <AnalyticsLayout
      title="Sales & Orders Analytics"
      description="Order volume, revenue, funnel, payment methods, and peak activity"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={isLoading} title="Total Orders" value={(data?.total_orders.value ?? 0).toLocaleString()} sub="vs previous period" pct={data?.total_orders.pct} icon={ShoppingCart} iconClass="text-primary" />
        <KpiCard loading={isLoading} title="Total Revenue" value={fmt(data?.total_revenue.value ?? 0)} sub="vs previous period" pct={data?.total_revenue.pct} icon={TrendingUp} iconClass="text-emerald-500" />
        <KpiCard loading={isLoading} title="Avg Order Value" value={fmt(data?.aov.value ?? 0)} sub="per order" icon={TrendingUp} iconClass="text-blue-500" />
        <KpiCard loading={isLoading} title="Delivery Rate" value={`${data?.delivery_rate ?? 0}%`} sub="orders delivered" icon={CheckCircle} iconClass="text-green-500" />
        <KpiCard loading={isLoading} title="Cancellation Rate" value={`${data?.cancellation_rate ?? 0}%`} sub="orders cancelled" icon={XCircle} iconClass="text-red-500" />
        <KpiCard loading={isLoading} title="Rejection Rate" value={`${data?.rejection_rate ?? 0}%`} sub="orders rejected" icon={XCircle} iconClass="text-orange-500" />
        <KpiCard loading={isLoading} title="Repeat Purchase Rate" value={`${data?.repeat_rate ?? 0}%`} sub="users with >1 order" icon={Clock} iconClass="text-violet-500" />
        <KpiCard loading={isLoading} title="Shipping Revenue" value={fmt(data?.shipping_revenue ?? 0)} sub="from shipping charges" icon={Truck} iconClass="text-indigo-500" />
      </div>

      {/* Revenue chart + Pipeline */}
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
                    <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#salesRevGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status Pipeline</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : pipelineData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string, props: { payload?: { amount: number } }) => [`${v} orders (${fmt(props.payload?.amount ?? 0)})`, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment method + Peak days */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method Split</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={data?.payment_split ?? []} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="payment_method" paddingAngle={3}>
                    {(data?.payment_split ?? []).map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v + " orders", n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Order Days</CardTitle>
            <CardDescription>Orders by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={peakDaysData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Orders"]} />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak hours */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Peak Order Hours</CardTitle>
          <CardDescription>Order count by hour of day (24h)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.peak_hours ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={h => `${h}h`} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number, _, { payload }) => [v, `Hour ${payload?.hour}`]} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Products by Revenue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(data?.top_products ?? []).map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product__name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} units sold</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{fmt(p.revenue)}</span>
                </div>
              ))}
              {(data?.top_products ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No sales data yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
