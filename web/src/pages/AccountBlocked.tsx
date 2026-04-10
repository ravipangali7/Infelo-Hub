import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearToken, popAuthRedirectReason } from "@/api/client";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const AccountBlocked = () => {
  const { t } = useTranslation(["auth", "client"]);
  const reason = popAuthRedirectReason() ?? "ACCOUNT_FROZEN";

  const title =
    reason === "ACCOUNT_DEACTIVATED"
      ? t("blocked.deactivatedTitle")
      : reason === "ACCOUNT_DISABLED"
        ? t("blocked.disabledTitle")
        : t("blocked.frozenTitle");

  const description =
    reason === "ACCOUNT_DEACTIVATED"
      ? t("blocked.deactivatedDesc")
      : reason === "ACCOUNT_DISABLED"
        ? t("blocked.disabledDesc")
        : t("blocked.frozenDesc");

  const handleBackToLogin = () => {
    clearToken();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <ClientAppSeo
        title={`${title} | ${t("client:brand")}`}
        description={description}
        canonicalPath="/account-blocked"
        siteName={t("client:brand")}
      />
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">{t("blocked.mistake")}</p>
        <Link
          to="/login"
          onClick={handleBackToLogin}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          {t("blocked.backToLogin")}
        </Link>
      </div>
    </div>
  );
};

export default AccountBlocked;
