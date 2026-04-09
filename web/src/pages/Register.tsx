import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerRequestOtp, registerVerifyOtp, registerComplete } from "@/api/endpoints";
import { setToken, setUser } from "@/api/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { UserPlus } from "lucide-react";

const PHONE_REGEX = /^(97|98)\d{8}$/;

function validatePassword(password: string, t: (key: string) => string): string | null {
  if (!password || password.length < 6) return t("register.passwordMin");
  if (!/[A-Z]/.test(password)) return t("register.passwordUpper");
  if (!/[a-z]/.test(password)) return t("register.passwordLower");
  if (!/\d/.test(password)) return t("register.passwordDigit");
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~]/.test(password)) return t("register.passwordSpecial");
  return null;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return PHONE_REGEX.test(digits);
}

const Register = () => {
  const { t } = useTranslation(["auth", "common"]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const stageTitle = useMemo(() => {
    if (step === 1) return t("register.step1Title");
    if (step === 2) return t("register.step2Title");
    return t("register.step3Title");
  }, [step, t]);

  const stageSubtitle = useMemo(() => {
    if (step === 1) return t("register.step1Subtitle");
    if (step === 2) return t("register.step2Subtitle");
    return t("register.step3Subtitle");
  }, [step, t]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validatePhone(phone)) {
      setError(t("register.phoneInvalid"));
      return;
    }
    setLoading(true);
    try {
      await registerRequestOtp(phone.replace(/\D/g, ""));
      setStep(2);
    } catch (err) {
      setError((err as Error).message ?? t("register.otpSendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError(t("register.otpLength"));
      return;
    }
    setLoading(true);
    try {
      await registerVerifyOtp(phone.replace(/\D/g, ""), otp);
      setStep(3);
    } catch (err) {
      setError((err as Error).message ?? t("register.otpFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fullName = name.trim();
    if (!fullName) {
      setError(t("register.nameRequired"));
      return;
    }
    const pwError = validatePassword(password, t);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await registerComplete(phone.replace(/\D/g, ""), fullName, password, confirmPassword);
      setToken(res.token);
      setUser(res.user);
      navigate("/", { replace: true });
      window.location.reload();
    } catch (err) {
      setError((err as Error).message ?? t("register.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card/95 p-7 shadow-xl backdrop-blur">
        <div className="space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{stageTitle}</h1>
            <p className="text-muted-foreground text-sm mt-1">{stageSubtitle}</p>
          </div>
        </div>
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <Label htmlFor="phone">{t("login.phone")}</Label>
              <Input
                id="phone"
                type="text"
                placeholder={t("login.phonePlaceholder")}
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(v);
                }}
                className="mt-2 h-11 rounded-xl"
                required
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
              {loading ? t("register.sending") : t("register.sendOtp")}
            </Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label>{t("register.otpLabel")}</Label>
              <div className="mt-2">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-between">
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep(1)}>
                {t("common:back")}
              </Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl font-semibold" disabled={loading}>
                {loading ? t("forgot.verifying") : t("register.verifyOtp")}
              </Button>
            </div>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("register.fullNameLabel")}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("register.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11 rounded-xl"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("register.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("register.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 h-11 rounded-xl"
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
              {loading ? t("register.creatingAccount") : t("register.completeRegister")}
            </Button>
          </form>
        )}
        <p className="text-xs text-center">
          {t("register.haveAccount")}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t("register.signInLink")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
