"use client";

import * as React from "react";
import {
  Mail,
  Phone,
  User,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface GuideQuickViewProps {
  guideId: string;
  orgSlug: string;
  onViewAvailability?: () => void;
}

export function GuideQuickView({
  guideId,
  orgSlug,
  onViewAvailability,
}: GuideQuickViewProps) {
  const { data: guide, isLoading, error } = trpc.guide.getByIdWithStats.useQuery({ id: guideId });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading guide: {error.message}
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Guide not found
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "status-confirmed",
    inactive: "bg-muted text-muted-foreground",
    suspended: "status-cancelled",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {guide.avatarUrl ? (
            <img
              src={guide.avatarUrl}
              alt={`${guide.firstName} ${guide.lastName}`}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">
              {guide.firstName} {guide.lastName}
            </h3>
            {guide.shortBio && (
              <p className="text-sm text-muted-foreground">{guide.shortBio}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusColors[guide.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {guide.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-3 text-center">
          <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{guide.upcomingSchedules || 0}</p>
          <p className="text-xs text-muted-foreground">upcoming tours</p>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{guide.totalSchedules || 0}</p>
          <p className="text-xs text-muted-foreground">total assigned</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Contact Information
        </h4>
        <div className="space-y-2">
          {guide.email && (
            <a
              href={`mailto:${guide.email}`}
              className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3 w-3" />
              {guide.email}
            </a>
          )}
          {guide.phone && (
            <a
              href={`tel:${guide.phone}`}
              className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3 w-3" />
              {guide.phone}
            </a>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      {guide.emergencyContactName && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Emergency Contact</h4>
          <p className="text-sm">{guide.emergencyContactName}</p>
          {guide.emergencyContactPhone && (
            <a
              href={`tel:${guide.emergencyContactPhone}`}
              className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3 w-3" />
              {guide.emergencyContactPhone}
            </a>
          )}
        </div>
      )}

      {/* Languages */}
      {guide.languages && guide.languages.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Languages</h4>
          <div className="flex flex-wrap gap-2">
            {guide.languages.map((language, index) => (
              <span
                key={`${language}-${index}`}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {guide.certifications && guide.certifications.length > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {guide.certifications.slice(0, 4).map((cert, index) => (
              <span
                key={`${cert}-${index}`}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {cert}
              </span>
            ))}
            {guide.certifications.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{guide.certifications.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bio */}
      {guide.bio && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Bio</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {guide.bio}
          </p>
        </div>
      )}

      {/* Notes (internal) */}
      {guide.notes && (
        <div className="border rounded-lg p-4 space-y-2 status-pending">
          <h4 className="text-sm font-medium">Internal Notes</h4>
          <p className="text-sm">{guide.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onViewAvailability && (
          <Button onClick={onViewAvailability} variant="outline" className="flex-1">
            <Calendar className="mr-2 h-4 w-4" />
            Availability
          </Button>
        )}
        <Link href={`/org/${orgSlug}/guides/${guide.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Full Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
