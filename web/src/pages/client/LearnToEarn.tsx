import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Share2,
  Megaphone,
  ChevronRight,
  Gift,
  TrendingUp,
  Users,
  CheckCircle,
  Package,
} from "lucide-react";
import { useProductSections } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product, ProductCategory } from "@/api/types";

const earningSections = [
  {
    icon: ShoppingBag,
    color: "bg-green-500",
    bgLight: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    title: "Buy & Earn",
    subtitle: "Earn cashback on every purchase",
    description:
      "When you buy eligible products, a percentage of your purchase is credited to your Earning Wallet. The cashback is applied automatically after your order is delivered.",
    steps: [
      "Browse products tagged with a cashback badge",
      "Place your order and complete payment",
      "Receive delivery — cashback hits your Earning Wallet",
      "Withdraw or use your earnings anytime",
    ],
    highlights: [
      { icon: Gift, text: "Up to 10% to 50% cashback" },
      { icon: TrendingUp, text: "Credited after successful delivery" },
    ],
  },
  {
    icon: Share2,
    color: "bg-pink-500",
    bgLight: "bg-pink-50",
    textColor: "text-pink-700",
    borderColor: "border-pink-200",
    title: "Affiliate",
    subtitle: "Share products & earn commissions",
    description:
      "Share product links with your network. When someone buys through your referral, you earn a commission credited to your Earning Wallet — no purchase required on your end.",
    steps: [
      "Find products with the Affiliate badge",
      "Share the product with friends, family, or followers",
      "They make a purchase through your referral and pay",
      "After the order is delivered, your commission is credited",
    ],
    highlights: [
      { icon: Users, text: "Earn on every referral sale" },
      { icon: TrendingUp, text: "Paid & delivered before payout" },
    ],
  },
  {
    icon: Megaphone,
    color: "bg-purple-500",
    bgLight: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    title: "Campaigns",
    subtitle: "Complete tasks & earn rewards",
    description:
      "Brands run campaigns where you complete specific tasks — posting reviews, creating content, or visiting their pages. Submit proof and earn campaign rewards upon approval.",
    steps: [
      "Browse running campaigns in the Campaigns section",
      "Review the task requirements carefully",
      "Complete the task and submit your proof",
      "Earn your reward once approved by the brand",
    ],
    highlights: [
      { icon: CheckCircle, text: "Fixed rewards per approved submission" },
      { icon: Megaphone, text: "New campaigns added regularly" },
    ],
  },
];

function LearnCategorySection({ category, products }: { category: ProductCategory; products: Product[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-4 h-4 text-primary" />
          )}
        </div>
        <h4 className="font-bold text-base">{category.name}</h4>
        <Link to={`/shop?category=${category.id}`} className="ml-auto text-xs text-primary font-medium flex items-center gap-0.5">
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

const LearnToEarn = () => {
  const { data: sectionsPayload, isLoading: sectionsLoading } = useProductSections({
    mode: "direct",
    perSection: 8,
    featuredLimit: 0,
  });
  const sectionRows = sectionsPayload?.sections ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="client-page-container client-page-content sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border flex items-center gap-3 py-3">
        <Link
          to="/"
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold font-display">Learn to Earn</h1>
          <p className="text-xs text-muted-foreground">3 ways to grow your earnings</p>
        </div>
      </header>

      <div className="client-page-container client-page-content py-6 space-y-8 pb-24">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-white">
          <h2 className="text-2xl font-bold font-display mb-2">Start Earning Today</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Infelo Hub gives you multiple ways to earn from every activity — shopping, sharing, and completing campaigns.
          </p>
        </div>

        {/* Earning Methods */}
        {earningSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className={`rounded-2xl border ${section.borderColor} overflow-hidden`}>
              {/* Section header */}
              <div className={`${section.bgLight} p-5 flex items-center gap-4`}>
                <div className={`w-14 h-14 rounded-2xl ${section.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${section.textColor}`}>{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{section.description}</p>

                {/* Steps */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`w-6 h-6 rounded-full ${section.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground/80">{step}</p>
                    </div>
                  ))}
                </div>

                {/* Highlights */}
                <div className={`rounded-xl ${section.bgLight} p-4 space-y-2`}>
                  {section.highlights.map(({ icon: HIcon, text }, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <HIcon className={`w-4 h-4 ${section.textColor} flex-shrink-0`} />
                      <p className={`text-sm font-medium ${section.textColor}`}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Shop by Category */}
        <section>
          <div className="section-header mb-5">
            <h3 className="text-xl font-bold font-display">Shop by Category</h3>
            <Link to="/shop" className="text-sm text-primary font-medium flex items-center gap-1">
              All Products <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {sectionsLoading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i}>
                  <Skeleton className="h-6 w-32 mb-3 rounded-lg" />
                  <div className="flex gap-3">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="w-[140px] h-[180px] flex-shrink-0 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {sectionRows.map((row) => (
                <LearnCategorySection key={row.category.id} category={row.category} products={row.products} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LearnToEarn;
