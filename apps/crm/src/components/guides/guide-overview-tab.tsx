"use client";

import {
  Mail,
  Phone,
  Calendar,
  Clock,
  Globe,
  Star,
  User,
  AlertCircle,
  Award,
  FileText,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface GuideOverviewTabProps {
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    bio: string | null;
    shortBio: string | null;
    languages: string[] | null;
    certifications: string[] | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    status: "active" | "inactive" | "on_leave";
    isPublic: boolean | null;
    notes: string | null;
    totalAssignments?: number | null;
    upcomingAssignments?: number | null;
    createdAt: Date;
  };
}

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

const formatStatusLabel = (status: string) => {
  if (status === "on_leave") return "On Leave";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function GuideOverviewTab({ guide }: GuideOverviewTabProps) {
  const { data: guideRatings } = trpc.review.guideRatings.useQuery();
  const thisGuideRating = guideRatings?.find((r) => r.guideId === guide.id);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
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
                  <p className="font-semibold text-foreground">
                    {thisGuideRating.averageRating.toFixed(1)}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    ({thisGuideRating.totalReviews})
                  </span>
                </div>
              ) : (
                <p className="font-semibold text-muted-foreground">-</p>
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
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="font-semibold text-foreground">
                {guide.totalAssignments ?? 0}
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
              <p className="font-semibold text-foreground">
                {guide.upcomingAssignments ?? 0}
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
              <p className="font-semibold text-foreground">
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
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(guide.status)}`}
              >
                {formatStatusLabel(guide.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Info Cards */}
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
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Status</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(guide.status)}`}
            >
              {formatStatusLabel(guide.status)}
            </span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Public Profile</p>
            <p className="text-foreground">{guide.isPublic ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Internal Notes</h2>
        </div>
        {guide.notes ? (
          <div className="bg-muted rounded-lg border border-border p-4">
            <p className="text-foreground whitespace-pre-wrap">{guide.notes}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">No internal notes</p>
        )}
      </div>
    </div>
  );
}
