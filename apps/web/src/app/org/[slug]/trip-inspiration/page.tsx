import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { requireOrganization } from "@/lib/organization";
import { Breadcrumb, PageShell, SectionHeader } from "@/components/layout";
import {
  getTripInspirationArticles,
  getTripInspirationArticleCategoryLabel,
} from "@/lib/trip-inspiration-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Trip Inspiration | ${org.name}`,
    description:
      "Editorial travel guides for Dubai itineraries, route planning, and experience selection.",
  };
}

function MetaLine({
  publishedAt,
  readMinutes,
  categoryLabel,
}: {
  publishedAt: string;
  readMinutes: number;
  categoryLabel: string;
}) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {categoryLabel} · {format(new Date(`${publishedAt}T00:00:00`), "MMM d, yyyy")} · {readMinutes} min read
    </p>
  );
}

export default async function TripInspirationIndexPage() {
  const articles = getTripInspirationArticles();
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Trip Inspiration" },
        ]}
      />

      <div className="mx-auto max-w-7xl pb-12">
        <SectionHeader
          title="Trip Inspiration"
          subtitle="Modern travel notes for UAE visitors: smarter sequencing, fewer surprises, and better days on the ground."
        />

        {featured ? (
          <article className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <Link href={`/trip-inspiration/${featured.slug}`} className="group grid grid-cols-1 lg:grid-cols-2">
              <div className="relative h-64 lg:h-full">
                <Image
                  src={featured.coverImageUrl}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-4 p-6 sm:p-8">
                <MetaLine
                  publishedAt={featured.publishedAt}
                  readMinutes={featured.readMinutes}
                  categoryLabel={getTripInspirationArticleCategoryLabel(featured)}
                />
                <h1 className="font-display text-3xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                  {featured.title}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">{featured.excerpt}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Read feature
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </article>
        ) : null}

        {rest.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {rest.map((article) => (
              <article
                key={article.slug}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <Link href={`/trip-inspiration/${article.slug}`} className="group block">
                  <div className="relative h-52">
                    <Image
                      src={article.coverImageUrl}
                      alt={article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="space-y-3 p-5">
                    <MetaLine
                      publishedAt={article.publishedAt}
                      readMinutes={article.readMinutes}
                      categoryLabel={getTripInspirationArticleCategoryLabel(article)}
                    />
                    <h2 className="font-display text-xl font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {article.title}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {article.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Read article
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
