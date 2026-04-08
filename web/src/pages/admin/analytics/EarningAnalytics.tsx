import { useState } from "react";
import { Share2, Megaphone, Trophy, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsAffiliates, useAnalyticsCampaigns } from "@/api/hooks";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  coming: "#f59e0b",
  running: "#10b981",
  finished: "#6b7280",
  deactivate: "#ef4444",
};

const SUB_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function EarningAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data: aff, isLoading: affLoading } = useAnalyticsAffiliates(range.from, range.to);
  const { data: camp, isLoading: campLoading } = useAnalyticsCampaigns(range.from, range.to);

  const submissionPie = [
    { name: "Approved", value: camp?.approved ?? 0 },
    { name: "Pending", value: camp?.pending ?? 0 },
    { name: "Rejected", value: camp?.rejected ?? 0 },
  ];

  const campaignStatusData = Object.entries(camp?.campaigns_by_status ?? {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: CAMPAIGN_STATUS_COLORS[status] ?? "#94a3b8",
  }));

  return (
    <AnalyticsLayout
      title="Earning Programs Analytics"
      description="Affiliate performance, campaign ROI, and submission funnel"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* Affiliate section */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> Affiliate Program
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={affLoading} title="Affiliate Sales" value={(aff?.total_aff_sales ?? 0).toLocaleString()} sub="orders via referral" icon={Share2} iconClass="text-pink-500" />
        <KpiCard loading={affLoading} title="Affiliate Revenue" value={fmt(aff?.total_aff_revenue ?? 0)} sub="from referred sales" icon={TrendingUp} iconClass="text-emerald-500" />
        <KpiCard loading={affLoading} title="Commissions Paid" value={fmt(aff?.total_aff_commissions ?? 0)} icon={TrendingUp} iconClass="text-red-500" />
        <KpiCard loading={affLoading} title="Revenue Contribution" value={`${aff?.revenue_contribution_pct ?? 0}%`} sub="of total sales revenue" icon={TrendingUp} iconClass="text-blue-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Affiliate chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Affiliate Sales Trend</CardTitle>
            <CardDescription>Daily affiliate orders in period</CardDescription>
          </CardHeader>
          <CardContent>
            {affLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={aff?.aff_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="affGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Affiliate Sales"]} />
                  <Area type="monotone" dataKey="sales" stroke="#ec4899" fill="url(#affGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top affiliate earners */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Top Affiliate Earners
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {affLoading ? <div className="p-4"><Skeleton className="h-44 w-full" /></div> : (
              <div className="divide-y divide-border">
                {(aff?.top_affiliates ?? []).map((a, i) => (
                  <div key={a.referred_by_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.referred_by__name || a.referred_by__phone}</p>
                      <p className="text-xs text-muted-foreground">{a.sales_count} sales</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 shrink-0">{fmt(a.earned)}</span>
                  </div>
                ))}
                {(aff?.top_affiliates ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">No affiliate data yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top affiliated products */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Top Affiliated Products by Commission</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {affLoading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(aff?.top_aff_products ?? []).map((p, i) => (
                <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product__name}</p>
                    <p className="text-xs text-muted-foreground">{p.sales_count} sales · Revenue: {fmt(p.revenue)}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 shrink-0">-{fmt(p.commissions)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign section */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Megaphone className="w-3.5 h-3.5" /> Campaigns
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={campLoading} title="Total Campaigns" value={(camp?.total_campaigns ?? 0).toLocaleString()} sub={`${camp?.campaigns_by_status?.running ?? 0} running`} icon={Megaphone} iconClass="text-purple-500" />
        <KpiCard loading={campLoading} title="Total Submissions" value={(camp?.total_submissions ?? 0).toLocaleString()} icon={CheckCircle} iconClass="text-primary" />
        <KpiCard loading={campLoading} title="Approval Rate" value={`${camp?.approval_rate ?? 0}%`} sub={`${camp?.approved ?? 0} approved`} icon={CheckCircle} iconClass="text-emerald-500" />
        <KpiCard loading={campLoading} title="Rewards Paid" value={fmt(camp?.total_rewards_paid ?? 0)} icon={TrendingUp} iconClass="text-amber-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {campLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={submissionPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {submissionPie.map((_, i) => <Cell key={i} fill={SUB_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Cell />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {submissionPie.map((item, i) => (
                <div key={item.name} className="text-center">
                  <div className="text-lg font-bold" style={{ color: SUB_COLORS[i] }}>{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {campLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={camp?.subs_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Submissions"]} />
                  <Area type="monotone" dataKey="submissions" stroke="#8b5cf6" fill="url(#subsGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top campaigns */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Top Campaigns by Participation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campLoading ? <div className="p-4"><Skeleton className="h-40 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(camp?.top_campaigns ?? []).map((c, i) => (
                <div key={c.campaign_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.campaign__name}</p>
                    <p className="text-xs text-muted-foreground">{c.total_subs} submissions · {c.approved_subs} approved</p>
                  </div>
                  <Badge variant={c.approval_rate >= 70 ? "default" : "secondary"} className="shrink-0">
                    {c.approval_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection reasons */}
      {(camp?.rejection_reasons ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Common Rejection Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campLoading ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-2">
                {(camp?.rejection_reasons ?? []).map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">#{i + 1}</span>
                    <span className="flex-1 text-foreground/80">{r.reject_reason}</span>
                    <Badge variant="secondary" className="shrink-0">{r.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AnalyticsLayout>
  );
}
