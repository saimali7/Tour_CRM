"use client";

import { GuideForm } from "./guide-form";

interface GuideDetailsTabProps {
  guideId: string;
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
  };
  onSuccess?: () => void;
}

export function GuideDetailsTab({ guide, onSuccess }: GuideDetailsTabProps) {
  return <GuideForm guide={guide} onSuccess={onSuccess} />;
}
