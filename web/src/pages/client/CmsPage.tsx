import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCmsPage } from "@/api/hooks";

const CmsPage = () => {
  const { t } = useTranslation("pages");
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useCmsPage(slug ?? null);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t("misc.cms.notFound")}</h1>
        <p className="text-muted-foreground text-sm">{t("misc.cms.notFoundDescription")}</p>
        <Button asChild variant="outline">
          <Link to="/">{t("misc.cms.goHome")}</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !page) {
    return (
      <div className="client-page-container mx-auto w-full max-w-2xl py-8 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const canonicalUrl = `${window.location.origin}/page/${page.slug}`;

  return (
    <>
      <Helmet>
        <title>{page.title} | Infelo Hub</title>
        <meta name="description" content={page.title} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Infelo Hub" />
        <meta property="og:title" content={`${page.title} | Infelo Hub`} />
        <meta property="og:description" content={page.title} />
        <meta property="og:url" content={canonicalUrl} />
        {page.image_url && <meta property="og:image" content={page.image_url} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${page.title} | Infelo Hub`} />
        <meta name="twitter:description" content={page.title} />
        {page.image_url && <meta name="twitter:image" content={page.image_url} />}
      </Helmet>

      <div className="client-page-container mx-auto w-full max-w-2xl py-6 pb-24">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("misc.cms.back")}
        </Link>

        {/* Page image */}
        {page.image_url && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6">
            <img
              src={page.image_url}
              alt={page.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold font-display mb-6">{page.title}</h1>

        {/* Content — admin-controlled HTML */}
        <div
          className="prose prose-sm max-w-none text-foreground
            prose-headings:font-bold prose-headings:text-foreground
            prose-a:text-primary prose-a:underline
            prose-img:rounded-xl prose-img:w-full"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </>
  );
};

export default CmsPage;
