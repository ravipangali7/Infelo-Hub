import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerRequestOtp, registerVerifyOtp, registerComplete } from "@/api/endpoints";
import { setToken, setUser } from "@/api/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { UserPlus } from "lucide-react";

const PHONE_REGEX = /^(97|98)\d{8}$/;

function validatePassword(password: string): string | null {
  if (!password || password.length < 6)
    return "Password must be at least 6 characters.";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(password))
    return "Password must contain at least one number.";
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~]/.test(password))
    return "Password must contain at least one special character.";
  return null;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return PHONE_REGEX.test(digits);
}

const Register = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const stageTitle = step === 1 ? "Create account" : step === 2 ? "Verify your phone" : "Complete your profile";
  const stageSubtitle =
    step === 1
      ? "Start with your phone number"
      : step === 2
      ? "Enter the OTP we sent to your number"
      : "Set your name and password";

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validatePhone(phone)) {
      setError("Phone must be 10 digits starting with 97 or 98.");
      return;
    }
    setLoading(true);
    try {
      await registerRequestOtp(phone.replace(/\D/g, ""));
      setStep(2);
    } catch (err) {
      setError((err as Error).message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter 6 digit OTP.");
      return;
    }
    setLoading(true);
    try {
      await registerVerifyOtp(phone.replace(/\D/g, ""), otp);
      setStep(3);
    } catch (err) {
      setError((err as Error).message ?? "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fullName = name.trim();
    if (!fullName) {
      setError("Full name is required.");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
      setError((err as Error).message ?? "Registration failed");
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
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="text"
                placeholder="98xxxxxxxx"
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
              {loading ? "Sending OTP…" : "Send OTP"}
            </Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label>OTP</Label>
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
              <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl font-semibold" disabled={loading}>
                {loading ? "Verifying…" : "Verify OTP"}
              </Button>
            </div>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 rounded-xl" required />
            </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
            {loading ? "Creating account…" : "Complete Registration"}
          </Button>
        </form>
        )}
        <p className="text-xs text-center">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
