import { Link } from "react-router-dom";
import { ShoppingBag, Users, Gift, TrendingUp, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLandingContent } from "@/api/hooks";
import logo from "@/assets/logoT.png";

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shop: ShoppingBag,
  users: Users,
  gift: Gift,
  trending: TrendingUp,
};

const Landing = () => {
  const { data, isLoading, error } = useLandingContent();

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-destructive mb-4">Unable to load content.</p>
        <Link to="/"><Button>Go to App</Button></Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
        </header>
        <section className="px-6 py-20 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full max-w-xl mx-auto" />
          <Skeleton className="h-6 w-full max-w-md mx-auto" />
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
        </section>
        <section className="px-6 py-16 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-10 w-48 mx-auto mb-12" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  const hero = data.hero ?? { heading: "", subtitle: "", primary_button_text: "Get Started", secondary_button_text: "Explore Shop" };
  const features = data.features ?? [];
  const cta = data.cta ?? { heading: "Ready to Start Earning?", subtext: "Join thousands of users already earning through Infelo Hub.", button_text: "Join Now" };
  const footerText = data.footer_text ?? "© 2024 Infelo Hub. All rights reserved.";
  const title = data.title ?? "Infelo Hub";

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <img src={logo} alt={title} className="h-10" />
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium hover:text-primary">App</Link>
          <Link to="/system"><Button size="sm">Admin</Button></Link>
        </div>
      </header>

      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
          {hero.heading}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {hero.subtitle}
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/"><Button size="lg" className="gap-2">{hero.primary_button_text} <ArrowRight className="w-4 h-4" /></Button></Link>
          <Link to="/shop"><Button size="lg" variant="outline">{hero.secondary_button_text}</Button></Link>
        </div>
      </section>

      <section className="px-6 py-16 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Ways to Earn</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[f.icon_key] ?? Gift;
              return (
                <div key={i} className="bg-card p-6 rounded-2xl border">
                  <Icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <Star className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">{cta.heading}</h2>
          <p className="text-muted-foreground mb-8">{cta.subtext}</p>
          <Link to="/"><Button size="lg">{cta.button_text}</Button></Link>
        </div>
      </section>

      <footer className="px-6 py-8 border-t text-center text-sm text-muted-foreground">
        {footerText}
      </footer>
    </div>
  );
};

export default Landing;
