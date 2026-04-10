import { Helmet } from "react-helmet-async";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

function humanizeSegment(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function getAdminPageTitle(pathname: string): string {
  const raw = pathname.replace(/\/$/, "") || "/system";
  if (raw === "/system") return "Dashboard";
  const parts = raw.replace(/^\/system\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard";
  const last = parts[parts.length - 1];
  const prev = parts.length >= 2 ? parts[parts.length - 2] : "";
  if (last === "new" && prev) {
    const base = humanizeSegment(prev);
    const singular = base.endsWith("s") && base.length > 4 ? base.slice(0, -1) : base;
    return `New ${singular}`;
  }
  if (/^\d+$/.test(last) && prev) {
    return `${humanizeSegment(prev)} #${last}`;
  }
  if (parts.length >= 2 && parts[0] === "analytics") {
    return `Analytics · ${humanizeSegment(parts[1])}`;
  }
  return humanizeSegment(last);
}

export function AdminPanelSeo() {
  const { pathname } = useLocation();
  const segmentTitle = useMemo(() => getAdminPageTitle(pathname), [pathname]);
  return (
    <Helmet>
      <title>{`${segmentTitle} · Infelo Hub Admin`}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
