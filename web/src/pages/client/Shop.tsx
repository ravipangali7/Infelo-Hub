import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Package, ShoppingCart, Store, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts, useCategories, useHomeConfig, useCampaigns, useProductSections } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { ClientBannerCarousel } from "@/components/ClientBannerCarousel";

const Shop = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const { itemCount } = useCart();

  const { data: homeConfig } = useHomeConfig();
  const banners = homeConfig?.banners ?? [];
  const { data: productsData, isLoading: productsLoading } = useProducts({
    search: searchQuery || undefined,
    category: categoryId,
  });
  const { data: categoriesData } = useCategories();
  const { data: campaignsData } = useCampaigns();
  const { data: sectionsPayload, isLoading: featuredSectionsLoading } = useProductSections({
    mode: "tree",
    perSection: 8,
    featuredLimit: 8,
    omitSections: true,
  });
  const featuredProducts = (sectionsPayload?.featured ?? []).slice(0, 8);
  const products = productsData?.results ?? [];
  const categories = categoriesData?.results ?? [];
  const campaigns = campaignsData?.results ?? [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="client-page-container sticky top-0 bg-background/80 backdrop-blur-xl z-40">
        <div className="client-page-content pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-display">Shop</h1>
          <Link
            to="/cart"
            className="relative w-10 h-10 rounded-xl bg-white border border-border/50 shadow-sm flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-border/50"
            />
          </div>
          <button className="p-3 rounded-xl bg-white border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
        </div>
      </header>

      <div className="client-page-container client-page-content space-y-6 pb-8">
        {banners.length > 0 && <ClientBannerCarousel banners={banners} />}

        {(featuredSectionsLoading || featuredProducts.length > 0) && (
          <section>
            <div className="section-header">
              <h3 className="section-title">Featured Products</h3>
              <a href="#shop-all-products" className="text-sm text-primary font-medium flex items-center gap-1">
                Browse all <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            {featuredSectionsLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="min-w-[140px] h-[180px] rounded-xl flex-shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {featuredProducts.map((product) => {
                  const discount = Number(product.discount) || 0;
                  const isPercentDiscount = product.discount_type === "percentage";
                  const discountLabel = discount > 0
                    ? isPercentDiscount ? `-${discount}%` : `-रु ${discount}`
                    : null;
                  const cashback = Number(product.purchase_reward) || 0;
                  const cashbackLabel = product.is_purchase_reward && cashback > 0
                    ? product.purchase_reward_type === "percentage"
                      ? `+${cashback}% CB`
                      : `+रु ${cashback} CB`
                    : null;
                  const affReward = Number(product.affiliation_reward) || 0;
                  const affLabel = product.is_affiliation && affReward > 0
                    ? product.affiliation_reward_type === "percentage"
                      ? `${affReward}% AFF`
                      : `रु ${affReward} AFF`
                    : null;
                  return (
                    <Link key={product.id} to={`/product/${product.slug}`} className="product-card w-[160px] flex-shrink-0">
                      <div className="aspect-square relative">
                        <img
                          src={product.image_url || product.image || ""}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {discountLabel && (
                          <span className="absolute top-2 left-2 bg-accent text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {discountLabel}
                          </span>
                        )}
                        {affLabel && (
                          <span className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                            {affLabel}
                          </span>
                        )}
                        {cashbackLabel && (
                          <span className="absolute bottom-2 left-2 bg-success text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                            {cashbackLabel}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{product.name}</p>
                        {product.vendor_name && (
                          <p className="text-[10px] text-muted-foreground truncate mb-1">{product.vendor_name}</p>
                        )}
                        <p className="text-primary font-bold text-sm">रु {product.selling_price}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Categories */}
        <section>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <button
              type="button"
              onClick={() => setCategoryId(undefined)}
              className={`flex flex-col items-center gap-2 min-w-[70px] ${!categoryId ? "opacity-100" : "opacity-70"}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-border/50 flex items-center justify-center text-2xl shadow-sm">📦</div>
              <span className="text-xs font-medium text-center">All</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(String(cat.id))}
                className={`flex flex-col items-center gap-2 min-w-[70px] ${categoryId === String(cat.id) ? "opacity-100" : "opacity-70"}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-border/50 flex items-center justify-center overflow-hidden shadow-sm">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs font-medium text-center">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* All Products Grid */}
        <section id="shop-all-products">
          <h3 className="section-title mb-4">All Products</h3>
          {productsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {products.map((product) => {
                const discount = Number(product.discount) || 0;
                const sellingPrice = Number(product.selling_price);
                const isPercentDiscount = product.discount_type === "percentage";
                const originalPrice = discount > 0 && isPercentDiscount
                  ? Math.round(sellingPrice / (1 - discount / 100))
                  : discount > 0 && !isPercentDiscount
                  ? sellingPrice + discount
                  : null;
                const discountLabel = discount > 0
                  ? isPercentDiscount ? `-${discount}%` : `-रु ${discount}`
                  : null;
                const cashback = Number(product.purchase_reward) || 0;
                const cashbackLabel = product.is_purchase_reward && cashback > 0
                  ? product.purchase_reward_type === "percentage"
                    ? `+${cashback}% CB`
                    : `+रु ${cashback} CB`
                  : null;
                const affiliationReward = Number(product.affiliation_reward) || 0;
                const affiliationLabel = product.is_affiliation && affiliationReward > 0
                  ? product.affiliation_reward_type === "percentage"
                    ? `${affiliationReward}% Aff`
                    : `रु ${affiliationReward} Aff`
                  : product.is_affiliation ? "Affiliate" : null;

                return (
                  <Link key={product.id} to={`/product/${product.slug}`} className="product-card">
                    <div className="aspect-square relative">
                      <img
                        src={product.image_url || product.image || ""}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {discountLabel && (
                        <Badge className="absolute top-2 left-2 bg-accent text-white border-0 text-[10px] px-1.5">
                          {discountLabel}
                        </Badge>
                      )}
                      {affiliationLabel && (
                        <Badge className="absolute top-2 right-2 bg-pink-500 text-white border-0 text-[10px] px-1.5">
                          {affiliationLabel}
                        </Badge>
                      )}
                      {cashbackLabel && (
                        <Badge className="absolute bottom-2 left-2 bg-success text-white border-0 text-[10px] px-1.5">
                          {cashbackLabel}
                        </Badge>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-xl">
                          <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-full">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{product.name}</p>
                      {product.vendor_name && (
                        <div className="flex items-center gap-1 mb-1">
                          <Store className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground truncate">{product.vendor_name}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-primary font-bold text-sm">रु {sellingPrice.toLocaleString()}</span>
                        {originalPrice && (
                          <span className="text-muted-foreground text-xs line-through">रु {Number(originalPrice).toLocaleString()}</span>
                        )}
                        <span className={`text-[10px] ${product.stock > 0 ? "text-success" : "text-destructive"}`}>
                          {product.stock > 0 ? "In stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {!productsLoading && products.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No products found</p>
          )}
        </section>

        <section>
          <div className="section-header">
            <h3 className="section-title">Campaign Highlights</h3>
            <Link to="/campaigns" className="text-sm text-primary font-medium">View all</Link>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {campaigns.slice(0, 4).map((campaign) => (
              <Link key={campaign.id} to={`/campaign/${campaign.id}`} className="floating-card p-3 flex items-center gap-3">
                {campaign.image_url ? (
                  <img src={campaign.image_url} alt={campaign.name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">CMP</div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.commission_type === "percentage" ? `${campaign.commission}%` : `रु ${campaign.commission}`} reward
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="floating-card p-4">
          <h3 className="font-semibold mb-2">Trusted by happy customers</h3>
          <p className="text-sm text-muted-foreground">
            Real customer ratings and reviews will appear here when available.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Shop;
