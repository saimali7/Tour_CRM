import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@tour/ui";
import { FadeIn } from "@/components/layout/animate";
import { Section, SectionHeader } from "@/components/layout";
import {
  getTripInspirationArticles,
  getTripInspirationArticleCategoryLabel,
} from "@/lib/trip-inspiration-content";

function ArticleMetaLine({
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

export function TripInspirationSection({ orgName }: { orgName: string }) {
  const articles = getTripInspirationArticles();
  const featured = articles[0];
  const sideArticles = articles.slice(1, 4);

  if (!featured) {
    return null;
  }

  return (
    <Section
      id="trip-inspiration"
      spacing="spacious"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <FadeIn>
        <SectionHeader
          title="Trip Inspiration Journal"
          subtitle={`Editorial travel notes from ${orgName}: practical ideas, route logic, and better planning for UAE experiences.`}
          action={
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link href="/trip-inspiration">Read all stories</Link>
            </Button>
          }
        />
      </FadeIn>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <FadeIn delayMs={120} className="lg:col-span-7">
          <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <Link href={`/trip-inspiration/${featured.slug}`} className="group block">
              <div className="relative h-64 sm:h-80">
                <Image
                  src={featured.coverImageUrl}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-4 p-6 sm:p-7">
                <ArticleMetaLine
                  publishedAt={featured.publishedAt}
                  readMinutes={featured.readMinutes}
                  categoryLabel={getTripInspirationArticleCategoryLabel(featured)}
                />
                <h3 className="font-display text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
                  {featured.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Read article
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </article>
        </FadeIn>

        <div className="space-y-4 lg:col-span-5">
          {sideArticles.map((article, index) => (
            <FadeIn key={article.slug} delayMs={180 + index * 70}>
              <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <ArticleMetaLine
                  publishedAt={article.publishedAt}
                  readMinutes={article.readMinutes}
                  categoryLabel={getTripInspirationArticleCategoryLabel(article)}
                />
                <h4 className="mt-3 font-display text-lg font-semibold leading-snug text-foreground">
                  <Link
                    href={`/trip-inspiration/${article.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {article.title}
                  </Link>
                </h4>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
                <div className="mt-4">
                  <Link
                    href={`/trip-inspiration/${article.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>

      <FadeIn delayMs={320}>
        <div className="mt-6 sm:hidden">
          <Button asChild variant="outline" className="w-full">
            <Link href="/trip-inspiration">Read all stories</Link>
          </Button>
        </div>
      </FadeIn>
    </Section>
  );
}
