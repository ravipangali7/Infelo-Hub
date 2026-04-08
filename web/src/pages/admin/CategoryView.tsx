import { useParams, Link, useNavigate } from "react-router-dom";
import { useAdminCategory, useAdminProductList, adminKeys } from "@/api/hooks";
import { adminApi } from "@/api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDataTable } from "@/components/admin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, Layers, Package, ImageIcon, CheckCircle2, XCircle } from "lucide-react";

export default function CategoryView() {
  const { id } = useParams<{ id: string }>();
  const catId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: cat, isLoading, error } = useAdminCategory(catId);
  const { data: productsData } = useAdminProductList(catId ? { category: String(catId), page_size: 10, page: 1 } : undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!catId || isNaN(catId)) return <p className="text-destructive">Invalid ID</p>;
  if (isLoading && !cat) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );
  if (error || !cat) return (
    <div className="space-y-2"><p className="text-destructive">Not found.</p><Link to="/system/categories">Back</Link></div>
  );

  const products = productsData?.results ?? [];
  const productCount = productsData?.count ?? 0;
  const activeProducts = products.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/system/categories"><Button variant="ghost" size="sm" className="mb-1"><ArrowLeft className="h-4 w-4 mr-1" />Categories</Button></Link>
          <div className="flex items-center gap-3">
            {cat.image_url && <img src={cat.image_url} alt="" className="h-14 w-14 rounded-lg border object-cover" />}
            <div>
              <h1 className="text-3xl font-bold">{cat.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={cat.is_active ? "default" : "secondary"}>{cat.is_active ? "Active" : "Inactive"}</Badge>
                {cat.parent && <Badge variant="outline">Has Parent</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/system/categories/${cat.id}/edit`}><Button><Edit className="h-4 w-4 mr-1" />Edit</Button></Link>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Products</p>
                <p className="text-2xl font-bold mt-1">{productCount}</p>
                <p className="text-xs text-muted-foreground">{activeProducts} active</p>
              </div>
              <Package className="h-8 w-8 text-blue-200 dark:text-blue-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Status</p>
                <div className="mt-2">
                  <Badge variant={cat.is_active ? "default" : "secondary"}>
                    {cat.is_active ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <XCircle className="h-3 w-3 mr-1 inline" />}
                    {cat.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <Layers className="h-8 w-8 text-emerald-200 dark:text-emerald-900" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase">Parent Category</p>
            <p className="text-xl font-bold mt-1">{cat.parent ? (cat.parent_name || `#${cat.parent}`) : "Root"}</p>
            {cat.parent && <Link to={`/system/categories/${cat.parent}`} className="text-xs text-primary underline">View parent</Link>}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" />Category Details</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              ["ID", `#${cat.id}`],
              ["Name", cat.name],
              ["Status", null],
              ["Parent", cat.parent ? (cat.parent_name || `Category #${cat.parent}`) : "Root category"],
              ["Description", cat.description || "—"],
              ["Created", new Date(cat.created_at).toLocaleString()],
              ["Updated", new Date(cat.updated_at).toLocaleString()],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                {label === "Status" ? (
                  <Badge variant={cat.is_active ? "default" : "secondary"} className="text-xs">{cat.is_active ? "Active" : "Inactive"}</Badge>
                ) : (
                  <span className="text-sm font-medium">{val as string}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {cat.image_url && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Category Image</CardTitle></CardHeader>
            <CardContent>
              <img src={cat.image_url} alt={cat.name} className="max-h-48 rounded-lg border object-contain w-full" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Products */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4 shrink-0" />Products in this Category ({productCount})</CardTitle>
            <Link to={`/system/products?category=${cat.id}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <AdminDataTable
              columns={[
                {
                  id: "product",
                  label: "Product",
                  render: (p) => (
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded border object-cover shrink-0" />}
                      <Link to={`/system/products/${p.id}`} className="text-primary underline font-medium">{p.name}</Link>
                    </div>
                  ),
                },
                { id: "sku", label: "SKU", render: (p) => <span className="font-mono text-xs">{p.sku || "—"}</span> },
                {
                  id: "price",
                  label: "Price",
                  render: (p) => <span className="md:text-right block">रु {Number(p.selling_price).toLocaleString()}</span>,
                },
                {
                  id: "stock",
                  label: "Stock",
                  render: (p) => (
                    <span className={`md:text-right block ${p.stock < 10 ? "text-red-600 font-bold" : p.stock < 50 ? "text-amber-600" : ""}`}>{p.stock}</span>
                  ),
                },
                {
                  id: "status",
                  label: "Status",
                  render: (p) => <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Active" : "Inactive"}</Badge>,
                },
                {
                  id: "actions",
                  label: "Actions",
                  render: (p) => (
                    <div className="flex flex-wrap gap-1">
                      <Link to={`/system/products/${p.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs">View</Button></Link>
                      <Link to={`/system/products/${p.id}/edit`}><Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button></Link>
                    </div>
                  ),
                },
              ]}
              data={products}
              keyFn={(p) => p.id}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting &quot;{cat.name}&quot; will also unlink {productCount} products from this category. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              try {
                await adminApi.deleteCategory(cat.id);
                toast({ title: "Category deleted" });
                qc.invalidateQueries({ queryKey: adminKeys.categories({}) });
                navigate("/system/categories");
              } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
