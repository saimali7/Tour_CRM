import { Star } from "lucide-react";

interface ReviewItem {
  id: string;
  overallRating: number;
  comment: string | null;
  createdAt: Date;
  customer?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface ReviewSectionProps {
  averageRating: number;
  totalReviews: number;
  reviews: ReviewItem[];
}

function formatReviewer(review: ReviewItem): string {
  const firstName = review.customer?.firstName?.trim();
  const lastName = review.customer?.lastName?.trim();
  if (!firstName && !lastName) return "Verified guest";
  const initial = lastName ? `${lastName.charAt(0)}.` : "";
  return `${firstName || ""} ${initial}`.trim();
}

function reviewerInitials(review: ReviewItem): string {
  const first = review.customer?.firstName?.charAt(0)?.toUpperCase() || "G";
  const last = review.customer?.lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
}

function getDistribution(reviews: ReviewItem[]): Record<number, number> {
  const totals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) {
    const rating = Math.max(1, Math.min(5, Math.round(review.overallRating))) as 1 | 2 | 3 | 4 | 5;
    totals[rating] = (totals[rating] ?? 0) + 1;
  }
  return totals;
}

export function ReviewSection({
  averageRating,
  totalReviews,
  reviews,
}: ReviewSectionProps) {
  if (totalReviews === 0) {
    return null;
  }

  const distribution = getDistribution(reviews);
  const total = Math.max(1, totalReviews);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 grid gap-5 md:grid-cols-[220px_1fr]">
        <div>
          <p className="text-sm text-muted-foreground">Guest rating</p>
          <div className="mt-2 flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
            <span className="font-display text-3xl">{averageRating.toFixed(1)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{totalReviews} verified reviews</p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating] || 0;
            const percentage = Math.round((count / total) * 100);
            return (
              <div key={rating} className="grid grid-cols-[48px_1fr_40px] items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  {rating}
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-lg border border-border bg-secondary p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {reviewerInitials(review)}
                </span>
                <p className="text-sm font-medium">{formatReviewer(review)}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={`${review.id}-star-${idx}`}
                    className={`h-3.5 w-3.5 ${idx < review.overallRating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/40"
                      }`}
                  />
                ))}
              </div>
            </div>
            {review.comment ? (
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Great experience and smooth organization.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
