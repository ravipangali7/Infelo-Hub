import { useState } from "react";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/admin/KpiCard";
import { DateRangePicker, defaultRange, type DateRange } from "@/components/admin/DateRangePicker";
import { AnalyticsLayout } from "@/components/admin/AnalyticsLayout";
import { useAnalyticsFinance } from "@/api/hooks";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `रु ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `रु ${(n / 1_000).toFixed(1)}K`;
  return `रु ${n.toLocaleString()}`;
}

const METHOD_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];

const TX_FOR_LABELS: Record<string, string> = {
  deposit: "Deposit", withdrawal: "Withdrawal", package: "Package",
  task_reward: "Task Reward", earning: "Earning", paid: "Paid",
  received: "Received", order: "Order", buying_reward: "Buying Reward",
  system_withdrawal: "System Withdrawal",
};

export default function FinanceAnalytics() {
  const [range, setRange] = useState<DateRange>(defaultRange(30));
  const { data, isLoading } = useAnalyticsFinance(range.from, range.to);

  const pnl = data?.pnl;
  const wallet = data?.wallet_economy;
  const cashFlow = data?.cash_flow;

  const txCategoryData = (data?.tx_by_category ?? []).map(t => ({
    name: TX_FOR_LABELS[t.transaction_for] ?? t.transaction_for,
    count: t.count,
    amount: t.amount,
  }));

  return (
    <AnalyticsLayout
      title="Finance Analytics"
      description="Wallet economy, deposits, withdrawals, P&L statement, and cash flow"
      actions={<DateRangePicker value={range} onChange={setRange} />}
    >
      {/* Wallet Economy */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> Wallet Economy
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={isLoading} title="Total User Wallets" value={fmt(wallet?.total ?? 0)} sub="earning + top-up" icon={Wallet} iconClass="text-primary" />
        <KpiCard loading={isLoading} title="Earning Wallets" value={fmt(wallet?.earning ?? 0)} icon={Wallet} iconClass="text-emerald-500" />
        <KpiCard loading={isLoading} title="Top-up Wallets" value={fmt(wallet?.topup ?? 0)} icon={Wallet} iconClass="text-blue-500" />
        <KpiCard loading={isLoading} title="User Liability" value={fmt(wallet?.liability ?? 0)} sub="outstanding balance" icon={Wallet} iconClass="text-red-500" />
      </div>

      {/* Deposits & Withdrawals */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <ArrowDownToLine className="w-3.5 h-3.5" /> Deposits & Withdrawals (Period)
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard loading={isLoading} title="Deposits Approved" value={fmt(data?.deposits.approved ?? 0)} icon={ArrowDownToLine} iconClass="text-emerald-500" />
        <KpiCard loading={isLoading} title="Deposits Pending" value={fmt(data?.deposits.pending ?? 0)} icon={ArrowDownToLine} iconClass="text-amber-500" />
        <KpiCard loading={isLoading} title="Withdrawals Approved" value={fmt(data?.withdrawals.approved ?? 0)} icon={ArrowUpFromLine} iconClass="text-red-500" />
        <KpiCard loading={isLoading} title="Withdrawals Pending" value={fmt(data?.withdrawals.pending ?? 0)} icon={ArrowUpFromLine} iconClass="text-orange-500" />
      </div>

      {/* Deposit/Withdrawal charts + method split */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit vs Withdrawal Trend</CardTitle>
            <CardDescription>Approved amounts over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (() => {
              const merged = (data?.dep_chart ?? []).map((d, i) => ({
                date: d.date,
                deposits: d.deposits as number,
                withdrawals: (data?.wdr_chart?.[i]?.withdrawals ?? 0) as number,
              }));
              return (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={merged} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="wdrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number, n: string) => [fmt(v), n === "deposits" ? "Deposits" : "Withdrawals"]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="deposits" stroke="#10b981" fill="url(#depGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="withdrawals" stroke="#ef4444" fill="url(#wdrGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit Method Split</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={data?.deposits.by_method ?? []} cx="50%" cy="50%" outerRadius={75} dataKey="amount" nameKey="payment_method" paddingAngle={3}>
                    {(data?.deposits.by_method ?? []).map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [fmt(v), n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> P&L Statement (Period)
        </p>
      </div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className="space-y-3">
              {[
                { label: "Sales Revenue", value: pnl?.sales_revenue ?? 0, type: "income" },
                { label: "Purchase Cost", value: -(pnl?.purchase_cost ?? 0), type: "expense" },
                { label: "Gross Profit", value: pnl?.gross_profit ?? 0, type: "total", bold: true },
                { label: "Affiliation Commissions", value: -(pnl?.affiliation_commissions ?? 0), type: "expense" },
                { label: "Campaign Rewards", value: -(pnl?.campaign_rewards ?? 0), type: "expense" },
                { label: "Total Expenses", value: -(pnl?.total_expenses ?? 0), type: "total" },
                { label: "Net Profit", value: pnl?.net_profit ?? 0, type: "net", bold: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between items-center py-2 ${row.bold ? "border-t border-border font-bold text-base" : "text-sm"}`}>
                  <span className={row.type === "expense" ? "text-muted-foreground" : ""}>{row.label}</span>
                  <span className={
                    row.type === "net"
                      ? (row.value >= 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold")
                      : row.type === "income" ? "text-emerald-600"
                      : row.type === "expense" ? "text-red-500"
                      : ""
                  }>
                    {row.value >= 0 ? fmt(row.value) : `-${fmt(Math.abs(row.value))}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cash Flow (Period)</p>
      </div>
      <div className="grid gap-4 grid-cols-3 mb-6">
        <Card className="border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Cash In</span>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-emerald-600">{fmt(cashFlow?.cash_in ?? 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpFromLine className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Cash Out</span>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-red-500">{fmt(cashFlow?.cash_out ?? 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Net Flow</span>
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold ${(cashFlow?.net ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {fmt(cashFlow?.net ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction category breakdown */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Transactions by Category (Period)
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={txCategoryData} layout="vertical" margin={{ left: 90 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip formatter={(v: number, n: string) => [n === "count" ? v : fmt(v), n === "count" ? "Count" : "Amount"]} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </AnalyticsLayout>
  );
}
