"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  FileText,
  Settings,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ArrowLeft,
  Save,
  Send,
  X,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useIsMobile } from "@/hooks/use-media-query";

// Tab Components
import { EssentialsTab } from "./tour-creator/essentials-tab";
import { PricingTab, type PricingFormState } from "./tour-creator/pricing-tab";
import { ContentTab } from "./tour-creator/content-tab";
import { SettingsTab } from "./tour-creator/settings-tab";

// Types
export interface TourFormState {
  // Essentials
  name: string;
  category: string;
  basePrice: string;
  durationMinutes: number;
  maxParticipants: number;
  minParticipants: number;
  shortDescription: string;

  // Content
  description: string;
  includes: string[];
  excludes: string[];
  requirements: string[];
  coverImageUrl: string | null;
  images: string[];
  tags: string[];

  // Settings
  slug: string;
  meetingPoint: string;
  meetingPointDetails: string;
  cancellationHours: number;
  cancellationPolicy: string;
  metaTitle: string;
  metaDescription: string;

  // Booking window
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
  allowSameDayBooking: boolean;
  sameDayCutoffTime: string;

  // Pricing configuration (for creating default booking option)
  pricingConfig?: PricingFormState;
}

interface TourCreatorProps {
  mode?: "create" | "edit";
  tourId?: string;
  initialData?: Partial<TourFormState>;
}

type TabId = "essentials" | "pricing" | "content" | "settings";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}

const TABS: Tab[] = [
  { id: "essentials", label: "Essentials", shortLabel: "Basics", icon: Sparkles, description: "Name, price & capacity" },
  { id: "pricing", label: "Pricing", shortLabel: "Price", icon: DollarSign, description: "Pricing & capacity" },
  { id: "content", label: "Content", shortLabel: "Content", icon: FileText, description: "Description & images" },
  { id: "settings", label: "Settings", shortLabel: "Config", icon: Settings, description: "Policies & SEO" },
];

const DEFAULT_FORM_STATE: TourFormState = {
  // Essentials
  name: "",
  category: "",
  basePrice: "",
  durationMinutes: 120,
  maxParticipants: 15,
  minParticipants: 1,
  shortDescription: "",

  // Content
  description: "",
  includes: [],
  excludes: [],
  requirements: [],
  coverImageUrl: null,
  images: [],
  tags: [],

  // Settings
  slug: "",
  meetingPoint: "",
  meetingPointDetails: "",
  cancellationHours: 24,
  cancellationPolicy: "",
  metaTitle: "",
  metaDescription: "",

  // Booking window
  minimumNoticeHours: 2,
  maximumAdvanceDays: 90,
  allowSameDayBooking: true,
  sameDayCutoffTime: "12:00",
};

// Smart defaults based on category
const CATEGORY_DEFAULTS: Record<string, Partial<TourFormState>> = {
  "Walking Tours": {
    durationMinutes: 120,
    maxParticipants: 15,
    includes: ["Professional guide", "Bottled water"],
    requirements: ["Comfortable walking shoes", "Weather-appropriate clothing"],
  },
  "Food & Wine": {
    durationMinutes: 180,
    maxParticipants: 12,
    includes: ["Food tastings", "Local guide", "All food samples"],
    excludes: ["Alcoholic beverages", "Transportation"],
    requirements: ["Please advise of dietary restrictions"],
  },
  "Adventure": {
    durationMinutes: 240,
    maxParticipants: 10,
    includes: ["Safety equipment", "Professional instructor", "Insurance"],
    requirements: ["Good physical condition", "Signed waiver"],
  },
  "Cultural": {
    durationMinutes: 150,
    maxParticipants: 20,
    includes: ["Expert guide", "Entrance fees", "Headsets for large groups"],
  },
  "Historical": {
    durationMinutes: 120,
    maxParticipants: 20,
    includes: ["Historian guide", "Historical maps/materials"],
  },
  "Nature": {
    durationMinutes: 180,
    maxParticipants: 12,
    includes: ["Nature guide", "Binoculars (upon request)"],
    requirements: ["Hiking boots recommended", "Bring sunscreen"],
  },
  "City Tours": {
    durationMinutes: 180,
    maxParticipants: 15,
    includes: ["Local guide", "City map"],
  },
  "Day Trips": {
    durationMinutes: 480,
    maxParticipants: 20,
    includes: ["Transportation", "Professional guide", "Lunch"],
  },
  "Water Activities": {
    durationMinutes: 180,
    maxParticipants: 8,
    includes: ["Equipment rental", "Safety briefing", "Instructor"],
    requirements: ["Swimming ability required", "Towel and sunscreen"],
  },
  "Photography": {
    durationMinutes: 180,
    maxParticipants: 8,
    includes: ["Professional photographer guide", "Photo tips and tricks"],
    requirements: ["Bring your own camera"],
  },
  "Private Tours": {
    durationMinutes: 180,
    maxParticipants: 6,
    includes: ["Private guide", "Customized itinerary", "Flexible schedule"],
  },
  "Group Tours": {
    durationMinutes: 180,
    maxParticipants: 25,
    includes: ["Group guide", "Audio headsets"],
  },
};

export function TourCreator({ mode = "create", tourId, initialData }: TourCreatorProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<TabId>("essentials");
  const [formState, setFormState] = useState<TourFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialData,
  });
  const [touchedTabs, setTouchedTabs] = useState<Set<TabId>>(new Set(["essentials"]));
  const [showMobileActions, setShowMobileActions] = useState(false);

  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.tour.create.useMutation();
  const updateMutation = trpc.tour.update.useMutation();
  const createBookingOptionMutation = trpc.bookingOptions.create.useMutation();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Update form state
  const updateForm = useCallback((updates: Partial<TourFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle category change with smart defaults
  const handleCategoryChange = useCallback((category: string) => {
    const defaults = CATEGORY_DEFAULTS[category];
    if (defaults && !formState.name) {
      // Only apply defaults if form is mostly empty
      setFormState((prev) => ({
        ...prev,
        category,
        ...defaults,
        // Don't override if already set
        durationMinutes: prev.durationMinutes !== 120 ? prev.durationMinutes : (defaults.durationMinutes ?? 120),
        maxParticipants: prev.maxParticipants !== 15 ? prev.maxParticipants : (defaults.maxParticipants ?? 15),
        includes: prev.includes.length > 0 ? prev.includes : (defaults.includes ?? []),
        excludes: prev.excludes.length > 0 ? prev.excludes : (defaults.excludes ?? []),
        requirements: prev.requirements.length > 0 ? prev.requirements : (defaults.requirements ?? []),
      }));
    } else {
      updateForm({ category });
    }
  }, [formState.name, updateForm]);

  // Tab completion status
  const tabCompletion = useMemo(() => {
    const essentialsComplete = !!(
      formState.name &&
      formState.category &&
      formState.basePrice &&
      parseFloat(formState.basePrice) > 0 &&
      formState.durationMinutes > 0 &&
      formState.maxParticipants > 0
    );

    // Check if pricing is configured
    const pc = formState.pricingConfig;
    let pricingComplete = false;
    if (pc) {
      switch (pc.pricingType) {
        case "per_person":
          pricingComplete = !!pc.adultPrice && parseFloat(pc.adultPrice) > 0;
          break;
        case "per_unit":
          pricingComplete = !!pc.pricePerUnit && parseFloat(pc.pricePerUnit) > 0;
          break;
        case "flat_rate":
          pricingComplete = !!pc.flatPrice && parseFloat(pc.flatPrice) > 0;
          break;
        case "base_plus_person":
          pricingComplete = !!pc.basePricePricing && parseFloat(pc.basePricePricing) > 0;
          break;
        case "tiered_group":
          pricingComplete = pc.tierRanges.length > 0 &&
            pc.tierRanges.every(t => t.price && parseFloat(t.price) > 0);
          break;
      }
    }

    const contentComplete = !!(
      formState.description ||
      formState.includes.length > 0 ||
      formState.images.length > 0 ||
      formState.coverImageUrl
    );

    const settingsComplete = !!formState.meetingPoint;

    return {
      essentials: { complete: essentialsComplete, required: true },
      pricing: { complete: pricingComplete, required: false },
      content: { complete: contentComplete, required: false },
      settings: { complete: settingsComplete, required: false },
    };
  }, [formState]);

  // Can navigate to tab?
  const canNavigateToTab = useCallback(
    (tabId: TabId): boolean => {
      // Can always go back or to essentials
      if (tabId === "essentials") return true;

      // Must complete essentials to proceed
      if (!tabCompletion.essentials.complete) return false;

      return true;
    },
    [tabCompletion]
  );

  // Navigate tabs
  const goToTab = useCallback(
    (tabId: TabId) => {
      if (canNavigateToTab(tabId)) {
        setActiveTab(tabId);
        setTouchedTabs((prev) => new Set([...prev, tabId]));
      }
    },
    [canNavigateToTab]
  );

  const goNext = useCallback(() => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      const nextTab = TABS[currentIndex + 1];
      if (nextTab) goToTab(nextTab.id);
    }
  }, [activeTab, goToTab]);

  const goPrevious = useCallback(() => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      const prevTab = TABS[currentIndex - 1];
      if (prevTab) goToTab(prevTab.id);
    }
  }, [activeTab, goToTab]);

  // Generate slug from name
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, []);

  // Handle name change with auto-slug
  const handleNameChange = useCallback(
    (name: string) => {
      updateForm({
        name,
        slug: !formState.slug ? generateSlug(name) : formState.slug,
      });
    },
    [formState.slug, generateSlug, updateForm]
  );

  // Save tour
  const handleSave = useCallback(
    async (publish: boolean = false) => {
      if (!tabCompletion.essentials.complete) {
        toast.error("Please complete all required fields in Essentials");
        setActiveTab("essentials");
        return;
      }

      try {
        const payload = {
          name: formState.name,
          slug: formState.slug || generateSlug(formState.name),
          description: formState.description || undefined,
          shortDescription: formState.shortDescription || undefined,
          durationMinutes: formState.durationMinutes,
          minParticipants: formState.minParticipants,
          maxParticipants: formState.maxParticipants,
          basePrice: formState.basePrice,
          category: formState.category || undefined,
          tags: formState.tags.length > 0 ? formState.tags : undefined,
          coverImageUrl: formState.coverImageUrl || undefined,
          images: formState.images.length > 0 ? formState.images : undefined,
          includes: formState.includes.length > 0 ? formState.includes : undefined,
          excludes: formState.excludes.length > 0 ? formState.excludes : undefined,
          requirements: formState.requirements.length > 0 ? formState.requirements : undefined,
          meetingPoint: formState.meetingPoint || undefined,
          meetingPointDetails: formState.meetingPointDetails || undefined,
          cancellationPolicy: formState.cancellationPolicy || undefined,
          cancellationHours: formState.cancellationHours,
          minimumNoticeHours: formState.minimumNoticeHours,
          maximumAdvanceDays: formState.maximumAdvanceDays,
          allowSameDayBooking: formState.allowSameDayBooking,
          sameDayCutoffTime: formState.sameDayCutoffTime || undefined,
          metaTitle: formState.metaTitle || undefined,
          metaDescription: formState.metaDescription || undefined,
          status: publish ? "active" as const : "draft" as const,
        };

        let savedTourId: string;

        if (mode === "edit" && tourId) {
          await updateMutation.mutateAsync({ id: tourId, data: payload });
          savedTourId = tourId;
          toast.success("Tour updated successfully");
        } else {
          const result = await createMutation.mutateAsync(payload);
          savedTourId = result.id;
          toast.success("Tour created successfully");

          // Create default booking option from pricing config
          if (formState.pricingConfig && tabCompletion.pricing.complete) {
            try {
              const pc = formState.pricingConfig;

              // Build pricing model based on type
              const buildPricingModel = () => {
                const createId = () => Math.random().toString(36).slice(2, 9);

                switch (pc.pricingType) {
                  case "per_person": {
                    const tiers = [
                      {
                        id: createId(),
                        name: "adult",
                        price: { amount: Math.round(parseFloat(pc.adultPrice || "0") * 100), currency: "USD" },
                        ageMin: 13,
                        isDefault: true,
                        sortOrder: 0,
                      },
                    ];
                    if (pc.hasChildPrice && pc.childPrice) {
                      tiers.push({
                        id: createId(),
                        name: "child",
                        price: { amount: Math.round(parseFloat(pc.childPrice) * 100), currency: "USD" },
                        ageMin: 3,
                        ageMax: 12,
                        isDefault: false,
                        sortOrder: 1,
                      } as typeof tiers[0]);
                    }
                    if (pc.hasInfantPrice) {
                      tiers.push({
                        id: createId(),
                        name: "infant",
                        price: { amount: Math.round(parseFloat(pc.infantPrice || "0") * 100), currency: "USD" },
                        ageMin: 0,
                        ageMax: 2,
                        isDefault: false,
                        sortOrder: 2,
                      } as typeof tiers[0]);
                    }
                    return { type: "per_person" as const, tiers };
                  }
                  case "per_unit":
                    return {
                      type: "per_unit" as const,
                      unitName: "Vehicle",
                      unitNamePlural: "Vehicles",
                      pricePerUnit: { amount: Math.round(parseFloat(pc.pricePerUnit || "0") * 100), currency: "USD" },
                      maxOccupancy: parseInt(pc.maxOccupancy) || 6,
                      minOccupancy: 1,
                    };
                  case "flat_rate":
                    return {
                      type: "flat_rate" as const,
                      price: { amount: Math.round(parseFloat(pc.flatPrice || "0") * 100), currency: "USD" },
                      maxParticipants: parseInt(pc.flatMaxParticipants) || 10,
                    };
                  case "tiered_group":
                    return {
                      type: "tiered_group" as const,
                      tiers: pc.tierRanges.map((tier) => ({
                        minSize: parseInt(tier.min) || 1,
                        maxSize: parseInt(tier.max) || 10,
                        price: { amount: Math.round(parseFloat(tier.price || "0") * 100), currency: "USD" },
                      })),
                    };
                  case "base_plus_person":
                    return {
                      type: "base_plus_person" as const,
                      basePrice: { amount: Math.round(parseFloat(pc.basePricePricing || "0") * 100), currency: "USD" },
                      perPersonPrice: { amount: Math.round(parseFloat(pc.pricePerAdditional || "0") * 100), currency: "USD" },
                      includedParticipants: parseInt(pc.includedParticipants) || 2,
                      maxParticipants: parseInt(pc.baseMaxParticipants) || 10,
                    };
                  default:
                    return { type: "per_person" as const, tiers: [] };
                }
              };

              // Build capacity model
              const buildCapacityModel = () => {
                if (pc.capacityType === "shared") {
                  return { type: "shared" as const, totalSeats: parseInt(pc.totalSeats) || formState.maxParticipants };
                }
                return {
                  type: "unit" as const,
                  totalUnits: parseInt(pc.totalUnits) || 3,
                  occupancyPerUnit: parseInt(pc.occupancyPerUnit) || 6,
                };
              };

              await createBookingOptionMutation.mutateAsync({
                tourId: savedTourId,
                name: "Standard Experience",
                shortDescription: "Join our regular tour",
                pricingModel: buildPricingModel(),
                capacityModel: buildCapacityModel(),
                schedulingType: "fixed",
                isDefault: true,
              });
              toast.success("Booking option created");
            } catch {
              // Don't fail the whole flow, the tour is created
            }
          }
        }

        utils.tour.list.invalidate();
        router.push(`/org/${slug}/tours/${savedTourId}`);
      } catch (error) {
        toast.error(mode === "edit" ? "Failed to update tour" : "Failed to create tour");
      }
    },
    [
      tabCompletion,
      formState,
      generateSlug,
      mode,
      tourId,
      createMutation,
      updateMutation,
      createBookingOptionMutation,
      utils,
      router,
      slug,
    ]
  );

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header - Responsive */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors touch-target"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {mode === "edit" ? "Edit Tour" : "Create Tour"}
              </h1>
              {formState.name && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{formState.name}</p>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting || !tabCompletion.essentials.complete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSubmitting || !tabCompletion.essentials.complete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {mode === "edit" ? "Save & Publish" : "Create & Publish"}
            </button>
          </div>

          {/* Mobile Save Button */}
          <button
            type="button"
            onClick={() => setShowMobileActions(true)}
            className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground touch-target"
            aria-label="Save options"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Tabs - Responsive */}
        <div className="px-4 sm:px-6 pb-0 overflow-x-auto scrollbar-hide">
          <nav className="flex gap-1 min-w-max" role="tablist">
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const isCompleted = tabCompletion[tab.id].complete;
              const canNavigate = canNavigateToTab(tab.id);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => goToTab(tab.id)}
                  disabled={!canNavigate}
                  className={cn(
                    "relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-t-lg transition-all touch-target",
                    isActive
                      ? "bg-card text-foreground border-t border-l border-r border-border -mb-px"
                      : canNavigate
                        ? "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        : "text-muted-foreground/50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs transition-colors",
                      isCompleted
                        ? "bg-emerald-500/15 text-emerald-600"
                        : isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  </span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {index < TABS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 ml-1 sm:ml-2 hidden lg:block" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content - Responsive padding */}
      <div className="flex-1 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {activeTab === "essentials" && (
            <EssentialsTab
              formState={formState}
              updateForm={updateForm}
              onNameChange={handleNameChange}
              onCategoryChange={handleCategoryChange}
            />
          )}
          {activeTab === "pricing" && (
            <PricingTab formState={formState} updateForm={updateForm} />
          )}
          {activeTab === "content" && (
            <ContentTab formState={formState} updateForm={updateForm} orgSlug={slug} />
          )}
          {activeTab === "settings" && (
            <SettingsTab formState={formState} updateForm={updateForm} />
          )}
        </div>
      </div>

      {/* Footer Navigation - Responsive */}
      <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur sticky bottom-0 safe-area-pb">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevious}
            disabled={isFirstTab}
            className={cn(
              "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors touch-target",
              isFirstTab
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-foreground hover:bg-accent"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => goToTab(tab.id)}
                disabled={!canNavigateToTab(tab.id)}
                className={cn(
                  "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors",
                  activeTab === tab.id
                    ? "bg-primary"
                    : tabCompletion[tab.id].complete
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30",
                  canNavigateToTab(tab.id) && "cursor-pointer"
                )}
                aria-label={`Go to ${tab.label}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={isLastTab || !canNavigateToTab(TABS[currentTabIndex + 1]?.id ?? "essentials")}
            className={cn(
              "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors touch-target",
              isLastTab || !canNavigateToTab(TABS[currentTabIndex + 1]?.id ?? "essentials")
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Actions Sheet */}
      {showMobileActions && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileActions(false)}
          />

          {/* Sheet */}
          <div className="mobile-sheet">
            <div className="mobile-sheet-handle" />

            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground">Save Tour</h3>
                <button
                  onClick={() => setShowMobileActions(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors touch-target"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {!tabCompletion.essentials.complete && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                  Complete the Essentials tab before saving
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMobileActions(false);
                  handleSave(false);
                }}
                disabled={isSubmitting || !tabCompletion.essentials.complete}
                className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5" />
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActions(false);
                  handleSave(true);
                }}
                disabled={isSubmitting || !tabCompletion.essentials.complete}
                className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {mode === "edit" ? "Save & Publish" : "Create & Publish"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileActions(false);
                  router.back();
                }}
                className="w-full flex items-center justify-center gap-2 h-12 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
