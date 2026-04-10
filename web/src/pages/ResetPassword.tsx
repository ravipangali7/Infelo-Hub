import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/api/endpoints";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const ResetPassword = () => {
  const { t } = useTranslation(["auth", "client"]);
  const location = useLocation();
  const navigate = useNavigate();
  const phone = (location.state as { phone?: string } | null)?.phone ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(phone, password, confirmPassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setError((err as Error).message ?? t("reset.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!phone) {
    return (
      <div className="p-6 text-sm">
        <ClientAppSeo
          title={`${t("auth:reset.title")} | ${t("client:brand")}`}
          description={t("auth:reset.invalidSession")}
          canonicalPath="/reset-password"
          siteName={t("client:brand")}
        />
        {t("reset.invalidSession")}{" "}
        <Link to="/forgot-password" className="text-primary underline">
          {t("reset.tryAgain")}
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50">
      <ClientAppSeo
        title={`${t("auth:reset.title")} | ${t("client:brand")}`}
        description={t("auth:reset.forPhone", { phone })}
        canonicalPath="/reset-password"
        siteName={t("client:brand")}
      />
      <div className="w-full max-w-sm space-y-6 rounded-3xl border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">{t("reset.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("reset.forPhone", { phone })}</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="password">{t("reset.newPassword")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t("reset.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("reset.resetting") : t("reset.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
