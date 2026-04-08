import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePackage } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const PackageDetail = () => {
  const { id } = useParams();
  const { data: pkg, isLoading, error } = usePackage(id ? Number(id) : null);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">Package not found.</p>
      </div>
    );
  }
  if (isLoading || !pkg) {
    return (
      <div className="min-h-screen bg-background">
        <header className="client-page-container client-page-content py-3 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <Link to="/packages" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Package Details</h1>
        </header>
        <div className="client-page-container client-page-content pb-32">
          <Skeleton className="h-48 w-full rounded-3xl mb-4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const products = pkg.products ?? [];
  const totalProductValue = products.reduce((sum, p) => sum + Number(p.total || p.selling_price) * (p.quantity || 1), 0);
  const amountNum = Number(pkg.amount);
  const discountNum = Number(pkg.discount);

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content py-3 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <Link to="/packages" className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Package Details</h1>
      </header>

      <div className="client-page-container client-page-content pb-32 lg:pb-36 space-y-6">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-3xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-8 h-8 fill-white/30" />
              <span className="text-white/80 text-sm">Premium Package</span>
            </div>
            <h2 className="text-3xl font-bold font-display mb-1">{pkg.name}</h2>
            <p className="text-white/80 mb-4">Unlock your earning potential</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">रु {amountNum.toLocaleString()}</span>
              {discountNum > 0 && (
                <span className="text-white/60 line-through">
                  रु {(amountNum + discountNum).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute right-12 -top-4 w-24 h-24 bg-white/10 rounded-full" />
        </div>

        {products.length > 0 && (
          <div className="floating-card p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" />
              Products Included
            </h3>
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      रु {Number(product.selling_price).toLocaleString()} × {product.quantity ?? 1}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-center text-sm text-muted-foreground">
                Total product value:{" "}
                <span className="font-semibold text-foreground">रु {totalProductValue.toLocaleString()}</span>
              </p>
            </div>
          </div>
        )}

        <div className="floating-card p-4">
          <h3 className="font-semibold mb-4">Package Benefits</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <span className="text-sm">Premium support priority</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          className="w-full h-12 text-base bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 lg:max-w-2xl lg:ml-auto"
          size="lg"
        >
          Buy Package - रु {amountNum.toLocaleString()}
        </Button>
      </div>
    </div>
  );
};

export default PackageDetail;
