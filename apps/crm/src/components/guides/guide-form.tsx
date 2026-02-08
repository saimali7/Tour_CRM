"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Route } from "next";
import { trpc } from "@/lib/trpc";
import { Loader2, X, Plus, User, Phone, Globe, Award, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface GuideFormProps {
  guide?: {
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
  onCancel?: () => void;
  onSuccess?: () => void;
  /** HTML form id — allows external buttons to trigger submit via form="id" */
  formId?: string;
  /** Hide built-in action buttons (cancel/submit) when the parent provides its own */
  hideActions?: boolean;
}

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
];

export function GuideForm({ guide, onCancel, onSuccess, formId, hideActions }: GuideFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!guide;

  const [formData, setFormData] = useState({
    firstName: guide?.firstName ?? "",
    lastName: guide?.lastName ?? "",
    email: guide?.email ?? "",
    phone: guide?.phone ?? "",
    bio: guide?.bio ?? "",
    shortBio: guide?.shortBio ?? "",
    languages: guide?.languages ?? ["en"],
    certifications: guide?.certifications ?? [],
    emergencyContactName: guide?.emergencyContactName ?? "",
    emergencyContactPhone: guide?.emergencyContactPhone ?? "",
    status: guide?.status ?? "active",
    isPublic: guide?.isPublic ?? false,
    notes: guide?.notes ?? "",
  });

  const [newCertification, setNewCertification] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.guide.create.useMutation({
    onSuccess: (newGuide) => {
      utils.guide.list.invalidate();
      toast.success("Guide created successfully");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/org/${slug}/guides/${newGuide.id}` as Route);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create guide");
    },
  });

  const updateMutation = trpc.guide.update.useMutation({
    onSuccess: () => {
      utils.guide.list.invalidate();
      utils.guide.getById.invalidate({ id: guide?.id });
      utils.guide.getByIdWithStats.invalidate({ id: guide?.id });
      toast.success("Guide updated successfully");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/org/${slug}/guides/${guide?.id}` as Route);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update guide");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      bio: formData.bio || undefined,
      shortBio: formData.shortBio || undefined,
      languages: formData.languages.length > 0 ? formData.languages : undefined,
      certifications: formData.certifications.length > 0 ? formData.certifications : undefined,
      emergencyContactName: formData.emergencyContactName || undefined,
      emergencyContactPhone: formData.emergencyContactPhone || undefined,
      status: formData.status as "active" | "inactive" | "on_leave",
      isPublic: formData.isPublic,
      notes: formData.notes || undefined,
    };

    if (isEditing && guide) {
      updateMutation.mutate({
        id: guide.id,
        data: submitData,
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }));
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }));
  };

  const toggleLanguage = (langCode: string) => {
    setFormData((prev) => {
      const hasLanguage = prev.languages.includes(langCode);
      if (hasLanguage) {
        // Don't allow removing the last language
        if (prev.languages.length === 1) {
          return prev;
        }
        return {
          ...prev,
          languages: prev.languages.filter((l) => l !== langCode),
        };
      } else {
        return {
          ...prev,
          languages: [...prev.languages, langCode],
        };
      }
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border status-cancelled p-4">
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Short Bio
          </label>
          <input
            type="text"
            value={formData.shortBio}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, shortBio: e.target.value }))
            }
            placeholder="Brief description (1-2 sentences)"
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used for quick previews and listings
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Full Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bio: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Detailed biography, experience, and expertise..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Displayed on guide profile pages
          </p>
        </div>
      </div>

      {/* Contact & Emergency */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Emergency Contact</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Emergency Contact Name
            </label>
            <input
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, emergencyContactName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Qualifications */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Qualifications</h2>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Languages Spoken *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  formData.languages.includes(lang.code)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Select all languages the guide can conduct tours in
          </p>
        </div>

        {/* Certifications */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Certifications & Licenses
          </label>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCertification();
                  }
                }}
                placeholder="Add a certification..."
                className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={addCertification}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {formData.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCertification(cert)}
                      className="hover:text-primary/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Settings */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value as "active" | "inactive" | "on_leave" }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                }
                className="w-4 h-4 text-primary border-input rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Show on Booking Website
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Display this guide's profile on the public booking website
            </p>
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Internal Notes</h2>
        </div>

        <div>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Private notes about this guide (not visible to customers)..."
          />
        </div>
      </div>

      {/* Submit */}
      {!hideActions && (
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else if (isEditing && guide) {
                router.push(`/org/${slug}/guides/${guide.id}` as Route);
              } else {
                router.push(`/org/${slug}/guides` as Route);
              }
            }}
            className="px-4 py-2 text-foreground hover:bg-accent rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Update Guide" : "Create Guide"}
          </button>
        </div>
      )}
    </form>
  );
}
