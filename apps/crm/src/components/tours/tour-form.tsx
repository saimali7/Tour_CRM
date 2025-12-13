"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, X, Plus } from "lucide-react";
import { SingleImageUploader, ImageUploader } from "@/components/uploads/image-uploader";

interface TourFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  durationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  basePrice: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  images: string[];
  includes: string[];
  excludes: string[];
  requirements: string[];
  meetingPoint: string;
  meetingPointDetails: string;
  cancellationPolicy: string;
  cancellationHours: number;
  metaTitle: string;
  metaDescription: string;
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
    metaTitle: string | null;
    metaDescription: string | null;
  };
}

const COMMON_CATEGORIES = [
  "Walking Tours",
  "Food & Wine",
  "Adventure",
  "Cultural",
  "Historical",
  "Nature",
  "City Tours",
  "Day Trips",
  "Water Activities",
  "Photography",
  "Private Tours",
  "Group Tours",
];

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
    category: tour?.category ?? "",
    tags: tour?.tags ?? [],
    coverImageUrl: tour?.coverImageUrl ?? null,
    images: tour?.images ?? [],
    includes: tour?.includes ?? [],
    excludes: tour?.excludes ?? [],
    requirements: tour?.requirements ?? [],
    meetingPoint: tour?.meetingPoint ?? "",
    meetingPointDetails: tour?.meetingPointDetails ?? "",
    cancellationPolicy: tour?.cancellationPolicy ?? "",
    cancellationHours: tour?.cancellationHours ?? 24,
    metaTitle: tour?.metaTitle ?? "",
    metaDescription: tour?.metaDescription ?? "",
  });

  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(
    !!(tour?.category && !COMMON_CATEGORIES.includes(tour.category))
  );

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
      category: formData.category || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      images: formData.images.length > 0 ? formData.images : undefined,
      includes: formData.includes.length > 0 ? formData.includes : undefined,
      excludes: formData.excludes.length > 0 ? formData.excludes : undefined,
      requirements: formData.requirements.length > 0 ? formData.requirements : undefined,
      meetingPoint: formData.meetingPoint || undefined,
      meetingPointDetails: formData.meetingPointDetails || undefined,
      cancellationPolicy: formData.cancellationPolicy || undefined,
      cancellationHours: formData.cancellationHours,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
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
    field: "includes" | "excludes" | "requirements" | "tags",
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
    field: "includes" | "excludes" | "requirements" | "tags",
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
          <p className="text-xs text-gray-500 mt-1">
            {formData.shortDescription.length}/160 characters
          </p>
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

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          {showCustomCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter custom category"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomCategory(false);
                  setFormData((prev) => ({ ...prev, category: "" }));
                }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Use preset
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Select a category</option>
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCustomCategory(true)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg whitespace-nowrap"
              >
                Custom
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("tags", tagInput, setTagInput);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add tag (e.g., family-friendly, sunset, romantic)"
            />
            <button
              type="button"
              onClick={() => addToList("tags", tagInput, setTagInput)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeFromList("tags", index)}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Images</h2>

        <SingleImageUploader
          value={formData.coverImageUrl}
          onChange={(url) => setFormData((prev) => ({ ...prev, coverImageUrl: url }))}
          label="Cover Image"
          folder="tours/covers"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gallery Images
          </label>
          <ImageUploader
            value={formData.images}
            onChange={(urls) => setFormData((prev) => ({ ...prev, images: urls }))}
            maxFiles={10}
            folder="tours/gallery"
          />
          <p className="text-xs text-gray-500 mt-2">
            The first image will be used as the cover if no cover image is set
          </p>
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

      {/* Inclusions, Exclusions & Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
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
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Not Included</h2>

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
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
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
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Requirements</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList("requirements", requirementInput, setRequirementInput);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Comfortable walking shoes"
            />
            <button
              type="button"
              onClick={() => addToList("requirements", requirementInput, setRequirementInput)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.requirements.length > 0 && (
            <ul className="space-y-2">
              {formData.requirements.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-yellow-50 rounded-lg"
                >
                  <span className="text-sm text-yellow-700">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("requirements", index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
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

      {/* SEO Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">SEO Settings</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title
          </label>
          <input
            type="text"
            value={formData.metaTitle}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Leave blank to use tour name"
            maxLength={60}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.metaTitle.length}/60 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Leave blank to use short description"
            maxLength={160}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.metaDescription.length}/160 characters
          </p>
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
