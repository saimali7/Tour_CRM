import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Breadcrumb, CardSurface, PageShell } from "@/components/layout";
import {
  getTripInspirationArticleBySlug,
  getTripInspirationArticleCategoryLabel,
  getTripInspirationArticles,
} from "@/lib/trip-inspiration-content";
import { getCategoryConfig } from "@/lib/category-config";
import { requireOrganization } from "@/lib/organization";

interface PageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

export async function generateStaticParams() {
  return getTripInspirationArticles().map((article) => ({
    articleSlug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const org = await requireOrganization(slug);
  const article = getTripInspirationArticleBySlug(articleSlug);

  if (!article) {
    return {
      title: "Trip Inspiration",
    };
  }

  return {
    title: `${article.title} | ${org.name}`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [{ url: article.coverImageUrl }],
      type: "article",
    },
  };
}

export default async function TripInspirationArticlePage({ params }: PageProps) {
  const { articleSlug } = await params;
  const article = getTripInspirationArticleBySlug(articleSlug);

  if (!article) {
    notFound();
  }

  const relatedCategory = getCategoryConfig(article.relatedCategorySlug);
  const relatedLabel = getTripInspirationArticleCategoryLabel(article);
  const moreArticles = getTripInspirationArticles()
    .filter((entry) => entry.slug !== article.slug)
    .slice(0, 2);

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Trip Inspiration", href: "/trip-inspiration" },
          { label: article.title },
        ]}
      />

      <article className="mx-auto max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {relatedLabel} · {format(new Date(`${article.publishedAt}T00:00:00`), "MMM d, yyyy")} ·{" "}
          {article.readMinutes} min read
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {article.excerpt}
        </p>

        <div className="relative mt-8 h-72 overflow-hidden rounded-3xl border border-border sm:h-[420px]">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
        </div>

        <div className="mt-10 space-y-9">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl font-semibold leading-snug text-foreground">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-4 text-base leading-relaxed text-muted-foreground">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {relatedCategory ? (
          <CardSurface className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Continue Planning
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold">
              Browse {relatedCategory.label}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Move from inspiration to live availability and secure checkout.
            </p>
            <div className="mt-4">
              <Link
                href={`/experiences/${relatedCategory.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                View related experiences
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardSurface>
        ) : null}
      </article>

      {moreArticles.length > 0 ? (
        <div className="mx-auto mt-14 max-w-4xl border-t border-border pt-10">
          <h2 className="font-display text-2xl font-semibold">More from Trip Inspiration</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {moreArticles.map((entry) => (
              <Link
                key={entry.slug}
                href={`/trip-inspiration/${entry.slug}`}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {getTripInspirationArticleCategoryLabel(entry)} · {entry.readMinutes} min read
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">{entry.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
