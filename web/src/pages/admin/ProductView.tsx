import { useParams, Link } from "react-router-dom";
import { useAdminProduct } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Tag, Layers, TrendingUp, Package, ImageIcon, Star } from "lucide-react";

export default function ProductView() {
  const { id } = useParams<{ id: string }>();
  const pid = id ? parseInt(id, 10) : null;
  const { data: p, isLoading, error } = useAdminProduct(pid);

  if (!pid || isNaN(pid)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !p) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 md:grid-cols-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
    </div>
  );
  if (error || !p) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/products">Back</Link></div>
  );

  const margin = Number(p.selling_price) - Number(p.purchasing_price);
  const marginPct = Number(p.purchasing_price) > 0
    ? ((margin / Number(p.purchasing_price)) * 100).toFixed(1)
    : "0";

  let effectivePrice = Number(p.selling_price);
  if (p.discount_type === "flat") effectivePrice -= Number(p.discount);
  else if (p.discount_type === "percentage") effectivePrice = effectivePrice * (1 - Number(p.discount) / 100);

  const stockHealth = p.stock > 50 ? "good" : p.stock > 10 ? "low" : "critical";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/products"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Products</Button></Link>
          <div className="flex items-center gap-3">
            {p.image_url && <img src={p.image_url} alt="" className="h-16 w-16 rounded-lg border object-cover" />}
            <div>
              <h1 className="text-3xl font-bold">{p.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {p.sku && <Badge variant="outline" className="font-mono">SKU: {p.sku}</Badge>}
                <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                {p.is_featured && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                    Featured
                  </Badge>
                )}
                {p.category_name && <Badge variant="outline">{p.category_name}</Badge>}
                {p.vendor_name && <Badge variant="outline">{p.vendor_name}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/products/${p.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Selling Price</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  रु {Number(p.selling_price).toLocaleString()}
                </p>
                {Number(p.discount) > 0 && (
                  <p className="text-xs text-orange-600">After discount: रु {effectivePrice.toLocaleString()}</p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Purchasing Price</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                  रु {Number(p.purchasing_price).toLocaleString()}
                </p>
              </div>
              <Tag className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${margin >= 0 ? "border-l-purple-500" : "border-l-red-500"}`}>
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross Margin</p>
                <p className={`text-2xl font-bold mt-1 ${margin >= 0 ? "text-purple-700 dark:text-purple-400" : "text-red-700 dark:text-red-400"}`}>
                  रु {margin.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{marginPct}% margin</p>
              </div>
              <Layers className="h-8 w-8 text-purple-200 dark:text-purple-900" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${stockHealth === "good" ? "border-l-emerald-500" : stockHealth === "low" ? "border-l-amber-500" : "border-l-red-500"}`}>
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Stock</p>
                <p className={`text-2xl font-bold mt-1 ${stockHealth === "good" ? "text-emerald-700 dark:text-emerald-400" : stockHealth === "low" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
                  {p.stock}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{stockHealth} stock</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details + Rewards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4" />Pricing & Commercial</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["Vendor", p.vendor ? (p.vendor_name ?? "Vendor") : "—"],
              ["Category", p.category ? (p.category_name ?? "Category") : "—"],
              ["Purchasing Price", `रु ${Number(p.purchasing_price).toLocaleString()}`],
              ["Selling Price", `रु ${Number(p.selling_price).toLocaleString()}`],
              ["Gross Margin", `रु ${margin.toLocaleString()} (${marginPct}%)`],
              ["Discount", p.discount_type ? `${p.discount_type}: ${p.discount}` : "None"],
              ["Effective Price", `रु ${effectivePrice.toLocaleString()}`],
              ["Stock", String(p.stock)],
              ["Status", p.is_active ? "Active" : "Inactive"],
              ["SKU", p.sku || "—"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
            {p.vendor && (
              <Link to={`/system/vendors/${p.vendor}`} className="text-xs text-primary underline">View vendor</Link>
            )}
            {p.category && (
              <Link to={`/system/categories/${p.category}`} className="text-xs text-primary underline ml-4">View category</Link>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" />Reward Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className={`p-3 rounded-lg ${p.is_affiliation ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200" : "bg-muted"}`}>
                <p className="text-sm font-medium">Affiliation Reward</p>
                <p className="text-xs text-muted-foreground">{p.is_affiliation ? `${p.affiliation_reward_type}: ${p.affiliation_reward}` : "Disabled"}</p>
              </div>
              <div className={`p-3 rounded-lg ${p.is_purchase_reward ? "bg-blue-50 dark:bg-blue-950 border border-blue-200" : "bg-muted"}`}>
                <p className="text-sm font-medium">Purchase Reward</p>
                <p className="text-xs text-muted-foreground">{p.is_purchase_reward ? `${p.purchase_reward_type}: ${p.purchase_reward}` : "Disabled"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.short_description && <p className="font-medium">{p.short_description}</p>}
              {p.long_description && <p className="text-muted-foreground whitespace-pre-wrap">{p.long_description}</p>}
              {!p.short_description && !p.long_description && <p className="text-muted-foreground">No description.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Images Gallery */}
      {((p.images && p.images.length > 0) || p.image_url) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Product Images</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {p.image_url && (
                <a href={p.image_url} target="_blank" rel="noreferrer" className="block">
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                    <img src={p.image_url} alt="Main" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">Main</span>
                  </div>
                </a>
              )}
              {p.images?.map((im) => im.image_url ? (
                <a key={im.id} href={im.image_url} target="_blank" rel="noreferrer" className="block h-32 w-32 overflow-hidden rounded-lg border">
                  <img src={im.image_url} alt="" className="h-full w-full object-cover" />
                </a>
              ) : null)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
