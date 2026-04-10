import { Helmet } from "react-helmet-async";
import { absoluteUrl, siteOrigin } from "@/lib/seo";

type RouteSeoProps = {
  title: string;
  description: string;
  keywords?: string | null;
  /** Absolute HTTPS URL for og:image */
  imageUrl: string;
  /** Path starting with / (e.g. /shop) */
  canonicalPath: string;
  siteName: string;
  /** Preferred Open Graph URL (e.g. server /share/... for crawlers). Falls back to canonical. */
  ogUrl?: string;
  /** Open Graph type (default website; use product for product pages). */
  ogType?: string;
  /** Auth / account pages — ask crawlers not to index. */
  noIndex?: boolean;
};

export function RouteSeo({
  title,
  description,
  keywords,
  imageUrl,
  canonicalPath,
  siteName,
  ogUrl,
  ogType = "website",
  noIndex = false,
}: RouteSeoProps) {
  const origin = siteOrigin();
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const canonical = origin ? `${origin}${path}` : path;
  const resolvedOg = (ogUrl || canonical).trim();
  const img = absoluteUrl(imageUrl) || imageUrl;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
      {keywords?.trim() ? <meta name="keywords" content={keywords.trim()} /> : null}
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={resolvedOg} />
      <meta property="og:image" content={img} />
      <meta property="og:image:secure_url" content={img} />
      <meta property="og:image:alt" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      <meta name="twitter:image:alt" content={title} />
    </Helmet>
  );
}
