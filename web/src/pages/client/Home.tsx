import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  Megaphone,
  Share2,
  Gift,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ChevronRight,
  ShoppingCart,
  Package,
  Bell,
  Smartphone,
  Download,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  useClientDashboard,
  useCampaigns,
  useHomeConfig,
  useNotificationUnreadCount,
  useProductSections,
  usePublicSiteSettings,
  usePublicAppVersion,
} from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import type { Product, ProductCategory } from "@/api/types";
import { getToken } from "@/api/client";
import { ClientBannerCarousel } from "@/components/ClientBannerCarousel";

const features = [
  { icon: Receipt, label: "Transactions", path: "/transactions", color: "text-primary" },
  { icon: ArrowDownToLine, label: "Deposit", path: "/deposit", color: "text-success" },
  { icon: ArrowUpFromLine, label: "Withdraw", path: "/withdraw", color: "text-accent" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns", color: "text-purple-500" },
  { icon: Share2, label: "Affiliation", path: "/shop?filter=affiliate", color: "text-pink-500" },
  { icon: Gift, label: "Buy & Earn", path: "/shop?filter=reward", color: "text-green-500" },
  { icon: ShoppingBag, label: "Shop", path: "/shop", color: "text-blue-500" },
  { icon: DollarSign, label: "Earnings", path: "/wallet", color: "text-emerald-500" },
];

const earningWays = [
  { icon: ShoppingBag, title: "Buy & Earn", desc: "Get rewards on purchases", color: "bg-green-500", path: "/learn-to-earn" },
  { icon: Share2, title: "Affiliate", desc: "Share products & earn", color: "bg-pink-500", path: "/learn-to-earn" },
  { icon: Megaphone, title: "Campaigns", desc: "Complete tasks & earn", color: "bg-purple-500", path: "/learn-to-earn" },
];

function isInfeloHubFlutterEmbedded(): boolean {
  return typeof window !== "undefined" && Boolean(window.__infeloHubFlutterClient);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return "Just now";
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString();
}

function HomeSectionRow({ category, products }: { category: ProductCategory; products: Product[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-primary" />
          )}
        </div>
        <h4 className="font-bold text-sm">{category.name}</h4>
        <Link to={`/shop?category=${category.id}`} className="ml-auto text-xs text-primary font-medium flex items-center gap-0.5 flex-shrink-0">
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {products.map((product) => {
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
            <Link key={product.id} to={`/product/${product.slug}`} className="product-card w-[140px] flex-shrink-0">
              <div className="aspect-square relative">
                <img
                  src={product.image_url || product.image || ""}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {discountLabel && (
                  <span className="absolute top-2 left-2 bg-accent text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
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
              <div className="p-2.5">
                <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">{product.name}</p>
                <p className="text-primary font-bold text-sm">रु {product.selling_price}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const Home = () => {
  const isLoggedIn = !!getToken();
  const { data: unreadNotif } = useNotificationUnreadCount();
  const unreadCount = unreadNotif?.unread_count ?? 0;
  const { data, isLoading, error } = useClientDashboard();
  const { itemCount } = useCart();
  const { data: homeConfig } = useHomeConfig();
  const { data: sectionsPayload, isLoading: sectionsLoading } = useProductSections({
    mode: "tree",
    perSection: 8,
    featuredLimit: isLoggedIn ? 0 : 8,
  });
  const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns();
  const { data: siteSettings } = usePublicSiteSettings();
  const { data: appVersion } = usePublicAppVersion();
  const sectionRows = sectionsPayload?.sections ?? [];
  const androidApkUrl = (appVersion?.android_file_url ?? "").trim();
  const showAndroidDownload = !isInfeloHubFlutterEmbedded() && androidApkUrl.length > 0;

  const wallet = data?.wallet ?? { earning_wallet: 0, topup_wallet: 0, package_name: null };
  const earning = Number(wallet.earning_wallet) || 0;
  const topup = Number(wallet.topup_wallet) || 0;
  const guestFeatured = sectionsPayload?.featured ?? [];
  const featuredProducts = (isLoggedIn ? data?.featured_products : guestFeatured)?.slice(0, 8) ?? [];
  const campaigns = (isLoggedIn ? data?.campaigns : campaignsData?.results)?.slice(0, 6) ?? [];
  const transactions = data?.recent_transactions ?? [];
  const banners = homeConfig?.banners ?? [];
  const isPublicLoading = sectionsLoading || campaignsLoading;
  const featuredLoading = isLoggedIn ? isLoading : sectionsLoading;
  const homeTitle = siteSettings?.title?.trim() || "Infelo Hub";
  const homeDescription = siteSettings?.subtitle?.trim() || "Discover products, campaigns, and rewards on Infelo Hub.";
  const homeImage = siteSettings?.logo_url || `${window.location.origin}${logo.startsWith("/") ? "" : "/"}${logo}`;
  const homeUrl = window.location.origin;

  if (error && isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive">Failed to load dashboard. You may need to log in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{homeTitle}</title>
        <meta name="description" content={homeDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Infelo Hub" />
        <meta property="og:title" content={homeTitle} />
        <meta property="og:description" content={homeDescription} />
        <meta property="og:url" content={homeUrl} />
        <meta property="og:image" content={homeImage} />
        <meta property="og:image:secure_url" content={homeImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={homeTitle} />
        <meta name="twitter:description" content={homeDescription} />
        <meta name="twitter:image" content={homeImage} />
      </Helmet>
      <header className="client-page-container client-page-content pt-6 pb-4 flex items-center justify-between">
        <img src={logo} alt="Infelo Hub" className="h-10 w-auto" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{isLoggedIn ? "Welcome back!" : "Welcome!"}</span>
          {isLoggedIn && (
            <Link
              to="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-white shadow-sm"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
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
      </header>

      <div className="client-page-container client-page-content space-y-6 pb-8">
        {showAndroidDownload && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 sm:px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-4 w-4" aria-hidden />
            </div>
            <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
              Get the Infelo Hub app on Android for notifications and a smoother experience.
            </p>
            <a
              href={androidApkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download
            </a>
          </div>
        )}
        {isLoggedIn && (
          <div className="wallet-card">
            <div className="relative z-10">
              {isLoading ? (
                <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-white/70 text-sm mb-1">Total Balance</p>
                      <h2 className="text-3xl font-bold font-display">
                        रु {(earning + topup).toLocaleString()}
                      </h2>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                      {wallet.package_name ?? "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">Earning Wallet</p>
                      <p className="text-lg font-semibold">रु {earning.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                      <p className="text-white/60 text-xs mb-1">Top-up Wallet</p>
                      <p className="text-lg font-semibold">रु {topup.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Link to="/deposit" className="bg-white text-primary font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                  <ArrowDownToLine className="w-4 h-4" />
                  Deposit
                </Link>
                <Link to="/withdraw" className="bg-accent text-white font-semibold py-3 rounded-xl text-center flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                  <ArrowUpFromLine className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>
            </div>
          </div>
        )}

        {banners.length > 0 ? (
          <ClientBannerCarousel banners={banners} />
        ) : !isLoggedIn ? (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-center">
            <Link to="/shop" className="text-sm font-semibold text-primary">
              Browse the shop
            </Link>
          </div>
        ) : null}

        {(featuredLoading || featuredProducts.length > 0) && (
          <section>
            <div className="section-header">
              <h3 className="section-title">Featured Products</h3>
              <Link to="/shop" className="text-sm text-primary font-medium flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {featuredLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="min-w-[140px] h-[180px] rounded-xl" />
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

        <section>
          <div className="section-header">
            <h3 className="section-title">Running Campaigns</h3>
            <Link to="/campaigns" className="text-sm text-primary font-medium flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} to={`/campaign/${campaign.id}`} className="floating-card flex items-center gap-4 p-4">
                <img
                  src={campaign.image_url || campaign.image || ""}
                  alt={campaign.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{campaign.name}</h4>
                  <p className="text-sm text-muted-foreground">Earn up to रु {campaign.commission}</p>
                </div>
                <div className="bg-success/10 text-success text-xs font-medium px-3 py-1 rounded-full">
                  {campaign.status_display || "Active"}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h3 className="section-title mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Link key={i} to={feature.path} className="feature-grid-item">
                  <Icon className={`w-5 h-5 shrink-0 ${feature.color}`} />
                  <span className="text-[10px] sm:text-[11px] leading-tight font-medium text-foreground/80 line-clamp-2 px-0.5">
                    {feature.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          {isPublicLoading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-5 w-28 mb-3 rounded-lg" />
                  <div className="flex gap-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="w-[140px] h-[190px] flex-shrink-0 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-7">
              {sectionRows.map((row) => (
                <HomeSectionRow key={row.category.id} category={row.category} products={row.products} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-header">
            <h3 className="section-title">Ways to Earn</h3>
            <Link to="/learn-to-earn" className="text-sm text-primary font-medium flex items-center gap-1">
              Learn More <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {earningWays.map((way, i) => {
              const Icon = way.icon;
              return (
                <Link key={i} to={way.path} className="floating-card p-2.5 sm:p-3 block text-center">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${way.color} flex items-center justify-center mx-auto mb-1.5 sm:mb-2`}>
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
                  </div>
                  <h4 className="font-semibold text-[11px] sm:text-xs leading-tight line-clamp-2">{way.title}</h4>
                </Link>
              );
            })}
          </div>
        </section>

        {isLoggedIn && (
          <section>
            <div className="section-header">
              <h3 className="section-title">Recent Transactions</h3>
              <Link to="/transactions" className="text-sm text-primary font-medium flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isEarning = tx.transaction_type === "added";
                return (
                  <div key={tx.id} className="floating-card flex items-center gap-4 p-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEarning ? "bg-success/10" : "bg-primary/10"}`}>
                      {isEarning ? <TrendingUp className="w-5 h-5 text-success" /> : <ArrowDownToLine className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{tx.transaction_for_display || tx.transaction_for}</h4>
                      <p className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</p>
                    </div>
                    <span className={`font-semibold ${isEarning ? "text-success" : "text-foreground"}`}>
                      {isEarning ? "+" : ""}रु {tx.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="floating-card p-4">
          <h3 className="font-semibold mb-2">Customer Love</h3>
          <p className="text-sm text-muted-foreground">Trusted by thousands of happy shoppers across Nepal. New ratings and reviews are coming soon.</p>
        </section>
      </div>
    </div>
  );
};

export default Home;
