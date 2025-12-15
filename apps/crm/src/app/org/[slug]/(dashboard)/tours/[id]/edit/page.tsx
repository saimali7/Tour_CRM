"use client";

import { useCallback, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SingleImageUploader, ImageUploader } from "@/components/uploads/image-uploader";
import { toast } from "sonner";

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

export default function EditTourPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const tourId = params.id as string;

  const { data: tour, isLoading, error } = trpc.tour.getById.useQuery({ id: tourId });
  const utils = trpc.useUtils();

  // Form state - initialized from tour data
  const [formData, setFormData] = useState<{
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
  } | null>(null);

  // Initialize form data when tour loads
  if (tour && !formData) {
    setFormData({
      name: tour.name ?? "",
      slug: tour.slug ?? "",
      description: tour.description ?? "",
      shortDescription: tour.shortDescription ?? "",
      durationMinutes: tour.durationMinutes ?? 60,
      minParticipants: tour.minParticipants ?? 1,
      maxParticipants: tour.maxParticipants ?? 10,
      basePrice: tour.basePrice ?? "0.00",
      category: tour.category ?? "",
      tags: tour.tags ?? [],
      coverImageUrl: tour.coverImageUrl ?? null,
      images: tour.images ?? [],
      includes: tour.includes ?? [],
      excludes: tour.excludes ?? [],
      requirements: tour.requirements ?? [],
      meetingPoint: tour.meetingPoint ?? "",
      meetingPointDetails: tour.meetingPointDetails ?? "",
      cancellationPolicy: tour.cancellationPolicy ?? "",
      cancellationHours: tour.cancellationHours ?? 24,
      metaTitle: tour.metaTitle ?? "",
      metaDescription: tour.metaDescription ?? "",
    });
  }

  // Input states for list fields
  const [tagInput, setTagInput] = useState("");
  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(
    !!(tour?.category && !COMMON_CATEGORIES.includes(tour.category))
  );

  const updateMutation = trpc.tour.update.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      utils.tour.getById.invalidate({ id: tourId });
      toast.success("Tour updated successfully");
      router.push(`/org/${slug}/tours/${tourId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update tour");
    },
  });

  const handleSave = () => {
    if (!formData) return;

    updateMutation.mutate({
      id: tourId,
      data: {
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
      },
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const addToList = (
    field: "includes" | "excludes" | "requirements" | "tags",
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim() && formData) {
      setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
      setValue("");
    }
  };

  const removeFromList = (
    field: "includes" | "excludes" | "requirements" | "tags",
    index: number
  ) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: formData[field].filter((_, i) => i !== index),
      });
    }
  };

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
        <p className="text-destructive">Error loading tour: {error.message}</p>
      </div>
    );
  }

  if (!tour || !formData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Tour not found</p>
      </div>
    );
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/tours/${tourId}` as Route}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Tour</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tour.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/org/${slug}/tours/${tourId}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-6"
      >
        {/* Basic Information */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Tour Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="e.g., City Walking Tour"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="city-walking-tour"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Short Description
            </label>
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="A brief description for listings (max 160 chars)"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.shortDescription.length}/160 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Full Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder="Detailed description of the tour..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            {showCustomCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Enter custom category"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setFormData({ ...formData, category: "" });
                  }}
                  className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg"
                >
                  Use preset
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
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
                  className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg whitespace-nowrap"
                >
                  Custom
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Tags</label>
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
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Add tag and press Enter"
              />
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeFromList("tags", index)}
                      className="hover:text-primary/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Images */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Images</h2>

          <SingleImageUploader
            value={formData.coverImageUrl}
            onChange={(url) => setFormData({ ...formData, coverImageUrl: url })}
            label="Cover Image"
            folder="tours/covers"
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Gallery Images
            </label>
            <ImageUploader
              value={formData.images}
              onChange={(urls) => setFormData({ ...formData, images: urls })}
              maxFiles={10}
              folder="tours/gallery"
            />
          </div>
        </section>

        {/* Pricing & Capacity */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Pricing & Capacity</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Base Price ($) *
              </label>
              <input
                type="text"
                required
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="99.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Duration (min) *
              </label>
              <input
                type="number"
                required
                min="15"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })
                }
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Min Participants
              </label>
              <input
                type="number"
                min="1"
                value={formData.minParticipants}
                onChange={(e) =>
                  setFormData({ ...formData, minParticipants: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Max Participants *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxParticipants}
                onChange={(e) =>
                  setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          </div>
        </section>

        {/* Inclusions, Exclusions & Requirements */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">What's Included</h3>
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
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                placeholder="Add item"
              />
            </div>
            {formData.includes.length > 0 && (
              <ul className="space-y-1.5">
                {formData.includes.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-1.5 bg-success/10 rounded-lg text-sm">
                    <span className="text-success">+ {item}</span>
                    <button type="button" onClick={() => removeFromList("includes", i)} className="text-muted-foreground hover:text-destructive">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Not Included</h3>
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
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                placeholder="Add item"
              />
            </div>
            {formData.excludes.length > 0 && (
              <ul className="space-y-1.5">
                {formData.excludes.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-1.5 bg-destructive/10 rounded-lg text-sm">
                    <span className="text-destructive">- {item}</span>
                    <button type="button" onClick={() => removeFromList("excludes", i)} className="text-muted-foreground hover:text-destructive">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Requirements</h3>
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
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                placeholder="Add item"
              />
            </div>
            {formData.requirements.length > 0 && (
              <ul className="space-y-1.5">
                {formData.requirements.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-3 py-1.5 bg-warning/10 rounded-lg text-sm">
                    <span className="text-warning">{item}</span>
                    <button type="button" onClick={() => removeFromList("requirements", i)} className="text-muted-foreground hover:text-destructive">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Meeting Point */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Meeting Point</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Meeting Point Address
              </label>
              <input
                type="text"
                value={formData.meetingPoint}
                onChange={(e) => setFormData({ ...formData, meetingPoint: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="e.g., Central Park Entrance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Additional Details
              </label>
              <input
                type="text"
                value={formData.meetingPointDetails}
                onChange={(e) => setFormData({ ...formData, meetingPointDetails: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="e.g., Look for the guide with the red umbrella"
              />
            </div>
          </div>
        </section>

        {/* Policies */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Policies</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Cancellation Cutoff (hours before)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cancellationHours}
                onChange={(e) =>
                  setFormData({ ...formData, cancellationHours: parseInt(e.target.value) || 24 })
                }
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Cancellation Policy
              </label>
              <textarea
                value={formData.cancellationPolicy}
                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Describe your cancellation policy..."
              />
            </div>
          </div>
        </section>

        {/* SEO Settings */}
        <section className="bg-card rounded-xl border border-border p-6 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">SEO Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Meta Title
              </label>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Leave blank to use tour name"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.metaTitle.length}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Meta Description
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                placeholder="Leave blank to use short description"
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.metaDescription.length}/160 characters
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Save Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/org/${slug}/tours/${tourId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
