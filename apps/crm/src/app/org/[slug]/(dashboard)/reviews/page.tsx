"use client";

import { trpc } from "@/lib/trpc";
import {
  Star,
  MessageSquare,
  Eye,
  EyeOff,
  Search,
  Loader2,
  CheckCircle,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Reply,
  X,
} from "lucide-react";
import { useState } from "react";

type StatusFilter = "all" | "submitted" | "pending" | "flagged";

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, error } = trpc.review.list.useQuery({
    pagination: { page, limit: 20 },
    filters: {
      status: statusFilter === "all" ? undefined : statusFilter,
      minRating: ratingFilter ?? undefined,
      maxRating: ratingFilter ?? undefined,
    },
  });

  const { data: stats } = trpc.review.stats.useQuery();
  const { data: guideRatings } = trpc.review.guideRatings.useQuery();

  const utils = trpc.useUtils();

  const respondMutation = trpc.review.respond.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      setRespondingTo(null);
      setResponseText("");
      showSuccessMessage();
    },
  });

  const togglePublicMutation = trpc.review.togglePublic.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      utils.review.stats.invalidate();
      showSuccessMessage();
    },
  });

  const flagMutation = trpc.review.flag.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      showSuccessMessage();
    },
  });

  const showSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-warning fill-warning" : "text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    if (!stats?.ratingDistribution) return [];
    const total = stats.totalReviews || 1;
    return [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: stats.ratingDistribution[rating] || 0,
      percentage: ((stats.ratingDistribution[rating] || 0) / total) * 100,
    }));
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
        <p className="text-destructive">Error loading reviews: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Customer feedback and ratings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Success</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-xl font-semibold text-foreground">
                  {stats.totalReviews}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-xl font-semibold text-foreground">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Eye className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Testimonials</p>
                <p className="text-xl font-semibold text-foreground">
                  {stats.publicTestimonials}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Flag className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold text-foreground">
                  {stats.pendingReviews}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Rating Distribution
          </h3>
          <div className="space-y-2">
            {getRatingDistribution().map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setRatingFilter(ratingFilter === rating ? null : rating)
                  }
                  className={`flex items-center gap-1 text-sm w-8 ${
                    ratingFilter === rating
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {rating}
                  <Star className="h-3 w-3 fill-current" />
                </button>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Ratings Summary */}
      {guideRatings && guideRatings.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Guide Ratings
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {guideRatings.slice(0, 4).map((guide) => (
              <div key={guide.guideId} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {guide.guideName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {guide.guideName}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-warning fill-warning" />
                    <span className="text-xs text-muted-foreground">
                      {guide.averageRating.toFixed(1)} ({guide.totalReviews})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", "submitted", "pending", "flagged"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-accent"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
          {ratingFilter && (
            <button
              onClick={() => setRatingFilter(null)}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary flex items-center gap-1"
            >
              {ratingFilter}
              <Star className="h-3 w-3 fill-current" />
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No reviews yet
            </h3>
            <p className="mt-2 text-muted-foreground">
              Reviews will appear here after customers complete tours.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((review) => (
            <div
              key={review.id}
              className="bg-card rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.overallRating)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                    {review.isPublic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                        Testimonial
                      </span>
                    )}
                    {review.status === "flagged" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                        Flagged
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <p className="font-medium text-foreground">
                      {review.customer?.firstName} {review.customer?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {review.tour?.name} &middot; Ref: {review.booking?.referenceNumber}
                    </p>
                    {review.guide && (
                      <p className="text-sm text-muted-foreground">
                        Guide: {review.guide.firstName} {review.guide.lastName}
                        {review.guideRating && (
                          <span className="ml-2">
                            ({review.guideRating}
                            <Star className="inline h-3 w-3 ml-0.5 text-warning fill-warning" />
                            )
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {review.comment && (
                    <p className="text-foreground mb-3">{review.comment}</p>
                  )}

                  {review.highlightsLiked && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground">
                        <ThumbsUp className="inline h-3 w-3 mr-1" />
                        {review.highlightsLiked}
                      </p>
                    </div>
                  )}

                  {review.improvementSuggestions && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground">
                        <ThumbsDown className="inline h-3 w-3 mr-1" />
                        {review.improvementSuggestions}
                      </p>
                    </div>
                  )}

                  {/* Response */}
                  {review.responseText && (
                    <div className="mt-3 pl-4 border-l-2 border-primary/30">
                      <p className="text-sm font-medium text-foreground">
                        Your Response
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.responseText}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {review.respondedAt && formatDate(review.respondedAt)}
                      </p>
                    </div>
                  )}

                  {/* Response Form */}
                  {respondingTo === review.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Write your response..."
                        className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseText("");
                          }}
                          className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() =>
                            respondMutation.mutate({
                              id: review.id,
                              responseText,
                            })
                          }
                          disabled={
                            !responseText.trim() || respondMutation.isPending
                          }
                          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                          {respondMutation.isPending && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          Send Response
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!review.responseText && respondingTo !== review.id && (
                    <button
                      onClick={() => setRespondingTo(review.id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                      title="Reply"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => togglePublicMutation.mutate({ id: review.id })}
                    className={`p-1.5 rounded ${
                      review.isPublic
                        ? "text-success hover:bg-success/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={review.isPublic ? "Remove from testimonials" : "Make testimonial"}
                  >
                    {review.isPublic ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  {review.status !== "flagged" && (
                    <button
                      onClick={() => flagMutation.mutate({ id: review.id })}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      title="Flag review"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
            {data.total} reviews
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-input disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-input disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
