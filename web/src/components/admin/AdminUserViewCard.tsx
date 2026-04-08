import { Link } from "react-router-dom";
import { useAdminUser } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, ExternalLink } from "lucide-react";

const kycVariant = (s: string): "default" | "secondary" | "destructive" =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
const statusVariant = (s: string): "default" | "secondary" | "destructive" =>
  s === "active" ? "default" : "secondary";

export function AdminUserViewCard({ userId }: { userId: number | null | undefined }) {
  const { data: user, isLoading, error } = useAdminUser(userId ?? null);

  if (userId == null || userId === undefined) {
    return null;
  }

  if (isLoading && !user) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !user) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          User could not be loaded.
          <Link to={`/system/users/${userId}`} className="ml-2 text-primary underline">
            Open profile #{userId}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          User
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/system/users/${user.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Full profile
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="font-semibold text-lg leading-tight">{user.name || user.phone}</p>
          <p className="text-sm text-muted-foreground">{user.phone}</p>
          {user.email ? <p className="text-xs text-muted-foreground">{user.email}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={kycVariant(user.kyc_status)} className="text-xs">
            KYC: {user.kyc_status}
          </Badge>
          <Badge variant={statusVariant(user.status)} className="text-xs">
            {user.status}
          </Badge>
          {user.is_staff ? (
            <Badge variant="outline" className="text-xs">
              Staff
            </Badge>
          ) : null}
          {!user.is_active ? <Badge variant="destructive" className="text-xs">Inactive</Badge> : null}
          {user.is_wallet_freeze ? (
            <Badge variant="secondary" className="text-xs">
              Wallet frozen
            </Badge>
          ) : null}
        </div>
        {(user.kyc_document_front_url || user.kyc_document_back_url) && (
          <div className="flex gap-2 flex-wrap">
            {user.kyc_document_front_url ? (
              <a
                href={user.kyc_document_front_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                KYC front
              </a>
            ) : null}
            {user.kyc_document_back_url ? (
              <a
                href={user.kyc_document_back_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline"
              >
                KYC back
              </a>
            ) : null}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Earning wallet</p>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              रु {Number(user.earning_wallet).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Top-up wallet</p>
            <p className="font-medium">रु {Number(user.topup_wallet).toLocaleString()}</p>
          </div>
        </div>
        {user.package_name ? (
          <p className="text-xs text-muted-foreground">
            Package: <span className="text-foreground font-medium">{user.package_name}</span>
          </p>
        ) : null}
        {user.referred_by ? (
          <p className="text-xs text-muted-foreground">
            Referred by:{" "}
            <Link to={`/system/users/${user.referred_by}`} className="text-primary underline">
              {user.referred_by_name || user.referred_by_phone || `#${user.referred_by}`}
            </Link>
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          Joined {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : "—"} · Created{" "}
          {new Date(user.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
