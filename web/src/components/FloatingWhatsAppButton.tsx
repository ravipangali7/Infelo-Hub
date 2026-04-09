import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicSiteSettings } from "@/api/hooks";

export default function FloatingWhatsAppButton() {
  const { t } = useTranslation("auth");
  const { data: siteSettings } = usePublicSiteSettings();
  const whatsappNumber = siteSettings?.whatsapp?.replace(/\D/g, "") ?? "";

  if (!whatsappNumber) return null;

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("whatsappAria")}
      className="fixed right-4 bottom-24 z-50 h-12 w-12 rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="flex h-full w-full items-center justify-center">
        <MessageCircle className="h-6 w-6" />
      </span>
    </a>
  );
}
