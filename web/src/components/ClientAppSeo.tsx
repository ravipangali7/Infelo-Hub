import { RouteSeo } from "@/components/RouteSeo";
import { absoluteUrl } from "@/lib/seo";

/** Meta tags for logged-in / auth client routes (noindex + canonical). */
export function ClientAppSeo({
  title,
  description,
  canonicalPath,
  siteName,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  siteName: string;
}) {
  return (
    <RouteSeo
      title={title}
      description={description}
      imageUrl={absoluteUrl("/og-image.png")}
      canonicalPath={canonicalPath}
      siteName={siteName}
      noIndex
    />
  );
}
