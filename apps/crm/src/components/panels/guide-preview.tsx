"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Eye,
  Edit,
  AlertCircle,
  Languages,
  Award,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ContextPanelSection,
  ContextPanelRow,
  ContextPanelSkeleton,
  ContextPanelEmpty,
} from "@/components/layout/context-panel";
import { cn } from "@/lib/utils";

interface GuidePreviewProps {
  guideId: string;
}

export function GuidePreview({ guideId }: GuidePreviewProps) {
  const params = useParams();
  const slug = params.slug as string;

  const { data: guide, isLoading, error } = trpc.guide.getById.useQuery(
    { id: guideId },
    { enabled: !!guideId }
  );

  if (isLoading) {
    return <ContextPanelSkeleton />;
  }

  if (error || !guide) {
    return (
      <ContextPanelEmpty
        icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        title="Guide not found"
        description="This guide may have been deleted"
      />
    );
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // Determine status variant
  const getStatusVariant = (status: string): "success" | "warning" | "error" | "neutral" => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
      case "suspended":
        return "error";
      default:
        return "neutral";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <>
      {/* Guide Header */}
      <ContextPanelSection>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {guide.avatarUrl ? (
              <img
                src={guide.avatarUrl}
                alt={`${guide.firstName} ${guide.lastName}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-primary">
                {guide.firstName.charAt(0)}{guide.lastName.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {guide.firstName} {guide.lastName}
            </h3>
            <StatusBadge
              label={getStatusLabel(guide.status)}
              variant={getStatusVariant(guide.status)}
              className="mt-1"
            />
          </div>
        </div>
      </ContextPanelSection>

      {/* Contact Information */}
      <ContextPanelSection title="Contact">
        <div className="space-y-2">
          {guide.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${guide.email}`}
                className="text-foreground hover:text-primary truncate"
              >
                {guide.email}
              </a>
            </div>
          )}
          {guide.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={`tel:${guide.phone}`}
                className="text-foreground hover:text-primary"
              >
                {guide.phone}
              </a>
            </div>
          )}
          {guide.emergencyContactName && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs uppercase tracking-wide">Emergency</span>
                <p className="text-foreground">{guide.emergencyContactName}</p>
                {guide.emergencyContactPhone && (
                  <p className="text-muted-foreground">{guide.emergencyContactPhone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </ContextPanelSection>

      {/* Languages */}
      {guide.languages && guide.languages.length > 0 && (
        <ContextPanelSection title="Languages">
          <div className="flex flex-wrap gap-1.5">
            {guide.languages.map((language, index) => (
              <span
                key={`${language}-${index}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground"
              >
                <Languages className="h-3 w-3" />
                {language}
              </span>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {/* Certifications */}
      {guide.certifications && guide.certifications.length > 0 && (
        <ContextPanelSection title="Certifications">
          <ul className="space-y-1.5">
            {guide.certifications.slice(0, 4).map((cert, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Award className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-1">{cert}</span>
              </li>
            ))}
            {guide.certifications.length > 4 && (
              <li className="text-xs text-muted-foreground pl-5">
                +{guide.certifications.length - 4} more
              </li>
            )}
          </ul>
        </ContextPanelSection>
      )}

      {/* Availability Notes */}
      {guide.availabilityNotes && (
        <ContextPanelSection title="Availability">
          <p className="text-sm text-muted-foreground">
            {guide.availabilityNotes}
          </p>
        </ContextPanelSection>
      )}

      {/* Bio */}
      {guide.bio && (
        <ContextPanelSection title="Bio">
          <p className="text-sm text-muted-foreground line-clamp-4">
            {guide.bio}
          </p>
        </ContextPanelSection>
      )}

      {/* Notes */}
      {guide.notes && (
        <ContextPanelSection title="Internal Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {guide.notes}
          </p>
        </ContextPanelSection>
      )}

      {/* Created Date */}
      <ContextPanelSection>
        <div className="text-xs text-muted-foreground">
          Added {formatDate(guide.createdAt)}
        </div>
      </ContextPanelSection>
    </>
  );
}

// Footer actions for the guide preview
export function GuidePreviewActions({ guideId }: { guideId: string }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex gap-2">
      <Link href={`/org/${slug}/guides/${guideId}` as Route} className="flex-1">
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Button>
      </Link>
      <Link href={`/org/${slug}/guides/${guideId}/edit` as Route} className="flex-1">
        <Button variant="default" size="sm" className="w-full">
          <Edit className="h-4 w-4 mr-1.5" />
          Edit
        </Button>
      </Link>
    </div>
  );
}
