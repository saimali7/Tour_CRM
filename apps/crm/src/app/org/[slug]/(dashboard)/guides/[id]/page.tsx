"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Calendar,
  Clock,
  Globe,
  Shield,
  AlertCircle,
  User,
  FileText,
  Award,
  Settings,
  MapPin,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { GuideAvailability } from "@/components/guides/guide-availability";

export default function GuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const guideId = params.id as string;
  const [activeTab, setActiveTab] = useState<"schedules" | "notes" | "availability">("schedules");

  const { data: guide, isLoading, error } = trpc.guide.getByIdWithStats.useQuery({
    id: guideId,
  });

  const { data: schedules } = trpc.guide.getSchedules.useQuery({ id: guideId });

  // Fetch guide ratings from reviews
  const { data: guideRatings } = trpc.review.guideRatings.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading guide: {error.message}</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Guide not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "on_leave":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScheduleStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-info/10 text-info";
      case "in_progress":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const upcomingSchedules = schedules?.filter(
    (s) => new Date(s.startsAt) > new Date() && s.status === "scheduled"
  ) || [];

  const pastSchedules = schedules?.filter(
    (s) => new Date(s.startsAt) <= new Date() || s.status !== "scheduled"
  ) || [];

  // Get this guide's rating from the ratings data
  const thisGuideRating = guideRatings?.find((r) => r.guideId === guideId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              {guide.avatarUrl ? (
                <img
                  src={guide.avatarUrl}
                  alt={`${guide.firstName} ${guide.lastName}`}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-xl">
                  {guide.firstName?.charAt(0) ?? ""}
                  {guide.lastName?.charAt(0) ?? ""}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {guide.firstName} {guide.lastName}
              </h1>
              <p className="text-muted-foreground mt-1">Guide since {formatDate(guide.createdAt)}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/org/${slug}/guides/${guide.id}/edit` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Guide
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Star className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              {thisGuideRating ? (
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold text-foreground">
                    {thisGuideRating.averageRating.toFixed(1)}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    ({thisGuideRating.totalReviews})
                  </span>
                </div>
              ) : (
                <p className="text-xl font-semibold text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-lg">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Schedules</p>
              <p className="text-xl font-semibold text-foreground">
                {guide.totalSchedules ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-xl font-semibold text-foreground">
                {guide.upcomingSchedules ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Languages</p>
              <p className="text-xl font-semibold text-foreground">
                {guide.languages?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  guide.status
                )}`}
              >
                {guide.status === "on_leave"
                  ? "On Leave"
                  : guide.status.charAt(0).toUpperCase() + guide.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${guide.email}`}
                  className="text-foreground hover:text-primary"
                >
                  {guide.email}
                </a>
              </div>
            </div>

            {guide.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${guide.phone}`}
                    className="text-foreground hover:text-primary"
                  >
                    {guide.phone}
                  </a>
                </div>
              </div>
            )}

            {guide.emergencyContactName && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="text-foreground">{guide.emergencyContactName}</p>
                  {guide.emergencyContactPhone && (
                    <a
                      href={`tel:${guide.emergencyContactPhone}`}
                      className="text-foreground hover:text-primary text-sm"
                    >
                      {guide.emergencyContactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Bio</h2>
          <div className="space-y-4">
            {guide.bio ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Full Bio</p>
                <p className="text-foreground whitespace-pre-wrap">{guide.bio}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No bio available</p>
            )}

            {guide.shortBio && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Short Bio</p>
                <p className="text-foreground">{guide.shortBio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Qualifications</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Languages</p>
              {guide.languages && guide.languages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {guide.languages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No languages specified</p>
              )}
            </div>

            {guide.certifications && guide.certifications.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {guide.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center px-3 py-1 bg-success/10 text-success rounded-full text-sm"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Status</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                guide.status
              )}`}
            >
              {guide.status === "on_leave"
                ? "On Leave"
                : guide.status.charAt(0).toUpperCase() + guide.status.slice(1)}
            </span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Public Profile</p>
            <p className="text-foreground">{guide.isPublic ? "Yes" : "No"}</p>
          </div>

          {guide.availabilityNotes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Availability Notes</p>
              <p className="text-foreground">{guide.availabilityNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Section: Schedules, Availability & Notes */}
      <div className="bg-card rounded-lg border border-border">
        {/* Tab Headers */}
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("schedules")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "schedules"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedules ({schedules?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("availability")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "availability"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Availability
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Schedules Tab */}
          {activeTab === "schedules" && (
            <>
              {schedules && schedules.length > 0 ? (
                <div className="space-y-6">
                  {/* Upcoming Schedules */}
                  {upcomingSchedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Upcoming Schedules
                      </h3>
                      <div className="divide-y divide-border">
                        {upcomingSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="py-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/org/${slug}/availability/${schedule.id}` as Route}
                                    className="font-medium text-foreground hover:text-primary"
                                  >
                                    {schedule.tour?.name || "Unknown Tour"}
                                  </Link>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScheduleStatusColor(
                                      schedule.status
                                    )}`}
                                  >
                                    {schedule.status.charAt(0).toUpperCase() +
                                      schedule.status.slice(1).replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {formatDateTime(schedule.startsAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {schedule.maxParticipants} capacity
                                </p>
                              </div>
                              <Link
                                href={`/org/${slug}/availability/${schedule.id}` as Route}
                                className="text-primary hover:underline text-sm"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Schedules */}
                  {pastSchedules.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        Past Schedules
                      </h3>
                      <div className="divide-y divide-border">
                        {pastSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="py-4 flex items-center justify-between opacity-60"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/org/${slug}/availability/${schedule.id}` as Route}
                                    className="font-medium text-foreground hover:text-primary"
                                  >
                                    {schedule.tour?.name || "Unknown Tour"}
                                  </Link>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScheduleStatusColor(
                                      schedule.status
                                    )}`}
                                  >
                                    {schedule.status.charAt(0).toUpperCase() +
                                      schedule.status.slice(1).replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {formatDateTime(schedule.startsAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  {schedule.maxParticipants} capacity
                                </p>
                              </div>
                              <Link
                                href={`/org/${slug}/availability/${schedule.id}` as Route}
                                className="text-primary hover:underline text-sm"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-muted-foreground">No schedules yet</p>
                  <Link
                    href={`/org/${slug}/availability/new` as Route}
                    className="mt-2 inline-block text-primary hover:underline"
                  >
                    Create a schedule
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Availability Tab */}
          {activeTab === "availability" && (
            <GuideAvailability guideId={guideId} />
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <>
              {guide.notes ? (
                <div className="bg-muted rounded-lg border border-border p-4">
                  <p className="text-foreground whitespace-pre-wrap">{guide.notes}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-muted-foreground">No internal notes</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
