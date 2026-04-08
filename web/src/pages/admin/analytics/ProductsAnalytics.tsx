import { useState } from "react";
import { Package, AlertTriangle, Heart, Building2, ShoppingCart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsProducts, useAnalyticsVendors, useAnalyticsProcurement } from "@/api/hooks";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

const STOCK_COLORS = ["#ef4444", "#f59e0b", "#0ea5e9", "#10b981"];

export default function ProductsAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data: products, isLoading: pLoading } = useAnalyticsProducts(range.from, range.to);
  const { data: vendors, isLoading: vLoading } = useAnalyticsVendors(range.from, range.to);
  const { data: procurement, isLoading: procLoading } = useAnalyticsProcurement(range.from, range.to);

  const isLoading = pLoading || vLoading || procLoading;

  const stockBucketData = [
    { name: "Out of Stock", value: products?.stock_buckets.out_of_stock ?? 0 },
    { name: "Low (1-9)", value: products?.stock_buckets.low_stock_1_9 ?? 0 },
    { name: "Medium (10-49)", value: products?.stock_buckets.medium_10_50 ?? 0 },
    { name: "Healthy (50+)", value: products?.stock_buckets.healthy_50_plus ?? 0 },
  ];

  return (
    <AnalyticsLayout
      title="Products, Vendors & Procurement"
      description="Stock levels, margins, vendor performance, and procurement cost"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* Products KPIs */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Products</p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <KpiCard loading={pLoading} title="Total Products" value={(products?.total_products ?? 0).toLocaleString()} sub={`${products?.active_products ?? 0} active`} icon={Package} iconClass="text-primary" />
          <KpiCard loading={pLoading} title="Out of Stock" value={(products?.out_of_stock ?? 0).toLocaleString()} sub="need restocking" icon={AlertTriangle} iconClass="text-red-500" />
          <KpiCard loading={pLoading} title="Low Stock" value={(products?.low_stock ?? 0).toLocaleString()} sub="1–9 units left" icon={AlertTriangle} iconClass="text-amber-500" />
          <KpiCard loading={pLoading} title="Never Purchased" value={(products?.never_purchased ?? 0).toLocaleString()} sub="active, 0 sales" icon={Package} iconClass="text-gray-400" />
        </div>
      </div>

      {/* Stock bucket chart + Category distribution */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Health Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={stockBucketData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                    {stockBucketData.map((_, i) => <Cell key={i} fill={STOCK_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Cell fill="#ef4444" />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stockBucketData.map((b, i) => (
                <div key={b.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STOCK_COLORS[i] }} />
                  <span className="truncate text-muted-foreground">{b.name}: <strong className="text-foreground">{b.value}</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categories by Product Count</CardTitle>
          </CardHeader>
          <CardContent>
            {pLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={(products?.category_distribution ?? []).slice(0, 8)} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="category__name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products by revenue */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Top Products by Revenue (Period)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(products?.top_by_revenue ?? []).map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product__name}</p>
                    <p className="text-xs text-muted-foreground">{p.units} units</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products with highest margin */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Products by Profit Margin</CardTitle>
          <CardDescription>Top 10 active products sorted by margin %</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(products?.products_with_margin ?? []).slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Cost: {fmt(p.purchasing_price)} → Sale: {fmt(p.selling_price)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={p.margin >= 30 ? "default" : p.margin >= 10 ? "secondary" : "destructive"}>
                      {p.margin.toFixed(1)}% margin
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">Stock: {p.stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wishlist conversion */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" /> Wishlist to Purchase Conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(products?.wishlist_conversion ?? []).map((p) => (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product__name}</p>
                    <p className="text-xs text-muted-foreground">{p.wishlist_count} wishlisted → {p.purchased_count} purchased</p>
                  </div>
                  <Badge variant={p.conversion_rate >= 50 ? "default" : "secondary"} className="shrink-0">
                    {p.conversion_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendors */}
      <div className="mb-3 mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Vendors</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={vLoading} title="Total Vendors" value={(vendors?.total_vendors ?? 0).toLocaleString()} icon={Building2} iconClass="text-primary" />
        <KpiCard loading={vLoading} title="Total Payable" value={fmt(vendors?.total_payable ?? 0)} sub="owed to vendors" icon={Building2} iconClass="text-red-500" />
        <KpiCard loading={vLoading} title="Total Receivable" value={fmt(vendors?.total_receivable ?? 0)} sub="owed by vendors" icon={Building2} iconClass="text-emerald-500" />
        <KpiCard loading={vLoading} title="Net Balance" value={fmt(vendors?.net_vendor_balance ?? 0)} sub="receivable - payable" icon={Building2} iconClass={(vendors?.net_vendor_balance ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Vendor Revenue (Period)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vLoading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(vendors?.vendor_revenue ?? []).slice(0, 10).map((v, i) => (
                <div key={v.sales__vendor_id ?? i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{v.sales__vendor__name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{v.orders} orders</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{fmt(v.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Procurement */}
      <div className="mb-3 mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Procurement</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={procLoading} title="Total Purchases" value={(procurement?.total_purchases ?? 0).toLocaleString()} icon={ShoppingCart} iconClass="text-primary" />
        <KpiCard loading={procLoading} title="Total Cost" value={fmt(procurement?.total_cost ?? 0)} icon={ShoppingCart} iconClass="text-red-500" />
        <KpiCard loading={procLoading} title="Gross Profit" value={fmt(procurement?.gross_profit ?? 0)} icon={TrendingUp} iconClass="text-emerald-500" />
        <KpiCard loading={procLoading} title="Gross Margin" value={`${procurement?.gross_margin_pct ?? 0}%`} sub="(revenue - cost) / revenue" icon={TrendingUp} iconClass="text-blue-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procurement Cost Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {procLoading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={procurement?.cost_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [fmt(v), "Cost"]} />
                <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="url(#costGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
