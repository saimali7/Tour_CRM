"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface TourFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  durationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  basePrice: string;
  includes: string[];
  excludes: string[];
  meetingPoint: string;
  meetingPointDetails: string;
  cancellationPolicy: string;
  cancellationHours: number;
}

interface TourFormProps {
  tour?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    durationMinutes: number;
    minParticipants: number | null;
    maxParticipants: number;
    basePrice: string;
    includes: string[] | null;
    excludes: string[] | null;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
    cancellationPolicy: string | null;
    cancellationHours: number | null;
  };
}

export function TourForm({ tour }: TourFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!tour;

  const [formData, setFormData] = useState<TourFormData>({
    name: tour?.name ?? "",
    slug: tour?.slug ?? "",
    description: tour?.description ?? "",
    shortDescription: tour?.shortDescription ?? "",
    durationMinutes: tour?.durationMinutes ?? 60,
    minParticipants: tour?.minParticipants ?? 1,
    maxParticipants: tour?.maxParticipants ?? 10,
    basePrice: tour?.basePrice ?? "0.00",
    includes: tour?.includes ?? [],
    excludes: tour?.excludes ?? [],
    meetingPoint: tour?.meetingPoint ?? "",
    meetingPointDetails: tour?.meetingPointDetails ?? "",
    cancellationPolicy: tour?.cancellationPolicy ?? "",
    cancellationHours: tour?.cancellationHours ?? 24,
  });

  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.tour.create.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      router.push(`/org/${slug}/tours`);
    },
  });

  const updateMutation = trpc.tour.update.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      utils.tour.getById.invalidate({ id: tour?.id });
      router.push(`/org/${slug}/tours`);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      shortDescription: formData.shortDescription || undefined,
      durationMinutes: formData.durationMinutes,
      minParticipants: formData.minParticipants,
      maxParticipants: formData.maxParticipants,
      basePrice: formData.basePrice,
      includes: formData.includes.length > 0 ? formData.includes : undefined,
      excludes: formData.excludes.length > 0 ? formData.excludes : undefined,
      meetingPoint: formData.meetingPoint || undefined,
      meetingPointDetails: formData.meetingPointDetails || undefined,
      cancellationPolicy: formData.cancellationPolicy || undefined,
      cancellationHours: formData.cancellationHours,
    };

    if (isEditing && tour) {
      updateMutation.mutate({ id: tour.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !isEditing && !prev.slug ? generateSlug(name) : prev.slug,
    }));
  };

  const addToList = (
    field: "includes" | "excludes",
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setValue("");
    }
  };

  const removeFromList = (
    field: "includes" | "excludes",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tour Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., City Walking Tour"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug *
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="city-walking-tour"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Short Description
          </label>
          <input
            type="text"
            value={formData.shortDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="A brief description for listings (max 160 chars)"
            maxLength={160}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Detailed description of the tour..."
          />
        </div>
      </div>

      {/* Pricing & Capacity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Pricing & Capacity</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Price ($) *
            </label>
            <input
              type="text"
              required
              value={formData.basePrice}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  basePrice: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="99.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              type="number"
              required
              min="15"
              value={formData.durationMinutes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  durationMinutes: parseInt(e.target.value) || 60,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Participants
            </label>
            <input
              type="number"
              min="1"
              value={formData.minParticipants}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minParticipants: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Participants *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.maxParticipants}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxParticipants: parseInt(e.target.value) || 10,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Inclusions & Exclusions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What&apos;s Included</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={includeInput}
              onChange={(e) => setIncludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("includes", includeInput, setIncludeInput);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add inclusion"
            />
            <button
              type="button"
              onClick={() => addToList("includes", includeInput, setIncludeInput)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Add
            </button>
          </div>

          {formData.includes.length > 0 && (
            <ul className="space-y-2">
              {formData.includes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg"
                >
                  <span className="text-sm text-green-700">+ {item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("includes", index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">What&apos;s Not Included</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("excludes", excludeInput, setExcludeInput);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add exclusion"
            />
            <button
              type="button"
              onClick={() => addToList("excludes", excludeInput, setExcludeInput)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Add
            </button>
          </div>

          {formData.excludes.length > 0 && (
            <ul className="space-y-2">
              {formData.excludes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg"
                >
                  <span className="text-sm text-red-700">- {item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("excludes", index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Meeting Point */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Meeting Point</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Point Address
            </label>
            <input
              type="text"
              value={formData.meetingPoint}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meetingPoint: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Central Park Entrance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details
            </label>
            <input
              type="text"
              value={formData.meetingPointDetails}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  meetingPointDetails: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Look for the guide with the red umbrella"
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Policies</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Cutoff (hours before)
            </label>
            <input
              type="number"
              min="0"
              value={formData.cancellationHours}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cancellationHours: parseInt(e.target.value) || 24,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Hours before the tour starts that customers can cancel
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Policy
            </label>
            <textarea
              value={formData.cancellationPolicy}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cancellationPolicy: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Describe your cancellation policy..."
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Tour" : "Create Tour"}
        </button>
      </div>
    </form>
  );
}
