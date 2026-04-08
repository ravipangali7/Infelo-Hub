import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";

export function AdminUserColumnCell({
  userId,
  userPhone,
  className,
}: {
  userId: number | null | undefined;
  userPhone?: string | null;
  className?: string;
}) {
  if (userId == null || userId === undefined) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const phone = (userPhone ?? "").trim() || "—";
  return (
    <Link
      to={`/system/users/${userId}`}
      className={`inline-flex items-center gap-1.5 min-w-0 max-w-[200px] text-primary hover:underline text-sm ${className ?? ""}`}
      title={phone !== "—" ? phone : `User #${userId}`}
    >
      <Smartphone className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="truncate font-medium">{phone}</span>
    </Link>
  );
}
