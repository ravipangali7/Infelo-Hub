import { useState } from "react";
import { MousePointerClick, Monitor, Globe, Clock, Users, RefreshCw, Trophy, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsBehaviour, useAnalyticsRetention } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const DEVICE_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];

function fmtSec(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  return `${s.toFixed(0)}s`;
}

export default function BehaviourAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data: beh, isLoading: behLoading } = useAnalyticsBehaviour(range.from, range.to);
  const { data: ret, isLoading: retLoading } = useAnalyticsRetention(range.from, range.to);

  const deviceData = (beh?.device_distribution ?? []).map(d => ({
    name: d.device_type || "Unknown",
    value: d.count,
  }));

  return (
    <AnalyticsLayout
      title="Behaviour & Retention Analytics"
      description="Sessions, device breakdown, top pages, events, and user retention"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* Behaviour KPIs */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5" /> Consumer Behaviour
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={behLoading} title="Total Sessions" value={(beh?.total_sessions ?? 0).toLocaleString()} sub="unique sessions" icon={Activity} iconClass="text-primary" />
        <KpiCard loading={behLoading} title="Total Events" value={(beh?.total_events ?? 0).toLocaleString()} icon={MousePointerClick} iconClass="text-blue-500" />
        <KpiCard loading={behLoading} title="Avg Session Duration" value={fmtSec(beh?.avg_session_duration_sec ?? 0)} icon={Clock} iconClass="text-emerald-500" />
        <KpiCard loading={behLoading} title="Guest Sessions" value={(beh?.guest_sessions ?? 0).toLocaleString()} sub={`${beh?.auth_sessions ?? 0} logged in`} icon={Users} iconClass="text-amber-500" />
      </div>

      {/* Sessions chart + Device dist */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Sessions Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {behLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={beh?.sessions_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, "Sessions"]} />
                  <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="url(#sessGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {behLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {deviceData.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
              {deviceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                  {d.name}: <strong className="text-foreground ml-1">{d.value}</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OS + Browser */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operating Systems</CardTitle>
          </CardHeader>
          <CardContent>
            {behLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={beh?.os_distribution ?? []} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="os_name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            {behLoading ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={beh?.browser_distribution ?? []} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="browser_name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peak hours */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Peak Traffic Hours</CardTitle>
          <CardDescription>Event count by hour of day (24h)</CardDescription>
        </CardHeader>
        <CardContent>
          {behLoading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={beh?.peak_hours ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={h => `${h}h`} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number, _, { payload }) => [v, `Hour ${payload?.hour}`]} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top pages + Top events */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Pages</CardTitle>
            <CardDescription>Most visited paths</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {behLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
              <div className="divide-y divide-border">
                {(beh?.top_pages ?? []).slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.page_path}</p>
                      <p className="text-xs text-muted-foreground">Avg {fmtSec(p.avg_time)} · {p.avg_scroll}% scroll</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{p.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Events</CardTitle>
            <CardDescription>Most triggered user actions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {behLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
              <div className="divide-y divide-border">
                {(beh?.top_events ?? []).slice(0, 8).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium truncate">{e.event_name}</p>
                    <Badge variant="secondary" className="shrink-0">{e.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform distribution */}
      {(beh?.platform_distribution ?? []).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Platform Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(beh?.platform_distribution ?? []).map(p => {
                const total = (beh?.total_events ?? 1);
                const pct = Math.round(p.count / total * 100);
                return (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{p.platform || "Unknown"}</span>
                      <span className="font-medium">{p.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention section */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retention & Engagement
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={retLoading} title="MAU" value={(ret?.mau ?? 0).toLocaleString()} sub="Monthly Active Users" icon={Users} iconClass="text-primary" />
        <KpiCard loading={retLoading} title="Repeat Buyers" value={(ret?.repeat_buyers ?? 0).toLocaleString()} sub=">1 order in period" icon={RefreshCw} iconClass="text-emerald-500" />
        <KpiCard loading={retLoading} title="Avg Orders/User" value={ret?.avg_orders_per_user ?? 0} sub="in period" icon={Activity} iconClass="text-blue-500" />
        <KpiCard loading={retLoading} title="Avg Deposits/User" value={ret?.avg_deposits_per_user ?? 0} sub="in period" icon={Activity} iconClass="text-amber-500" />
      </div>

      {/* DAU trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Daily Active Users — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {retLoading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={ret?.dau_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "DAU"]} />
                <Area type="monotone" dataKey="dau" stroke="#0ea5e9" fill="url(#dauGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Dormant users */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {[
          { label: "Dormant 30 Days", value: ret?.dormant?.["30_days"] ?? 0, color: "text-amber-500" },
          { label: "Dormant 60 Days", value: ret?.dormant?.["60_days"] ?? 0, color: "text-orange-500" },
          { label: "Dormant 90 Days", value: ret?.dormant?.["90_days"] ?? 0, color: "text-red-500" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6 text-center">
              <div className={`text-3xl font-bold ${item.color}`}>{retLoading ? "—" : item.value.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">(no activity)</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* High value customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> High Value Customers
          </CardTitle>
          <CardDescription>Top 10 by total spend (delivered orders)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {retLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(ret?.high_value_customers ?? []).map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.user__name || u.user__phone}</p>
                    <p className="text-xs text-muted-foreground">{u.order_count} orders</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">
                    रु {u.total_spent.toLocaleString()}
                  </span>
                </div>
              ))}
              {(ret?.high_value_customers ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No delivered orders yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
