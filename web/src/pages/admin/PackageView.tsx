import { useParams, Link } from "react-router-dom";
import { useAdminPackage } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin";
import { ArrowLeft, Edit, Package, DollarSign, TrendingUp, Users, Layers } from "lucide-react";

const LEVEL_LABELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7"] as const;
const LEVEL_KEYS = ["level_one", "level_two", "level_three", "level_four", "level_five", "level_six", "level_seven"] as const;

export default function PackageView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: pkg, isLoading, error } = useAdminPackage(pid);

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !pkg) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (error || !pkg) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/packages">Back</Link></div>
  );

  const totalLevelRewards = LEVEL_KEYS.reduce((sum, k) => sum + Number(pkg[k]), 0);
  const productCount = pkg.products?.length ?? 0;
  const bundleValue = pkg.products?.reduce((s, p) => s + Number(p.total), 0) ?? 0;
  const netAmount = Number(pkg.amount) - Number(pkg.discount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/packages"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Packages</Button></Link>
          <h1 className="text-3xl font-bold">{pkg.name}</h1>
          <p className="text-muted-foreground">Package #{pkg.id} · {productCount} bundled products</p>
        </div>
        <Link to={`/system/packages/${pkg.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Package Price</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">रु {Number(pkg.amount).toLocaleString()}</p>
                {Number(pkg.discount) > 0 && (
                  <p className="text-xs text-orange-600">Net: रु {netAmount.toLocaleString()}</p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Discount</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">रु {Number(pkg.discount).toLocaleString()}</p>
              </div>
              <Layers className="h-8 w-8 text-orange-200 dark:text-orange-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Direct Referral</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">रु {Number(pkg.direct_referral).toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Level Rewards</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">रु {totalLevelRewards.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Across 7 levels</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Level Rewards Table */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />MLM Level Rewards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-1 border-b font-medium text-sm">
              <span>Direct Referral</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">रु {Number(pkg.direct_referral).toLocaleString()}</span>
            </div>
            {LEVEL_KEYS.map((k, i) => (
              <div key={k} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{LEVEL_LABELS[i]}</span>
                <span className={`text-sm font-medium ${Number(pkg[k]) > 0 ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}>
                  {Number(pkg[k]) > 0 ? `रु ${Number(pkg[k]).toLocaleString()}` : "—"}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Reward Pool</span>
                <span className="font-bold text-purple-700 dark:text-purple-400">
                  रु {(Number(pkg.direct_referral) + totalLevelRewards).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((Number(pkg.direct_referral) + totalLevelRewards) / Math.max(Number(pkg.amount), 1) * 100).toFixed(1)}% of package price
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Package pricing summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Package Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${pkg.id}`],
              ["Name", pkg.name],
              ["Price", `रु ${Number(pkg.amount).toLocaleString()}`],
              ["Discount", `रु ${Number(pkg.discount).toLocaleString()}`],
              ["Net Price", `रु ${netAmount.toLocaleString()}`],
              ["Direct Referral", `रु ${Number(pkg.direct_referral).toLocaleString()}`],
              ["Total Level Pool", `रु ${totalLevelRewards.toLocaleString()}`],
              ["Bundle Products", String(productCount)],
              ["Bundle Value", `रु ${bundleValue.toLocaleString()}`],
              ["Created", new Date(pkg.created_at).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bundle Products */}
      {pkg.products && pkg.products.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0" />Bundled Products ({productCount})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                { id: "product", label: "Product", render: (line) => <span className="font-medium">{line.product_name}</span> },
                {
                  id: "price",
                  label: "Unit Price",
                  render: (line) => <span className="md:text-right block">रु {Number(line.selling_price).toLocaleString()}</span>,
                },
                {
                  id: "qty",
                  label: "Qty",
                  render: (line) => <span className="md:text-right block">{line.quantity}</span>,
                },
                {
                  id: "total",
                  label: "Line Total",
                  render: (line) => <span className="md:text-right block font-bold">रु {Number(line.total).toLocaleString()}</span>,
                },
                {
                  id: "link",
                  label: "Link",
                  render: (line) => (
                    <Link to={`/system/products/${line.product}`} className="text-primary underline text-xs">View</Link>
                  ),
                },
              ]}
              data={pkg.products}
              keyFn={(line) => line.id}
            />
            <div className="p-4 border-t flex justify-end">
              <Badge variant="outline" className="text-sm">Bundle Total: रु {bundleValue.toLocaleString()}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
