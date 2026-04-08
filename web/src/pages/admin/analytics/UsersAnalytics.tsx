import { useState } from "react";
import { Users, ShieldCheck, Package, Wallet, AlertTriangle, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsUsers } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  freeze: "#f59e0b",
  deactivate: "#ef4444",
};

const KYC_COLORS = ["#f59e0b", "#10b981", "#ef4444"];

export default function UsersAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data, isLoading } = useAnalyticsUsers(range.from, range.to);

  const kycData = [
    { name: "Pending", value: data?.kyc.pending ?? 0 },
    { name: "Approved", value: data?.kyc.approved ?? 0 },
    { name: "Rejected", value: data?.kyc.rejected ?? 0 },
  ];

  return (
    <AnalyticsLayout
      title="User & Member Analytics"
      description="KYC funnel, status distribution, engagement, and top members"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={isLoading} title="Total Users" value={(data?.total ?? 0).toLocaleString()} sub="all time" icon={Users} iconClass="text-sky-500" />
        <KpiCard loading={isLoading} title="New This Period" value={(data?.new_in_period.value ?? 0).toLocaleString()} sub="vs previous" pct={data?.new_in_period.pct} icon={Users} iconClass="text-emerald-500" />
        <KpiCard loading={isLoading} title="KYC Approval Rate" value={`${data?.kyc.approval_rate ?? 0}%`} sub={`${data?.kyc.approved ?? 0} approved`} icon={ShieldCheck} iconClass="text-violet-500" />
        <KpiCard loading={isLoading} title="With Package" value={(data?.with_package ?? 0).toLocaleString()} sub={`${data?.without_package ?? 0} without`} icon={Package} iconClass="text-amber-500" />
        <KpiCard loading={isLoading} title="Wallet Frozen" value={(data?.wallet_frozen ?? 0).toLocaleString()} sub="accounts restricted" icon={Wallet} iconClass="text-red-500" />
        <KpiCard loading={isLoading} title="Dormant 90d" value={(data?.dormant_90_days ?? 0).toLocaleString()} sub="no activity in 90 days" icon={AlertTriangle} iconClass="text-orange-500" />
        <KpiCard loading={isLoading} title="Avg Earning Wallet" value={`रु ${(data?.avg_earning_wallet ?? 0).toLocaleString()}`} sub="users with balance > 0" icon={Wallet} iconClass="text-green-500" />
        <KpiCard loading={isLoading} title="KYC Pending" value={(data?.kyc.pending ?? 0).toLocaleString()} sub="awaiting review" icon={ShieldCheck} iconClass="text-yellow-500" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* KYC Funnel Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KYC Status Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={kycData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {kycData.map((_, i) => <Cell key={i} fill={KYC_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={data?.status_distribution ?? []} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.status_distribution ?? []).map((row, i) => (
                      <Cell key={i} fill={STATUS_COLORS[row.status] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Package split */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Package Activation</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="space-y-4 pt-6">
                {[
                  { label: "With Package", value: data?.with_package ?? 0, color: "bg-emerald-500" },
                  { label: "Without Package", value: data?.without_package ?? 0, color: "bg-muted" },
                ].map(item => {
                  const total = (data?.with_package ?? 0) + (data?.without_package ?? 0);
                  const pct = total > 0 ? Math.round(item.value / total * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User growth trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">New User Registrations</CardTitle>
          <CardDescription>Daily registrations over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={data?.users_chart ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="userAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "New Users"]} />
                <Area type="monotone" dataKey="users" stroke="#0ea5e9" fill="url(#userAreaGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Top Users by Earning Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-4"><Skeleton className="h-48 w-full" /></div> : (
            <div className="divide-y divide-border">
              {(data?.top_users ?? []).map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(u.name || u.phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name || u.phone}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600">रु {u.earning_wallet.toLocaleString()}</p>
                    <Badge variant={u.kyc_status === "approved" ? "default" : "secondary"} className="text-[9px] px-1 py-0 h-3.5">
                      {u.kyc_status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(data?.top_users ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground p-4">No user data yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
