import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { forgotPasswordRequestOtp, forgotPasswordVerifyOtp } from "@/api/endpoints";
import { ClientAppSeo } from "@/components/ClientAppSeo";

const ForgotPassword = () => {
  const { t } = useTranslation(["auth", "client"]);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPasswordRequestOtp(phone.replace(/\D/g, ""));
      setStep(2);
    } catch (err) {
      setError((err as Error).message ?? t("forgot.otpSendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPasswordVerifyOtp(phone.replace(/\D/g, ""), otp);
      navigate("/reset-password", { state: { phone: phone.replace(/\D/g, "") } });
    } catch (err) {
      setError((err as Error).message ?? t("forgot.otpFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50">
      <ClientAppSeo
        title={`${t("auth:forgot.title")} | ${t("client:brand")}`}
        description={t("auth:forgot.stepOf", { step })}
        canonicalPath="/forgot-password"
        siteName={t("client:brand")}
      />
      <div className="w-full max-w-sm space-y-6 rounded-3xl border bg-card p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">{t("forgot.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("forgot.stepOf", { step })}</p>
        </div>
        {step === 1 ? (
          <form className="space-y-4" onSubmit={requestOtp}>
            <div>
              <Label htmlFor="phone">{t("forgot.phone")}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-2"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("forgot.sendingOtp") : t("forgot.sendOtp")}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyOtp}>
            <div>
              <Label>{t("forgot.otp")}</Label>
              <div className="mt-2">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("forgot.verifying") : t("forgot.verifyOtp")}
            </Button>
          </form>
        )}
        <p className="text-xs text-center">
          <Link to="/login" className="text-primary hover:underline">
            {t("forgot.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
