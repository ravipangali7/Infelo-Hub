import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

export function MobileLanguageToggleButton({ className }: { className?: string }) {
  const { t } = useTranslation("client");
  return (
    <button
      type="button"
      className={cn(
        "lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-white shadow-sm text-foreground transition-colors hover:bg-muted/40",
        className
      )}
      onClick={() => void i18n.changeLanguage(i18n.language.startsWith("ne") ? "en" : "ne")}
      aria-label={t("toggleLanguage")}
    >
      <Languages className="h-5 w-5" aria-hidden />
    </button>
  );
}
