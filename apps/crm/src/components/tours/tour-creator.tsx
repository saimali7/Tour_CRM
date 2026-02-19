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

// Tab Components
import { EssentialsTab } from "./tour-creator/essentials-tab";
import {
  PricingTab,
  type PricingFormState,
  type PricingPackageDraft,
} from "./tour-creator/pricing-tab";
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
  isPublic: boolean;
  meetingPoint: string;
  meetingPointDetails: string;
  pickupMode: "meeting_point" | "hotel_pickup" | "hybrid";
  pickupAllowedCities: string[];
  pickupAirportAllowed: boolean;
  pickupPolicyNotes: string;
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
  pricingPackages?: PricingPackageDraft[];
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
  durationMinutes: 360,
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
  isPublic: false,
  meetingPoint: "",
  meetingPointDetails: "",
  pickupMode: "meeting_point",
  pickupAllowedCities: [],
  pickupAirportAllowed: false,
  pickupPolicyNotes: "",
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

function isPricingConfigComplete(config?: PricingFormState): boolean {
  if (!config) return false;

  switch (config.pricingType) {
    case "per_person":
      return !!config.adultPrice && parseFloat(config.adultPrice) > 0;
    case "per_unit":
      return !!config.pricePerUnit && parseFloat(config.pricePerUnit) > 0;
    case "flat_rate":
      return !!config.flatPrice && parseFloat(config.flatPrice) > 0;
    case "base_plus_person":
      return !!config.basePricePricing && parseFloat(config.basePricePricing) > 0;
    case "tiered_group":
      return (
        config.tierRanges.length > 0 &&
        config.tierRanges.every((tier) => tier.price && parseFloat(tier.price) > 0)
      );
    default:
      return false;
  }
}

function buildPricingModelFromConfig(config: PricingFormState) {
  const createId = () => Math.random().toString(36).slice(2, 9);

  switch (config.pricingType) {
    case "per_person": {
      const tiers = [
        {
          id: createId(),
          name: "adult",
          price: { amount: Math.round(parseFloat(config.adultPrice || "0") * 100), currency: "USD" },
          ageMin: 13,
          isDefault: true,
          sortOrder: 0,
        },
      ];

      if (config.hasChildPrice && config.childPrice) {
        tiers.push({
          id: createId(),
          name: "child",
          price: { amount: Math.round(parseFloat(config.childPrice) * 100), currency: "USD" },
          ageMin: 3,
          ageMax: 12,
          isDefault: false,
          sortOrder: 1,
        } as typeof tiers[0]);
      }

      if (config.hasInfantPrice) {
        tiers.push({
          id: createId(),
          name: "infant",
          price: { amount: Math.round(parseFloat(config.infantPrice || "0") * 100), currency: "USD" },
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
        pricePerUnit: { amount: Math.round(parseFloat(config.pricePerUnit || "0") * 100), currency: "USD" },
        maxOccupancy: parseInt(config.maxOccupancy) || 6,
        minOccupancy: 1,
      };
    case "flat_rate":
      return {
        type: "flat_rate" as const,
        price: { amount: Math.round(parseFloat(config.flatPrice || "0") * 100), currency: "USD" },
        maxParticipants: parseInt(config.flatMaxParticipants) || 10,
      };
    case "tiered_group":
      return {
        type: "tiered_group" as const,
        tiers: config.tierRanges.map((tier) => ({
          minSize: parseInt(tier.min) || 1,
          maxSize: parseInt(tier.max) || 10,
          price: { amount: Math.round(parseFloat(tier.price || "0") * 100), currency: "USD" },
        })),
      };
    case "base_plus_person":
      return {
        type: "base_plus_person" as const,
        basePrice: { amount: Math.round(parseFloat(config.basePricePricing || "0") * 100), currency: "USD" },
        perPersonPrice: { amount: Math.round(parseFloat(config.pricePerAdditional || "0") * 100), currency: "USD" },
        includedParticipants: parseInt(config.includedParticipants) || 2,
        maxParticipants: parseInt(config.baseMaxParticipants) || 10,
      };
    default:
      return { type: "per_person" as const, tiers: [] };
  }
}

function buildCapacityModelFromConfig(
  config: PricingFormState,
  fallbackMaxParticipants: number
) {
  if (config.capacityType === "shared") {
    return { type: "shared" as const, totalSeats: parseInt(config.totalSeats) || fallbackMaxParticipants };
  }

  return {
    type: "unit" as const,
    totalUnits: parseInt(config.totalUnits) || 3,
    occupancyPerUnit: parseInt(config.occupancyPerUnit) || 6,
  };
}

// Smart defaults based on category
// Default duration is 6 hours (360 min), categories can override
const CATEGORY_DEFAULTS: Record<string, Partial<TourFormState>> = {
  "Walking Tours": {
    durationMinutes: 180,
    maxParticipants: 15,
    includes: ["Professional guide", "Bottled water"],
    requirements: ["Comfortable walking shoes", "Weather-appropriate clothing"],
  },
  "Food & Wine": {
    durationMinutes: 240,
    maxParticipants: 12,
    includes: ["Food tastings", "Local guide", "All food samples"],
    excludes: ["Alcoholic beverages", "Transportation"],
    requirements: ["Please advise of dietary restrictions"],
  },
  "Adventure": {
    durationMinutes: 360,
    maxParticipants: 10,
    includes: ["Safety equipment", "Professional instructor", "Insurance"],
    requirements: ["Good physical condition", "Signed waiver"],
  },
  "Cultural": {
    durationMinutes: 240,
    maxParticipants: 20,
    includes: ["Expert guide", "Entrance fees", "Headsets for large groups"],
  },
  "Historical": {
    durationMinutes: 180,
    maxParticipants: 20,
    includes: ["Historian guide", "Historical maps/materials"],
  },
  "Nature": {
    durationMinutes: 300,
    maxParticipants: 12,
    includes: ["Nature guide", "Binoculars (upon request)"],
    requirements: ["Hiking boots recommended", "Bring sunscreen"],
  },
  "City Tours": {
    durationMinutes: 360,
    maxParticipants: 15,
    includes: ["Local guide", "City map"],
  },
  "Day Trips": {
    durationMinutes: 480,
    maxParticipants: 20,
    includes: ["Transportation", "Professional guide", "Lunch"],
  },
  "Water Activities": {
    durationMinutes: 240,
    maxParticipants: 8,
    includes: ["Equipment rental", "Safety briefing", "Instructor"],
    requirements: ["Swimming ability required", "Towel and sunscreen"],
  },
  "Photography": {
    durationMinutes: 240,
    maxParticipants: 8,
    includes: ["Professional photographer guide", "Photo tips and tricks"],
    requirements: ["Bring your own camera"],
  },
  "Private Tours": {
    durationMinutes: 360,
    maxParticipants: 6,
    includes: ["Private guide", "Customized itinerary", "Flexible schedule"],
  },
  "Group Tours": {
    durationMinutes: 360,
    maxParticipants: 25,
    includes: ["Group guide", "Audio headsets"],
  },
};

export function TourCreator({ mode = "create", tourId, initialData }: TourCreatorProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

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
  const updateBookingOptionMutation = trpc.bookingOptions.update.useMutation();
  const deleteBookingOptionMutation = trpc.bookingOptions.delete.useMutation();

  const { data: existingBookingOptions } = trpc.bookingOptions.listByTour.useQuery(
    { tourId: tourId ?? "" },
    { enabled: mode === "edit" && Boolean(tourId) }
  );

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    createBookingOptionMutation.isPending ||
    updateBookingOptionMutation.isPending ||
    deleteBookingOptionMutation.isPending;

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
        durationMinutes: prev.durationMinutes !== 360 ? prev.durationMinutes : (defaults.durationMinutes ?? 360),
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

    const pricingPackages = formState.pricingPackages ?? [];
    const pricingComplete =
      pricingPackages.length > 0
        ? pricingPackages.every(
            (pkg) => pkg.name.trim().length > 0 && isPricingConfigComplete(pkg.config)
          )
        : isPricingConfigComplete(formState.pricingConfig);

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
          pickupMode: formState.pickupMode,
          pickupAllowedCities: formState.pickupAllowedCities,
          pickupAirportAllowed: formState.pickupAirportAllowed,
          pickupPolicyNotes: formState.pickupPolicyNotes || undefined,
          cancellationPolicy: formState.cancellationPolicy || undefined,
          cancellationHours: formState.cancellationHours,
          minimumNoticeHours: formState.minimumNoticeHours,
          maximumAdvanceDays: formState.maximumAdvanceDays,
          allowSameDayBooking: formState.allowSameDayBooking,
          sameDayCutoffTime: formState.sameDayCutoffTime || undefined,
          metaTitle: formState.metaTitle || undefined,
          metaDescription: formState.metaDescription || undefined,
          status: publish ? "active" as const : "draft" as const,
          isPublic: formState.isPublic,
        };

        const normalizedPackages =
          (formState.pricingPackages ?? [])
            .map((pkg) => ({
              ...pkg,
              name: pkg.name.trim(),
              shortDescription: pkg.shortDescription?.trim() ?? "",
            }))
            .filter(
              (pkg) => pkg.name.length > 0 && isPricingConfigComplete(pkg.config)
            );

        const fallbackPackage =
          formState.pricingConfig && isPricingConfigComplete(formState.pricingConfig)
            ? [
                {
                  id: "standard",
                  optionId: undefined,
                  name: "Standard Experience",
                  shortDescription: "Join our regular tour",
                  isDefault: true,
                  config: formState.pricingConfig,
                } satisfies PricingPackageDraft,
              ]
            : [];

        const packagesToPersist =
          normalizedPackages.length > 0 ? normalizedPackages : fallbackPackage;

        let savedTourId: string;

        if (mode === "edit" && tourId) {
          await updateMutation.mutateAsync({ id: tourId, data: payload });
          savedTourId = tourId;
          toast.success("Tour updated successfully");
        } else {
          const result = await createMutation.mutateAsync(payload);
          savedTourId = result.id;
          toast.success("Tour created successfully");
        }

        if (packagesToPersist.length > 0) {
          try {
            const persistedOptionIds = new Set<string>();

            for (let index = 0; index < packagesToPersist.length; index += 1) {
              const pkg = packagesToPersist[index]!;
              const optionPayload = {
                name: pkg.name,
                shortDescription: pkg.shortDescription || undefined,
                pricingModel: buildPricingModelFromConfig(pkg.config),
                capacityModel: buildCapacityModelFromConfig(
                  pkg.config,
                  formState.maxParticipants
                ),
                schedulingType: "fixed" as const,
                isDefault: index === 0,
                sortOrder: index,
              };

              if (mode === "edit" && pkg.optionId) {
                await updateBookingOptionMutation.mutateAsync({
                  id: pkg.optionId,
                  data: optionPayload,
                });
                persistedOptionIds.add(pkg.optionId);
              } else {
                const created = await createBookingOptionMutation.mutateAsync({
                  tourId: savedTourId,
                  ...optionPayload,
                });
                persistedOptionIds.add(created.id);
              }
            }

            if (mode === "edit") {
              const staleOptions = (existingBookingOptions ?? []).filter(
                (option) => !persistedOptionIds.has(option.id)
              );
              for (const staleOption of staleOptions) {
                await deleteBookingOptionMutation.mutateAsync({
                  id: staleOption.id,
                });
              }
            }
          } catch {
            toast.warning(
              "Tour saved, but some package variations could not be synced."
            );
          }
        }

        utils.tour.list.invalidate();
        router.push(`/org/${slug}/tours/${savedTourId}`);
      } catch (error) {
        const fallback = mode === "edit" ? "Failed to update tour" : "Failed to create tour";
        const message = error instanceof Error && error.message ? error.message : fallback;
        toast.error(message);
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
      updateBookingOptionMutation,
      deleteBookingOptionMutation,
      existingBookingOptions,
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
              {mode === "edit" ? "Save Active" : "Create Active"}
            </button>
          </div>

          {/* Mobile Save Button */}
          <button
            type="button"
            onClick={() => setShowMobileActions(true)}
            className="sm:hidden inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-primary text-primary-foreground touch-target"
            aria-label="Save options"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">Save</span>
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
                        ? "bg-success/15 text-success"
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
                      ? "bg-success"
                      : "bg-muted-foreground/30",
                  canNavigateToTab(tab.id) && "cursor-pointer"
                )}
                aria-label={`Go to ${tab.label}`}
              />
            ))}
          </div>

          {isLastTab ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSubmitting || !tabCompletion.essentials.complete}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg border border-input text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || !tabCompletion.essentials.complete}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {mode === "edit" ? "Save Active" : "Create Active"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNavigateToTab(TABS[currentTabIndex + 1]?.id ?? "essentials")}
              className={cn(
                "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors touch-target",
                !canNavigateToTab(TABS[currentTabIndex + 1]?.id ?? "essentials")
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
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
                <p className="text-sm text-warning dark:text-warning bg-warning/10 px-3 py-2 rounded-lg">
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
                Save Draft
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
                {mode === "edit" ? "Save Active" : "Create Active"}
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
