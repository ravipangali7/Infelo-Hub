import { useNavigate } from "react-router-dom";
import {
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  ClipboardCheck,
  Wallet,
  Megaphone,
  MessageSquare,
  Trophy,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/api/hooks";
import { resolveSmsBalanceDisplay } from "@/lib/smsBalance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, compact = false): string {
  if (compact) {
    if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
    return `रु ${n.toLocaleString()}`;
  }
  return `रु ${n.toLocaleString()}`;
}

function TrendBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  title,
  value,
  sub,
  pct,
  icon: Icon,
  iconClass,
  loading,
}: {
  title: string;
  value: string | number;
  sub: string;
  pct?: number;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${iconClass ?? "text-primary"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{sub}</span>
              {pct !== undefined && <TrendBadge pct={pct} />}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sales pipeline colours ────────────────────────────────────────────────────
const PIPELINE_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  rejected: "#6b7280",
};

const PIPELINE_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

// ── Custom tooltip ────────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-primary">Revenue: {fmt(payload[0]?.value ?? 0)}</p>
      {payload[1] && <p className="text-muted-foreground">Orders: {payload[1].value}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminDashboard();

  const revenue = data?.revenue;
  const users = data?.users;
  const pending = data?.pending_actions;
  const campaigns = data?.campaigns;
  const wallet = data?.wallet_economy;
  const superSettings = data?.super_settings;
  const pipeline = data?.sales_pipeline ?? {};
  const topEarners = data?.top_earners ?? [];
  const revenueChart = data?.revenue_chart ?? [];
  const usersChart = data?.users_chart ?? [];
  const recentTx = data?.recent_transactions ?? [];
  const pkgDist = data?.package_distribution ?? [];
  const smsBalanceDisplay = resolveSmsBalanceDisplay(
    superSettings?.sms_balance_label,
    superSettings?.sms_balance
  );

  // Build pie data from pipeline
  const pipelineData = Object.entries(pipeline).map(([status, vals]) => ({
    name: PIPELINE_LABELS[status] ?? status,
    value: vals.count,
    amount: vals.amount,
    color: PIPELINE_COLORS[status] ?? "#9ca3af",
  }));

  // Pending alerts config
  const alerts = [
    {
      key: "payout_accounts",
      label: "Payout Accounts",
      count: pending?.payout_accounts ?? 0,
      icon: Wallet,
      color: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300",
      path: "/system/payout-accounts",
    },
    {
      key: "deposits",
      label: "Deposits",
      count: pending?.deposits ?? 0,
      amount: pending?.deposit_amount,
      icon: ArrowDownToLine,
      color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
      path: "/system/deposits",
    },
    {
      key: "withdrawals",
      label: "Withdrawals",
      count: pending?.withdrawals ?? 0,
      amount: pending?.withdrawal_amount,
      icon: ArrowUpFromLine,
      color: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300",
      path: "/system/withdrawals",
    },
    {
      key: "kyc",
      label: "KYC Reviews",
      count: pending?.kyc ?? 0,
      icon: ShieldCheck,
      color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300",
      path: "/system/kyc",
    },
    {
      key: "submissions",
      label: "Submissions",
      count: pending?.submissions ?? 0,
      icon: ClipboardCheck,
      color: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300",
      path: "/system/submissions",
    },
    {
      key: "sales",
      label: "New Orders",
      count: pending?.sales ?? 0,
      icon: ShoppingCart,
      color: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300",
      path: "/system/sales",
    },
  ].filter(a => a.count > 0);
  const pendingRows = [
    { key: "kyc", label: "KYC", count: pending?.kyc ?? 0, path: "/system/kyc" },
    { key: "payout_accounts", label: "Payout Account", count: pending?.payout_accounts ?? 0, path: "/system/payout-accounts" },
    { key: "deposits", label: "Deposit", count: pending?.deposits ?? 0, path: "/system/deposits" },
    { key: "withdrawals", label: "Withdrawal", count: pending?.withdrawals ?? 0, path: "/system/withdrawals" },
    { key: "submissions", label: "Campaign Submission", count: pending?.submissions ?? 0, path: "/system/submissions" },
    { key: "sales", label: "Sales", count: pending?.sales ?? 0, path: "/system/sales" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Business Dashboard</h1>
        <p className="text-muted-foreground">Your business at a glance — real-time overview</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4" />
          Failed to load dashboard data. Please refresh or log in as staff.
        </div>
      )}

      {/* ── Alert Strip (Pending Actions) ─────────────────────────────────── */}
      {(alerts.length > 0 || isLoading) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Actions Required
          </p>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))
              : alerts.map(alert => {
                  const Icon = alert.icon;
                  return (
                    <button
                      key={alert.key}
                      onClick={() => navigate(alert.path)}
                      data-track={`dashboard_alert_${alert.key}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer text-left hover:opacity-80 transition-opacity ${alert.color}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{alert.count}</p>
                        <p className="text-xs font-medium">{alert.label}</p>
                        {alert.amount !== undefined && (
                          <p className="text-xs opacity-75">{fmt(alert.amount, true)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {/* ── KPI Cards Row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="Today Revenue"
            value={fmt(revenue?.today ?? 0, true)}
            sub="vs yesterday"
            pct={revenue?.today_vs_yesterday_pct}
            icon={DollarSign}
            iconClass="text-emerald-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="This Week"
            value={fmt(revenue?.week ?? 0, true)}
            sub="vs last week"
            pct={revenue?.week_pct}
            icon={TrendingUp}
            iconClass="text-blue-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="This Month"
            value={fmt(revenue?.month ?? 0, true)}
            sub="vs last month"
            pct={revenue?.month_pct}
            icon={TrendingUp}
            iconClass="text-violet-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="Total Users"
            value={(users?.total ?? 0).toLocaleString()}
            sub={`+${users?.week ?? 0} this week`}
            pct={users?.week_pct}
            icon={Users}
            iconClass="text-sky-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="Active Packages"
            value={(users?.active_packages ?? 0).toLocaleString()}
            sub="users with package"
            icon={Package}
            iconClass="text-amber-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="Campaign Rate"
            value={`${campaigns?.approval_rate ?? 0}%`}
            sub={`${campaigns?.approved_submissions ?? 0} / ${campaigns?.total_submissions ?? 0} approved`}
            icon={Megaphone}
            iconClass="text-pink-500"
          />
        </div>
        <div className="min-w-0">
          <KpiCard
            loading={isLoading}
            title="SMS balance"
            value={smsBalanceDisplay}
            sub={superSettings?.sms_balance_caption ?? "Samaya SMS"}
            icon={MessageSquare}
            iconClass="text-teal-500"
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Super Setting</CardTitle>
          <CardDescription>System balance and SMS status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-7 w-32" /> : (
            <div className="space-y-2">
              <p className="text-2xl font-bold">{fmt(superSettings?.balance ?? 0)}</p>
              <p className="text-xs text-muted-foreground">
                SMS sent: {superSettings?.sms_total ?? 0} | success: {superSettings?.sms_success ?? 0} | failed: {superSettings?.sms_failed ?? 0}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue — Last 7 Days</CardTitle>
            <CardDescription>Daily revenue and order count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={revenueChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" name="Revenue" />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground))" opacity={0.35} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales Pipeline Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Pipeline</CardTitle>
            <CardDescription>Order distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : pipelineData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">No sales yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: { payload?: { amount: number } }) =>
                      [`${value} orders (${fmt(props.payload?.amount ?? 0, true)})`, name]
                    }
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Middle Row: Wallet Economy + User Growth ───────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Wallet Economy */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Wallet Economy
            </CardTitle>
            <CardDescription>Money circulating in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total in wallets</span>
                  <span className="font-bold text-sm">{fmt(wallet?.total ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Earning wallets</span>
                  <span className="text-xs font-medium">{fmt(wallet?.earning ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Top-up wallets</span>
                  <span className="text-xs font-medium">{fmt(wallet?.topup ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t mt-2">
                  <span className="text-xs text-amber-600 dark:text-amber-400">Pending deposits in</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{fmt(wallet?.pending_deposits ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-red-500">Pending payouts out</span>
                  <span className="text-xs font-medium text-red-500">{fmt(wallet?.pending_withdrawals ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t">
                  <span className="text-xs text-muted-foreground">Total deposited</span>
                  <span className="text-xs font-medium">{fmt(wallet?.approved_deposits ?? 0, true)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total paid out</span>
                  <span className="text-xs font-medium">{fmt(wallet?.approved_withdrawals ?? 0, true)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">New Users — Last 7 Days</CardTitle>
            <CardDescription>Daily registration count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={usersChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, "New Users"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Transactions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>Last 10 system transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><Skeleton className="h-40 w-full" /></div>
            ) : recentTx.length === 0 ? (
              <p className="text-muted-foreground text-sm p-4">No transactions yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${tx.transaction_type === "added" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {tx.user__name || tx.user__phone || `User #${tx.user_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {tx.transaction_for?.replace("_", " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${tx.transaction_type === "added" ? "text-emerald-600" : "text-red-500"}`}>
                        {tx.transaction_type === "added" ? "+" : "-"}{fmt(tx.amount, true)}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Top Earners + Package Dist */}
        <div className="space-y-4">
          {/* Top Earners */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Top Earners
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {isLoading ? (
                <Skeleton className="h-28 w-full" />
              ) : topEarners.length === 0 ? (
                <p className="text-xs text-muted-foreground">No earner data yet.</p>
              ) : (
                topEarners.map((u, i) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {(u.name || u.phone).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{u.name || u.phone}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">{fmt(u.earning_wallet, true)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Package Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Package Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : pkgDist.length === 0 ? (
                <p className="text-xs text-muted-foreground">No packages assigned.</p>
              ) : (
                pkgDist.map(pkg => {
                  const total = pkgDist.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((pkg.count / total) * 100) : 0;
                  return (
                    <div key={pkg.package__name} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[120px]">{pkg.package__name}</span>
                        <span className="text-muted-foreground">{pkg.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Requests</CardTitle>
          <CardDescription>Review pending requests by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="kyc" className="w-full">
            <TabsList className="w-full flex-wrap h-auto">
              {pendingRows.map((row) => (
                <TabsTrigger key={row.key} value={row.key} className="text-xs">
                  {row.label} ({row.count})
                </TabsTrigger>
              ))}
            </TabsList>
            {pendingRows.map((row) => (
              <TabsContent key={row.key} value={row.key} className="mt-4">
                <div className="rounded-md border p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-sm text-muted-foreground">{row.count} pending request(s)</p>
                  </div>
                  <button
                    type="button"
                    className="text-sm underline text-primary"
                    onClick={() => navigate(row.path)}
                  >
                    Open queue
                  </button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
