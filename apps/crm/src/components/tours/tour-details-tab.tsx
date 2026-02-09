"use client";

import { TourForm, type TourFormData } from "./tour-form";

interface TourDetailsTabProps {
  tourId: string;
  tour: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    shortDescription: string | null;
    durationMinutes: number;
    maxParticipants: number;
    minParticipants: number | null;
    guestsPerGuide: number;
    basePrice: string;
    category: string | null;
    tags: string[] | null;
    coverImageUrl: string | null;
    images: string[] | null;
    includes: string[] | null;
    excludes: string[] | null;
    requirements: string[] | null;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
    cancellationPolicy: string | null;
    cancellationHours: number | null;
    minimumNoticeHours: number | null;
    maximumAdvanceDays: number | null;
    allowSameDayBooking: boolean | null;
    sameDayCutoffTime: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
  };
  onSuccess?: () => void;
}

export function TourDetailsTab({ tourId, tour, onSuccess }: TourDetailsTabProps) {
  // Convert tour data to TourFormData format
  const initialData: Partial<TourFormData> = {
    name: tour.name,
    slug: tour.slug ?? "",
    description: tour.description ?? "",
    shortDescription: tour.shortDescription ?? "",
    durationMinutes: tour.durationMinutes,
    minParticipants: tour.minParticipants ?? 1,
    maxParticipants: tour.maxParticipants,
    guestsPerGuide: tour.guestsPerGuide,
    basePrice: tour.basePrice,
    category: tour.category ?? "",
    tags: tour.tags ?? [],
    coverImageUrl: tour.coverImageUrl,
    images: tour.images ?? [],
    includes: tour.includes ?? [],
    excludes: tour.excludes ?? [],
    requirements: tour.requirements ?? [],
    meetingPoint: tour.meetingPoint ?? "",
    meetingPointDetails: tour.meetingPointDetails ?? "",
    cancellationPolicy: tour.cancellationPolicy ?? "",
    cancellationHours: tour.cancellationHours ?? 24,
    minimumNoticeHours: tour.minimumNoticeHours ?? 2,
    maximumAdvanceDays: tour.maximumAdvanceDays ?? 90,
    allowSameDayBooking: tour.allowSameDayBooking ?? true,
    sameDayCutoffTime: tour.sameDayCutoffTime ?? "12:00",
    metaTitle: tour.metaTitle ?? "",
    metaDescription: tour.metaDescription ?? "",
  };

  return (
    <TourForm
      mode="edit"
      tourId={tourId}
      initialData={initialData}
      onSuccess={onSuccess}
    />
  );
}
