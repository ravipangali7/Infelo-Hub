import { Link } from "react-router-dom";
import { clearToken, popAuthRedirectReason } from "@/api/client";

const contentMap: Record<string, { title: string; description: string }> = {
  ACCOUNT_FROZEN: {
    title: "Your account was frozen by Administration",
    description: "Please contact Administration for assistance.",
  },
  ACCOUNT_DEACTIVATED: {
    title: "Your account is deactivated",
    description: "Please contact Administration for assistance.",
  },
  ACCOUNT_DISABLED: {
    title: "Your account is disabled",
    description: "Please contact Administration for assistance.",
  },
};

const AccountBlocked = () => {
  const reason = popAuthRedirectReason() ?? "ACCOUNT_FROZEN";
  const content = contentMap[reason] ?? contentMap.ACCOUNT_FROZEN;

  const handleBackToLogin = () => {
    clearToken();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <p className="text-muted-foreground">{content.description}</p>
        <p className="text-sm text-muted-foreground">
          If you think this is a mistake, please contact your administrator.
        </p>
        <Link
          to="/login"
          onClick={handleBackToLogin}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default AccountBlocked;
