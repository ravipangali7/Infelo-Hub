import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Trash2, ShoppingBag } from "lucide-react";
import { useWishlist, useRemoveFromWishlist } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Wishlist = () => {
  const { data: wishlistItems, isLoading } = useWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const handleRemove = (productId: number) => {
    removeFromWishlist.mutate(productId, {
      onSuccess: () => toast.success("Removed from wishlist"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="client-page-container client-page-content sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border flex items-center gap-3 py-3">
        <Link
          to="/profile"
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h1 className="text-lg font-bold font-display">Wishlist</h1>
        </div>
        {wishlistItems && wishlistItems.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">{wishlistItems.length} items</span>
        )}
      </header>

      <div className="client-page-container client-page-content py-6 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : !wishlistItems || wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-1">Your wishlist is empty</h3>
              <p className="text-sm text-muted-foreground">Add products you love to your wishlist</p>
            </div>
            <Button asChild>
              <Link to="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wishlistItems.map((item) => {
              const product = item.product_detail;
              const discount = Number(product.discount) || 0;
              return (
                <div key={item.id} className="product-card relative">
                  <Link to={`/product/${product.slug}`} className="block">
                    <div className="aspect-square relative">
                      <img
                        src={product.image_url || product.image || ""}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-accent text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}
                      {product.is_purchase_reward && (
                        <span className="absolute bottom-2 left-2 bg-success text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                          +{product.purchase_reward}% CB
                        </span>
                      )}
                    </div>
                    <div className="p-3 pb-10">
                      <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{product.name}</p>
                      <p className="text-primary font-bold text-sm">रु {Number(product.selling_price).toLocaleString()}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemove(product.id)}
                    disabled={removeFromWishlist.isPending}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
