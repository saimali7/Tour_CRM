"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, X, Plus, Clapperboard, Play } from "lucide-react";
import { SingleImageUploader, ImageUploader } from "@/components/uploads/image-uploader";
import { DurationInput } from "@/components/ui/duration-input";
import { toast } from "sonner";

export interface TourFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  durationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  guestsPerGuide: number;
  basePrice: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  images: string[];
  shortVideos: string[];
  includes: string[];
  excludes: string[];
  requirements: string[];
  meetingPoint: string;
  meetingPointDetails: string;
  cancellationPolicy: string;
  cancellationHours: number;
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
  allowSameDayBooking: boolean;
  sameDayCutoffTime: string;
  metaTitle: string;
  metaDescription: string;
}

interface TourFormProps {
  /** Mode: create or edit */
  mode?: "create" | "edit";
  /** Tour ID required for edit mode */
  tourId?: string;
  /** Initial data for edit mode */
  initialData?: Partial<TourFormData>;
  /** Optional callback when tour is successfully created/updated */
  onSuccess?: (tourId: string) => void;
  /** Optional cancel handler */
  onCancel?: () => void;
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

export function TourForm({
  mode = "create",
  tourId,
  initialData,
  onSuccess,
  onCancel,
}: TourFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const defaultFormData: TourFormData = {
    name: "",
    slug: "",
    description: "",
    shortDescription: "",
    durationMinutes: 360,
    minParticipants: 1,
    maxParticipants: 10,
    guestsPerGuide: 6,
    basePrice: "0.00",
    category: "",
    tags: [],
    coverImageUrl: null,
    images: [],
    shortVideos: [],
    includes: [],
    excludes: [],
    requirements: [],
    meetingPoint: "",
    meetingPointDetails: "",
    cancellationPolicy: "",
    cancellationHours: 24,
    minimumNoticeHours: 2,
    maximumAdvanceDays: 90,
    allowSameDayBooking: true,
    sameDayCutoffTime: "12:00",
    metaTitle: "",
    metaDescription: "",
  };

  const [formData, setFormData] = useState<TourFormData>({
    ...defaultFormData,
    ...initialData,
    // Ensure arrays are properly initialized
    tags: initialData?.tags ?? [],
    images: initialData?.images ?? [],
    shortVideos: initialData?.shortVideos ?? [],
    includes: initialData?.includes ?? [],
    excludes: initialData?.excludes ?? [],
    requirements: initialData?.requirements ?? [],
  });

  const [includeInput, setIncludeInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [requirementInput, setRequirementInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [shortVideoInput, setShortVideoInput] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.tour.create.useMutation({
    onSuccess: (newTour) => {
      utils.tour.list.invalidate();
      toast.success("Tour created successfully");
      if (onSuccess) {
        onSuccess(newTour.id);
      } else {
        // Redirect to detail page so user can set up schedules
        router.push(`/org/${slug}/tours/${newTour.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create tour");
    },
  });

  const updateMutation = trpc.tour.update.useMutation({
    onSuccess: () => {
      utils.tour.list.invalidate();
      utils.tour.getById.invalidate({ id: tourId! });
      toast.success("Tour updated successfully");
      if (onSuccess && tourId) {
        onSuccess(tourId);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update tour");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      shortDescription: formData.shortDescription || undefined,
      durationMinutes: formData.durationMinutes,
      minParticipants: formData.minParticipants,
      maxParticipants: formData.maxParticipants,
      guestsPerGuide: formData.guestsPerGuide,
      basePrice: formData.basePrice,
      category: formData.category || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      images: formData.images.length > 0 ? formData.images : undefined,
      media:
        formData.images.length > 0 || formData.shortVideos.length > 0
          ? [
              ...formData.images.map((url, index) => ({
                type: "image" as const,
                url,
                sortOrder: index,
              })),
              ...formData.shortVideos.map((url, index) => ({
                type: "short" as const,
                url,
                sortOrder: formData.images.length + index,
              })),
            ]
          : undefined,
      includes: formData.includes.length > 0 ? formData.includes : undefined,
      excludes: formData.excludes.length > 0 ? formData.excludes : undefined,
      requirements: formData.requirements.length > 0 ? formData.requirements : undefined,
      meetingPoint: formData.meetingPoint || undefined,
      meetingPointDetails: formData.meetingPointDetails || undefined,
      cancellationPolicy: formData.cancellationPolicy || undefined,
      cancellationHours: formData.cancellationHours,
      minimumNoticeHours: formData.minimumNoticeHours,
      maximumAdvanceDays: formData.maximumAdvanceDays,
      allowSameDayBooking: formData.allowSameDayBooking,
      sameDayCutoffTime: formData.allowSameDayBooking
        ? formData.sameDayCutoffTime || undefined
        : undefined,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
    };

    if (mode === "edit" && tourId) {
      updateMutation.mutate({ id: tourId, data: payload });
    } else {
      createMutation.mutate(payload);
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
      // Auto-generate slug from name if slug is empty
      slug: !prev.slug ? generateSlug(name) : prev.slug,
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

  const addShortVideo = () => {
    const url = shortVideoInput.trim();
    if (!url) {
      return;
    }

    if (formData.shortVideos.includes(url)) {
      setShortVideoInput("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      shortVideos: [...prev.shortVideos, url],
    }));
    setShortVideoInput("");
  };

  const removeShortVideo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      shortVideos: prev.shortVideos.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {(createMutation.error || updateMutation.error) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {createMutation.error?.message || updateMutation.error?.message}
          </p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tour Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., City Walking Tour"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              URL Slug *
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="city-walking-tour"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Short Description
          </label>
          <input
            type="text"
            value={formData.shortDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))
            }
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="A brief description for listings (max 160 chars)"
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.shortDescription.length}/160 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Full Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Detailed description of the tour..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
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
                className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter custom category"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomCategory(false);
                  setFormData((prev) => ({ ...prev, category: "" }));
                }}
                className="px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg"
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
                className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                className="px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg whitespace-nowrap"
              >
                Custom
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
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
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add tag (e.g., family-friendly, sunset, romantic)"
            />
            <button
              type="button"
              onClick={() => addToList("tags", tagInput, setTagInput)}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeFromList("tags", index)}
                    className="hover:text-primary/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Media Gallery</h2>

        <SingleImageUploader
          value={formData.coverImageUrl}
          onChange={(url) => setFormData((prev) => ({ ...prev, coverImageUrl: url }))}
          label="Cover Image"
          folder="tours/covers"
          orgSlug={slug}
        />

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Gallery Photos
          </label>
          <ImageUploader
            value={formData.images}
            onChange={(urls) => setFormData((prev) => ({ ...prev, images: urls }))}
            maxFiles={10}
            folder="tours/gallery"
            orgSlug={slug}
          />
          <p className="text-xs text-muted-foreground mt-2">
            The first image will be used as the cover if no cover image is set
          </p>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <label className="block text-sm font-medium text-foreground">
            Vertical Shorts
            <span className="ml-2 font-normal text-muted-foreground">Direct video URLs</span>
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={shortVideoInput}
              onChange={(e) => setShortVideoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addShortVideo();
                }
              }}
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="https://cdn.example.com/shorts/teaser.mp4"
            />
            <button
              type="button"
              onClick={addShortVideo}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use direct MP4/WebM links. Vertical (9:16) clips look best in the storefront.
          </p>

          {formData.shortVideos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {formData.shortVideos.map((url, index) => (
                <div key={`${url}-${index}`} className="relative rounded-xl overflow-hidden border border-border bg-black aspect-[9/16] group">
                  <video
                    src={url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                  />
                  <button
                    type="button"
                    onClick={() => removeShortVideo(index)}
                    className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove short video ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                    <Clapperboard className="h-3 w-3" />
                    Short
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(formData.coverImageUrl || formData.images.length > 0 || formData.shortVideos.length > 0) && (
          <div className="space-y-3 border-t border-border pt-5">
            <label className="block text-sm font-medium text-foreground">Preview</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {formData.coverImageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3]">
                  <img src={formData.coverImageUrl} alt="Cover preview" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">Cover</span>
                </div>
              )}
              {formData.images.map((url, index) => (
                <div key={`${url}-${index}`} className="rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3]">
                  <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
              {formData.shortVideos.map((url, index) => (
                <div key={`${url}-preview-${index}`} className="relative rounded-xl overflow-hidden border border-border bg-black aspect-[9/16]">
                  <video
                    src={url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                  />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                    <Play className="h-3 w-3" />
                    Short
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing & Capacity */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Pricing & Capacity</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="99.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Duration *
            </label>
            <DurationInput
              value={formData.durationMinutes}
              onChange={(minutes) =>
                setFormData((prev) => ({
                  ...prev,
                  durationMinutes: minutes,
                }))
              }
              min={15}
              max={1440}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Guests per Guide
            </label>
            <input
              type="number"
              min="1"
              value={formData.guestsPerGuide}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  guestsPerGuide: parseInt(e.target.value) || 6,
                }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculates guides needed per booking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Inclusions, Exclusions & Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">What&apos;s Included</h2>

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
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add inclusion"
            />
            <button
              type="button"
              onClick={() => addToList("includes", includeInput, setIncludeInput)}
              className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.includes.length > 0 && (
            <ul className="space-y-2">
              {formData.includes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-success/10 rounded-lg"
                >
                  <span className="text-sm text-success">+ {item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("includes", index)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Not Included</h2>

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
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Add exclusion"
            />
            <button
              type="button"
              onClick={() => addToList("excludes", excludeInput, setExcludeInput)}
              className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.excludes.length > 0 && (
            <ul className="space-y-2">
              {formData.excludes.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-destructive/10 rounded-lg"
                >
                  <span className="text-sm text-destructive">- {item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("excludes", index)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Requirements</h2>

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
              className="flex-1 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Comfortable walking shoes"
            />
            <button
              type="button"
              onClick={() => addToList("requirements", requirementInput, setRequirementInput)}
              className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {formData.requirements.length > 0 && (
            <ul className="space-y-2">
              {formData.requirements.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-warning/10 rounded-lg"
                >
                  <span className="text-sm text-warning">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeFromList("requirements", index)}
                    className="text-destructive hover:text-destructive/80"
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
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Meeting Point</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Meeting Point Address
            </label>
            <input
              type="text"
              value={formData.meetingPoint}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meetingPoint: e.target.value }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Central Park Entrance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Look for the guide with the red umbrella"
            />
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Policies</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Hours before the tour starts that customers can cancel
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Describe your cancellation policy..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Minimum Notice (hours)
            </label>
            <input
              type="number"
              min="0"
              max="720"
              value={formData.minimumNoticeHours}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minimumNoticeHours: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only used when same-day booking is disabled
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max Advance Booking (days)
            </label>
            <input
              type="number"
              min="1"
              max="3650"
              value={formData.maximumAdvanceDays}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maximumAdvanceDays: parseInt(e.target.value, 10) || 90,
                }))
              }
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Allow Same-Day Booking
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Enable bookings for today and control a daily cutoff time
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.allowSameDayBooking}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  allowSameDayBooking: !prev.allowSameDayBooking,
                }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.allowSameDayBooking ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.allowSameDayBooking ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {formData.allowSameDayBooking && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Same-Day Booking Cutoff Time
              </label>
              <input
                type="time"
                value={formData.sameDayCutoffTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sameDayCutoffTime: e.target.value,
                  }))
                }
                className="w-full md:w-64 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Bookings for today are allowed only before this time
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">SEO Settings</h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Meta Title
          </label>
          <input
            type="text"
            value={formData.metaTitle}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
            }
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Leave blank to use tour name"
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.metaTitle.length}/60 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Meta Description
          </label>
          <textarea
            value={formData.metaDescription}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
            }
            rows={2}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Leave blank to use short description"
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.metaDescription.length}/160 characters
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel ?? (() => router.back())}
          className="px-4 py-2 text-foreground hover:bg-muted rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Save Changes" : "Create Tour"}
        </button>
      </div>
    </form>
  );
}
