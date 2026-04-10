import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const NotFound = () => {
  const { t } = useTranslation(["auth", "client"]);
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <ClientAppSeo
        title={`${t("auth:notFound.title")} | ${t("client:brand")}`}
        description={t("auth:notFound.title")}
        canonicalPath={location.pathname || "/404"}
        siteName={t("client:brand")}
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notFound.code")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.title")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("notFound.goHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
