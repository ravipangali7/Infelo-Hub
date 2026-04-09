import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, Share2, Heart, ShoppingCart, Gift, Minus, Plus,
  Tag, Store, CheckCircle, Package, ChevronDown, ChevronUp, Zap, Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProduct, useProfile, useWishlistIds, useAddToWishlist, useRemoveFromWishlist } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { getToken } from "@/api/client";
import { cn } from "@/lib/utils";
import { parseAffiliateRefParam, storeAffiliateRef } from "@/lib/affiliate";
import type { Product } from "@/api/types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");
const toAbsoluteUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${window.location.origin}${value.startsWith("/") ? "" : "/"}${value}`;
};

type PurchaseBarProps = {
  product: Product;
  quantity: number;
  setQuantity: (n: number) => void;
  lineTotal: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  className?: string;
};

function PurchaseBar({
  product,
  quantity,
  setQuantity,
  lineTotal,
  onAddToCart,
  onBuyNow,
  className,
}: PurchaseBarProps) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-muted rounded-xl p-1.5">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-8 h-8 rounded-lg bg-background flex items-center justify-center disabled:opacity-40"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="font-bold w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
            disabled={quantity >= product.stock}
            className="w-8 h-8 rounded-lg bg-background flex items-center justify-center disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("pages:product.total")}</p>
          <p className="font-bold text-primary text-lg">
            {t("common:currencyShort")} {lineTotal.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-12"
          disabled={product.stock === 0}
          onClick={onAddToCart}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {t("pages:product.addToCart")}
        </Button>
        <Button
          className="flex-1 h-12 font-bold"
          disabled={product.stock === 0}
          onClick={onBuyNow}
        >
          <Zap className="w-4 h-4 mr-2" />
          {t("pages:product.buyNow")}
        </Button>
      </div>
    </div>
  );
}

const ProductDetail = () => {
  const { t } = useTranslation(["pages", "common", "client"]);
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { data: product, isLoading, error } = useProduct(slug ?? null);
  const { addToCart, itemCount } = useCart();
  const isLoggedIn = !!getToken();
  const { data: wishlistIds } = useWishlistIds();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const productId = product?.id ?? null;
  const isWishlisted = (wishlistIds?.product_ids ?? []).includes(productId ?? -1);

  const handleWishlistToggle = () => {
    if (!isLoggedIn) {
      toast.error(t("pages:product.loginForWishlist"));
      return;
    }
    if (!productId) return;
    if (isWishlisted) {
      removeFromWishlist.mutate(productId, {
        onSuccess: () => toast.success(t("pages:product.removedWishlist")),
        onError: () => toast.error(t("pages:product.wishlistFailed")),
      });
    } else {
      addToWishlist.mutate(productId, {
        onSuccess: () => toast.success(t("pages:product.addedWishlist")),
        onError: () => toast.error(t("pages:product.wishlistFailed")),
      });
    }
  };

  const buildAffiliateShareUrl = () => {
    if (!slug) return window.location.href;
    let url = `${API_BASE}/share/product/${slug}/`;
    if (isLoggedIn && product?.is_affiliation && profile?.id) {
      url += `?ref=${profile.id}`;
    }
    return url;
  };

  const handleShare = async () => {
    // Use the Django OG share URL so social media platforms get proper image previews
    const shareUrl = slug ? buildAffiliateShareUrl() : window.location.href;
    const title = product?.name ?? t("pages:product.shareDefaultTitle");
    const text = product?.short_description || title;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t("pages:product.linkCopied"));
      } catch {
        toast.error(t("pages:product.couldNotCopyLink"));
      }
    }
  };

  // Show opaque header + product title once hero scrolls out of view
  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setScrolled(heroBottom < 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const refId = parseAffiliateRefParam(searchParams);
    if (refId != null) storeAffiliateRef(refId);
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <Package className="w-16 h-16 text-muted-foreground" />
        <p className="text-destructive font-medium">{t("pages:product.notFound")}</p>
        <Button variant="outline" asChild>
          <Link to="/shop">{t("pages:product.backToShop")}</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-10 xl:gap-x-14 lg:items-start lg:client-page-container lg:client-page-content lg:py-8">
          <div className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:h-[min(560px,calc(100vh-var(--client-desktop-header-h,3.5rem)-2rem))] lg:min-h-[280px] lg:rounded-2xl lg:border lg:border-border/60 lg:bg-muted/30 lg:shadow-sm">
            <Skeleton className="h-full w-full min-h-[280px] lg:absolute lg:inset-0 lg:min-h-0" />
          </div>
          <div className="client-page-container client-page-content space-y-3 pt-5 lg:pt-0 lg:px-0">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images.map((img) => img.image_url || img.image)
    : [product.image_url || product.image].filter(Boolean);
  const mainImage = images[selectedImage] || product.image_url || product.image || "";

  const sellingPrice = Number(product.selling_price);
  const lineTotal = sellingPrice * quantity;
  const shortDesc = product.short_description;
  const longDesc = product.long_description;
  const hasLongDesc = longDesc && longDesc !== shortDesc && longDesc.length > 0;
  const descText = descExpanded && hasLongDesc ? longDesc : shortDesc || longDesc || "";

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/product/${slug}` } });
      return;
    }
    addToCart(product, quantity);
    toast.success(t("pages:product.addedToCart"), {
      description: t("pages:product.addedToCartDesc", { name: product.name, qty: quantity }),
    });
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/product/${slug}` } });
      return;
    }
    addToCart(product, quantity);
    navigate("/checkout");
  };

  const pageTitle = product ? `${product.name} | ${t("client:brand")}` : t("client:brand");
  const pageDesc =
    product?.short_description || (product ? t("pages:product.buyOnHub", { name: product.name }) : "");
  const pageImage = toAbsoluteUrl(mainImage || product?.image_url || product?.image);
  const canonicalUrl = slug ? `${window.location.origin}/product/${slug}` : window.location.href;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        {pageDesc && <meta name="description" content={pageDesc} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content={t("client:brand")} />
        <meta property="og:title" content={pageTitle} />
        {pageDesc && <meta property="og:description" content={pageDesc} />}
        <meta property="og:url" content={canonicalUrl} />
        {pageImage && <meta property="og:image" content={pageImage} />}
        {pageImage && <meta property="og:image:secure_url" content={pageImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        {pageDesc && <meta name="twitter:description" content={pageDesc} />}
        {pageImage && <meta name="twitter:image" content={pageImage} />}
      </Helmet>

      {/* Mobile: transparent / scrolled bar over hero. Desktop: global header only */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between transition-all duration-200 lg:hidden ${
          scrolled
            ? "bg-background border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <Link
          to="/shop"
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${
            scrolled
              ? "bg-muted"
              : "bg-background/90 backdrop-blur-md border border-border/40"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Product title shows in header when scrolled */}
        {scrolled && (
          <p className="flex-1 mx-3 font-semibold text-sm truncate">{product.name}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleWishlistToggle}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${
              scrolled
                ? "bg-muted"
                : "bg-background/90 backdrop-blur-md border border-border/40"
            }`}
          >
            <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${
              scrolled
                ? "bg-muted"
                : "bg-background/90 backdrop-blur-md border border-border/40"
            }`}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <a
            href={mainImage}
            download
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all ${
              scrolled
                ? "bg-muted"
                : "bg-background/90 backdrop-blur-md border border-border/40"
            }`}
          >
            <Download className="w-5 h-5" />
          </a>
          {itemCount > 0 && (
            <Link
              to="/cart"
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md relative"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-10 xl:gap-x-14 lg:items-start lg:client-page-container lg:client-page-content lg:py-8">
        {/* Gallery column */}
        <div className="lg:sticky lg:top-[calc(var(--client-desktop-header-h,3.5rem)+1rem)] lg:self-start w-full space-y-0 lg:space-y-4">
          {/* Hero Image */}
          <div
            ref={heroRef}
            className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:h-[min(560px,calc(100vh-var(--client-desktop-header-h,3.5rem)-2rem))] lg:min-h-[280px] lg:rounded-2xl lg:border lg:border-border/60 lg:bg-muted/30 lg:shadow-sm"
          >
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover object-center lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover lg:object-[center_70%]"
            />
            {/* Gradient fade into content (mobile) */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent lg:hidden" />

            {/* Image dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 lg:bottom-3">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === selectedImage ? "w-6 bg-primary" : "w-1.5 bg-white/60 lg:bg-foreground/25"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Stock badge */}
            <div className="absolute right-4 top-16 lg:top-4">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                  product.stock > 0
                    ? "border-success/30 bg-success/20 text-success"
                    : "border-destructive/30 bg-destructive/20 text-destructive"
                }`}
              >
                {product.stock > 0 ? t("pages:product.inStock") : t("pages:product.outOfStock")}
              </span>
            </div>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide lg:justify-start lg:overflow-x-auto lg:py-0 client-page-container client-page-content lg:px-0">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all lg:h-20 lg:w-20 ${
                    i === selectedImage ? "border-primary shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details column */}
        <div className="client-page-container client-page-content space-y-4 pb-44 lg:px-0 lg:pb-8">
          <Link
            to="/shop"
            className="mb-1 hidden items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("pages:product.backToShopLink")}
          </Link>

          {/* Title row: desktop puts actions beside heading */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <h1 className="text-2xl font-bold font-display leading-tight lg:text-3xl lg:leading-tight lg:pr-4">
              {product.name}
            </h1>
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={handleWishlistToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:bg-muted/60"
                aria-label={t("pages:product.wishlistAria")}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:bg-muted/60"
                aria-label={t("pages:product.shareAria")}
              >
                <Share2 className="h-5 w-5" />
              </button>
              <a
                href={mainImage}
                download
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm transition-colors hover:bg-muted/60"
                aria-label={t("pages:product.downloadImageAria")}
              >
                <Download className="h-5 w-5" />
              </a>
              {itemCount > 0 && (
                <Link
                  to="/cart"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                </Link>
              )}
            </div>
          </div>

        {/* Name + Price (chips + price) */}
        <div>

          {/* Category / Vendor / SKU chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {product.category_name && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                <Tag className="w-3 h-3" />
                {product.category_name}
              </span>
            )}
            {product.vendor_name && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                <Store className="w-3 h-3" />
                {product.vendor_name}
              </span>
            )}
            {product.sku && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                {t("pages:product.skuLabel", { sku: product.sku })}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-primary">
              {t("common:currencyShort")} {sellingPrice.toLocaleString()}
            </span>
            {Number(product.discount) > 0 && (
              <Badge variant="secondary" className="text-xs">
                {product.discount_type === "percentage"
                  ? t("pages:home.discountPercent", { pct: product.discount })
                  : t("pages:product.discountOff", { amt: product.discount })}
              </Badge>
            )}
          </div>
        </div>

        {/* Cashback card — dynamic: only shown if product.is_purchase_reward is true */}
        {product.is_purchase_reward && Number(product.purchase_reward) > 0 && (
          <div className="rounded-2xl bg-success/10 border border-success/20 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-success text-sm">
                {t("pages:product.earnCashback", {
                  value:
                    product.purchase_reward_type === "percentage"
                      ? `${Number(product.purchase_reward).toFixed(0)}%`
                      : `${t("common:currencyShort")} ${product.purchase_reward}`,
                })}
              </p>
              <p className="text-xs text-muted-foreground">{t("pages:product.cashbackSub")}</p>
            </div>
          </div>
        )}

        {/* Affiliation card — dynamic: only shown if product.is_affiliation is true */}
        {product.is_affiliation && Number(product.affiliation_reward) > 0 && (
          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-accent text-sm">
                {t("pages:product.commissionReferral", {
                  value:
                    product.affiliation_reward_type === "percentage"
                      ? `${Number(product.affiliation_reward).toFixed(0)}%`
                      : `${t("common:currencyShort")} ${product.affiliation_reward}`,
                })}
              </p>
              <p className="text-xs text-muted-foreground">{t("pages:product.affiliateSub")}</p>
            </div>
          </div>
        )}

        {/* Guarantees */}
        <div className="grid grid-cols-2 gap-2 lg:max-w-lg">
          {[
            { icon: CheckCircle, text: t("pages:product.genuineProduct"), key: "genuine" },
            { icon: Package, text: t("pages:product.securePackaging"), key: "pack" },
          ].map(({ icon: Icon, text, key }) => (
            <div key={key} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* Desktop: purchase after highlights, before long description */}
        <div className="hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm lg:block">
          <PurchaseBar
            product={product}
            quantity={quantity}
            setQuantity={setQuantity}
            lineTotal={lineTotal}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>

        {/* Description */}
        {descText && (
          <div className="floating-card p-4 space-y-2">
            <h3 className="font-semibold text-sm">{t("pages:product.description")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{descText}</p>
            {hasLongDesc && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary font-medium mt-1"
              >
                {descExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    {t("pages:product.showLess")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    {t("pages:product.readMore")}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Mobile: fixed bottom bar above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background px-4 py-3 lg:hidden">
        <PurchaseBar
          product={product}
          quantity={quantity}
          setQuantity={setQuantity}
          lineTotal={lineTotal}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      </div>
    </div>
  );
};

export default ProductDetail;
