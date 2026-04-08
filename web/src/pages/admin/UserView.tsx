import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAdminUser, useAdminDeleteUser, useAdminDepositList, useAdminWithdrawalList, useAdminTransactionList, useAdminSalesList } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AdminDataTable } from "@/components/admin";
import { ArrowLeft, Edit, Wallet, TrendingUp, TrendingDown, ShoppingCart, Users, Package, CheckCircle2, XCircle, Clock, Shield } from "lucide-react";

const kycColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
const statusColor = (s: string) => s === "active" ? "default" : "secondary";
const txTypeColor = (t: string) => t === "added" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";

export default function UserView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = id ? parseInt(id, 10) : null;
  const { data: user, isLoading, error } = useAdminUser(userId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMut = useAdminDeleteUser();
  const { toast } = useToast();

  // Fetch related data (limited to 5 each for dashboard)
  const userParam = userId ? { user: String(userId), page_size: 5, page: 1 } : undefined;
  const { data: depositsData } = useAdminDepositList(userParam);
  const { data: withdrawalsData } = useAdminWithdrawalList(userParam);
  const { data: transactionsData } = useAdminTransactionList(userParam);
  const { data: salesData } = useAdminSalesList(userParam);

  if (!userId || isNaN(userId)) return (
    <div className="space-y-2"><p className="text-destructive">Invalid user ID.</p><Link to="/system/users">Back</Link></div>
  );
  if (isLoading && !user) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 md:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );
  if (error || !user) return (
    <div className="space-y-2"><p className="text-destructive">Failed to load user.</p><Link to="/system/users">Back</Link></div>
  );

  const deposits = depositsData?.results ?? [];
  const withdrawals = withdrawalsData?.results ?? [];
  const transactions = transactionsData?.results ?? [];
  const sales = salesData?.results ?? [];
  const totalDeposits = deposits.reduce((s, d) => s + (d.status === "approved" ? Number(d.amount) : 0), 0);
  const totalWithdrawals = withdrawals.reduce((s, w) => s + (w.status === "approved" ? Number(w.amount) : 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending").length;

  // Remaining to receive = total sales revenue minus already-paid portion (from summary covering all user sales)
  const salesSummary = salesData?.summary as { revenue?: number; paid_revenue?: number } | undefined;
  const totalSalesRevenue = Number(salesSummary?.revenue ?? 0);
  const paidSalesRevenue = Number(salesSummary?.paid_revenue ?? 0);
  const remainingToReceive = Math.max(0, totalSalesRevenue - paidSalesRevenue);

  // Remaining to pay = sum of pending withdrawal requests for this user (from summary covering all user withdrawals)
  const withdrawalSummary = withdrawalsData?.summary as { pending_amount?: number } | undefined;
  const remainingToPay = Number(withdrawalSummary?.pending_amount ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/users"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Users</Button></Link>
          <h1 className="text-3xl font-bold">{user.name || user.phone}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-muted-foreground">{user.phone}</span>
            {user.email && <span className="text-muted-foreground">· {user.email}</span>}
            <Badge variant={kycColor(user.kyc_status)}>{user.kyc_status}</Badge>
            <Badge variant={statusColor(user.status)}>{user.status}</Badge>
            {user.is_staff && <Badge variant="outline" className="text-orange-600 border-orange-400"><Shield className="h-3 w-3 mr-1 inline" />Staff</Badge>}
            {!user.is_active && <Badge variant="destructive">Inactive</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/users/${user.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Earning Wallet</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  रु {Number(user.earning_wallet).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Topup Wallet</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                  रु {Number(user.topup_wallet).toLocaleString()}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved Deposits</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                  रु {totalDeposits.toLocaleString()}
                </p>
                {pendingDeposits > 0 && <p className="text-xs text-amber-600">{pendingDeposits} pending</p>}
              </div>
              <TrendingDown className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved Withdrawals</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">
                  रु {totalWithdrawals.toLocaleString()}
                </p>
                {pendingWithdrawals > 0 && <p className="text-xs text-amber-600">{pendingWithdrawals} pending</p>}
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200 dark:text-orange-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remaining to Pay / Receive */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining to Pay (to User)</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                  रु {remainingToPay.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pending withdrawal requests</p>
              </div>
              <TrendingDown className="h-8 w-8 text-rose-200 dark:text-rose-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining to Receive (from User)</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                  रु {remainingToReceive.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Unpaid orders · Total रु {totalSalesRevenue.toLocaleString()} · Paid रु {paidSalesRevenue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-200 dark:text-amber-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile + KYC */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${user.id}`],
              ["Phone", user.phone],
              ["Name", user.name || "—"],
              ["Email", user.email || "—"],
              ["Status", user.status],
              ["Wallet Frozen", user.is_wallet_freeze ? "Yes" : "No"],
              ["Staff", user.is_staff ? "Yes" : "No"],
              ["Active", user.is_active ? "Yes" : "No"],
              ["Referred By", user.referred_by ? (user.referred_by_name || `User #${user.referred_by}`) : "—"],
              ["Package", user.package_name || "None"],
              ["Joined", user.joined_at ? new Date(user.joined_at).toLocaleString() : "—"],
              ["Activated", user.activated_at ? new Date(user.activated_at).toLocaleString() : "—"],
              ["Created", new Date(user.created_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
            {user.referred_by && (
              <Link to={`/system/users/${user.referred_by}`} className="text-xs text-primary underline">
                View referrer
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" />KYC Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-sm">KYC Status</span>
              <Badge variant={kycColor(user.kyc_status)} className="capitalize">
                {user.kyc_status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                {user.kyc_status === "rejected" && <XCircle className="h-3 w-3 mr-1 inline" />}
                {user.kyc_status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                {user.kyc_status}
              </Badge>
            </div>
            {user.kyc_reject_reason && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 text-sm text-red-700 dark:text-red-300">
                <strong>Reject reason:</strong> {user.kyc_reject_reason}
              </div>
            )}
            {user.kyc_document_front_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Front Document</p>
                <a href={user.kyc_document_front_url} target="_blank" rel="noopener noreferrer">
                  <img src={user.kyc_document_front_url} alt="KYC front" className="max-h-40 rounded border object-cover" />
                </a>
              </div>
            )}
            {user.kyc_document_back_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Back Document</p>
                <a href={user.kyc_document_back_url} target="_blank" rel="noopener noreferrer">
                  <img src={user.kyc_document_back_url} alt="KYC back" className="max-h-40 rounded border object-cover" />
                </a>
              </div>
            )}
            {!user.kyc_document_front_url && !user.kyc_document_back_url && (
              <p className="text-sm text-muted-foreground">No KYC documents uploaded.</p>
            )}
            <div className="pt-2">
              <Link to={`/system/kyc?search=${user.phone}`}>
                <Button variant="outline" size="sm" className="w-full">View in KYC Queue</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Deposits (5 recent)</p>
            <p className="text-xl font-bold mt-1">{depositsData?.count ?? 0} deposits</p>
            <p className="text-xs text-muted-foreground">{deposits.filter(d => d.status === "approved").length} approved · {deposits.filter(d => d.status === "pending").length} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Withdrawals (5 recent)</p>
            <p className="text-xl font-bold mt-1">{withdrawalsData?.count ?? 0} withdrawals</p>
            <p className="text-xs text-muted-foreground">{withdrawals.filter(w => w.status === "approved").length} approved · {withdrawals.filter(w => w.status === "pending").length} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Orders</p>
            <p className="text-xl font-bold mt-1">{salesData?.count ?? 0} orders</p>
            <p className="text-xs text-muted-foreground">{sales.filter(s => s.status === "delivered").length} delivered recently</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Transactions</p>
            <p className="text-xl font-bold mt-1">{transactionsData?.count ?? 0} total</p>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.transaction_type === "added").length} credits ·&nbsp;
              {transactions.filter(t => t.transaction_type === "deducted").length} debits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link to={`/system/transactions?search=${user.phone}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "ID",
                  render: (tx) => (
                    <Link to={`/system/transactions/${tx.id}`} className="text-primary underline">#{tx.id}</Link>
                  ),
                },
                {
                  id: "amount",
                  label: "Amount",
                  render: (tx) => (
                    <span className={`font-medium ${txTypeColor(tx.transaction_type)}`}>
                      {tx.transaction_type === "added" ? "+" : "-"}रु {Number(tx.amount).toLocaleString()}
                    </span>
                  ),
                },
                {
                  id: "type",
                  label: "Type",
                  render: (tx) => (
                    <Badge variant={tx.transaction_type === "added" ? "default" : "destructive"} className="text-xs">
                      {tx.transaction_type_display || tx.transaction_type}
                    </Badge>
                  ),
                },
                {
                  id: "for",
                  label: "For",
                  render: (tx) => (
                    <span className="capitalize text-xs">{tx.transaction_for_display || tx.transaction_for || "—"}</span>
                  ),
                },
                {
                  id: "status",
                  label: "Status",
                  render: (tx) => (
                    <Badge variant={tx.status === "success" ? "default" : "secondary"} className="text-xs">{tx.status}</Badge>
                  ),
                },
                {
                  id: "date",
                  label: "Date",
                  render: (tx) => <span className="text-xs">{new Date(tx.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={transactions}
              keyFn={(tx) => tx.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Deposits */}
      {deposits.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Deposits</CardTitle>
            <Link to={`/system/deposits?search=${user.phone}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "ID",
                  render: (d) => (
                    <Link to={`/system/deposits/${d.id}`} className="text-primary underline">#{d.id}</Link>
                  ),
                },
                {
                  id: "amount",
                  label: "Amount",
                  render: (d) => (
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">रु {Number(d.amount).toLocaleString()}</span>
                  ),
                },
                {
                  id: "method",
                  label: "Method",
                  render: (d) => <span className="capitalize text-xs">{d.payment_method_display || d.payment_method}</span>,
                },
                {
                  id: "status",
                  label: "Status",
                  render: (d) => (
                    <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {d.status}
                    </Badge>
                  ),
                },
                {
                  id: "date",
                  label: "Date",
                  render: (d) => <span className="text-xs">{new Date(d.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={deposits}
              keyFn={(d) => d.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Withdrawals */}
      {withdrawals.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Withdrawals</CardTitle>
            <Link to={`/system/withdrawals?search=${user.phone}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "ID",
                  render: (w) => (
                    <Link to={`/system/withdrawals/${w.id}`} className="text-primary underline">#{w.id}</Link>
                  ),
                },
                {
                  id: "amount",
                  label: "Amount",
                  render: (w) => (
                    <span className="font-medium text-orange-700 dark:text-orange-400">रु {Number(w.amount).toLocaleString()}</span>
                  ),
                },
                {
                  id: "method",
                  label: "Method",
                  render: (w) => <span className="capitalize text-xs">{w.payment_method_display || w.payment_method}</span>,
                },
                {
                  id: "status",
                  label: "Status",
                  render: (w) => (
                    <Badge variant={w.status === "approved" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                      {w.status}
                    </Badge>
                  ),
                },
                {
                  id: "date",
                  label: "Date",
                  render: (w) => <span className="text-xs">{new Date(w.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={withdrawals}
              keyFn={(w) => w.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {sales.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 shrink-0" />Recent Orders</CardTitle>
            <Link to={`/system/sales?search=${user.phone}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "id",
                  label: "Order ID",
                  render: (s) => (
                    <Link to={`/system/sales/${s.id}`} className="text-primary underline">#{s.id}</Link>
                  ),
                },
                {
                  id: "total",
                  label: "Total",
                  render: (s) => <span className="font-medium">रु {Number(s.total).toLocaleString()}</span>,
                },
                {
                  id: "status",
                  label: "Status",
                  render: (s) => <Badge variant="secondary" className="text-xs capitalize">{s.status}</Badge>,
                },
                {
                  id: "payment",
                  label: "Payment",
                  render: (s) => <Badge variant={s.payment_status === "paid" ? "default" : "secondary"} className="text-xs">{s.payment_status}</Badge>,
                },
                {
                  id: "date",
                  label: "Date",
                  render: (s) => <span className="text-xs">{new Date(s.created_at).toLocaleDateString()}</span>,
                },
              ]}
              data={sales}
              keyFn={(s) => s.id}
            />
          </CardContent>
        </Card>
      )}

      {/* Package info */}
      {user.package && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-4 flex items-center gap-4">
            <Package className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Package</p>
              <p className="text-xl font-bold">{user.package_name}</p>
            </div>
            <Link to={`/system/packages/${user.package}`} className="ml-auto">
              <Button variant="outline" size="sm">View Package</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {user.name || user.phone} and related data (wallets, requests, addresses, etc.). You cannot delete your own account from here. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMut.mutate(user.id, {
                  onSuccess: () => {
                    toast({ title: "User deleted" });
                    navigate("/system/users");
                  },
                  onError: () => toast({ variant: "destructive", title: "Failed to delete user" }),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
