import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/api/endpoints";
import { ApiError, popAuthRedirectReason, setToken, setUser } from "@/api/client";
import logo from "@/assets/logo.png";

/** Match API auth: digits only (spaces/dashes stripped). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  useEffect(() => {
    const reason = popAuthRedirectReason();
    if (reason === "SESSION_EXPIRED") {
      setError("Your session expired. Please sign in again.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(normalizePhone(phone), password);
      setToken(res.token);
      setUser(res.user);
      navigate(from, { replace: true });
      window.location.reload();
    } catch (err) {
      const apiErr = err as ApiError;
      if (
        apiErr.code === "ACCOUNT_FROZEN" ||
        apiErr.code === "ACCOUNT_DEACTIVATED" ||
        apiErr.code === "ACCOUNT_DISABLED"
      ) {
        navigate("/account-blocked", { replace: true });
        return;
      }
      setError(apiErr.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-card/95 p-7 shadow-xl backdrop-blur">
        <div className="space-y-3">
          <img src={logo} alt="Infelo Hub" className="h-10 w-auto" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in with your phone number and password</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="text"
              placeholder="98xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline block text-center">
            Forgot password?
          </Link>
        </form>
        <div className="space-y-2">
          <Button variant="outline" className="w-full h-11 rounded-xl" asChild>
            <Link to="/register">Create Account</Link>
          </Button>
          <Button variant="outline" className="w-full h-11 rounded-xl" asChild>
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
