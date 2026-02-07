"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
  Layers,
  DollarSign,
  Copy,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Car,
  Check,
  Lightbulb,
  Crown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PricingModel, CapacityModel } from "@tour/validators";
import type { BookingOption } from "@tour/database";

// ============================================================================
// TYPES
// ============================================================================

type PricingModelType = "per_person" | "per_unit" | "flat_rate" | "tiered_group" | "base_plus_person";
type CapacityModelType = "shared" | "unit";

interface FormData {
  name: string;
  shortDescription: string;
  badge: string;
  highlightText: string;
  pricingType: PricingModelType;
  capacityType: CapacityModelType;
  schedulingType: "fixed" | "flexible";
  isDefault: boolean;
  // Per-person pricing
  adultPrice: string;
  childPrice: string;
  infantPrice: string;
  seniorPrice: string;
  hasChildPrice: boolean;
  hasInfantPrice: boolean;
  hasSeniorPrice: boolean;
  minGroupSize: string;
  maxGroupSize: string;
  // Per-unit pricing
  pricePerUnit: string;
  maxOccupancy: string;
  minOccupancy: string;
  allowMultipleUnits: boolean;
  // Flat rate
  flatPrice: string;
  flatMaxParticipants: string;
  // Base + person
  basePrice: string;
  pricePerAdditional: string;
  includedParticipants: string;
  baseMaxParticipants: string;
  // Tiered group
  tierRanges: Array<{ min: string; max: string; price: string }>;
  // Capacity
  totalSeats: string;
  minBookingSize: string;
  maxBookingSize: string;
  totalUnits: string;
  occupancyPerUnit: string;
}

const defaultFormData: FormData = {
  name: "",
  shortDescription: "",
  badge: "",
  highlightText: "",
  pricingType: "per_person",
  capacityType: "shared",
  schedulingType: "fixed",
  isDefault: false,
  adultPrice: "",
  childPrice: "",
  infantPrice: "",
  seniorPrice: "",
  hasChildPrice: true,
  hasInfantPrice: true,
  hasSeniorPrice: false,
  minGroupSize: "1",
  maxGroupSize: "",
  pricePerUnit: "",
  maxOccupancy: "6",
  minOccupancy: "1",
  allowMultipleUnits: true,
  flatPrice: "",
  flatMaxParticipants: "10",
  basePrice: "",
  pricePerAdditional: "",
  includedParticipants: "2",
  baseMaxParticipants: "10",
  tierRanges: [{ min: "1", max: "4", price: "" }],
  totalSeats: "20",
  minBookingSize: "1",
  maxBookingSize: "",
  totalUnits: "3",
  occupancyPerUnit: "6",
};

// ============================================================================
// COMPONENT
// ============================================================================

interface TourBookingOptionsTabProps {
  tourId: string;
}

export function TourBookingOptionsTab({ tourId }: TourBookingOptionsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: options = [], isLoading } = trpc.bookingOptions.listByTour.useQuery(
    { tourId },
    { enabled: !!tourId }
  );

  // Mutations
  const createMutation = trpc.bookingOptions.create.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
      setShowModal(false);
      setFormData(defaultFormData);
      toast.success("Booking option created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create booking option");
    },
  });

  const updateMutation = trpc.bookingOptions.update.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
      setShowModal(false);
      setEditingId(null);
      setFormData(defaultFormData);
      toast.success("Booking option updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking option");
    },
  });

  const deleteMutation = trpc.bookingOptions.delete.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
      setDeletingId(null);
      toast.success("Booking option deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete booking option");
    },
  });

  const duplicateMutation = trpc.bookingOptions.duplicate.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
      toast.success("Booking option duplicated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to duplicate booking option");
    },
  });

  const setDefaultMutation = trpc.bookingOptions.setDefault.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
      toast.success("Default option set");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to set default option");
    },
  });

  const reorderMutation = trpc.bookingOptions.reorder.useMutation({
    onSuccess: () => {
      utils.bookingOptions.listByTour.invalidate({ tourId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reorder options");
    },
  });

  // Move option up or down
  const moveOption = (optionId: string, direction: "up" | "down") => {
    const currentIndex = options.findIndex((o) => o.id === optionId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= options.length) return;

    const newOrder = [...options];
    const [removed] = newOrder.splice(currentIndex, 1);
    if (!removed) return;
    newOrder.splice(newIndex, 0, removed);

    reorderMutation.mutate({
      tourId,
      orderedIds: newOrder.map((o) => o.id),
    });
  };

  // Helpers - build pricing model matching the validator schema
  const buildPricingModel = (): PricingModel => {
    const createId = () => Math.random().toString(36).slice(2, 9);

    switch (formData.pricingType) {
      case "per_person": {
        const tiers = [
          {
            id: createId(),
            name: "adult",
            price: { amount: Math.round(parseFloat(formData.adultPrice || "0") * 100), currency: "USD" },
            ageMin: 13,
            isDefault: true,
            sortOrder: 0,
          },
        ];
        if (formData.hasChildPrice) {
          tiers.push({
            id: createId(),
            name: "child",
            price: { amount: Math.round(parseFloat(formData.childPrice || "0") * 100), currency: "USD" },
            ageMin: 3,
            ageMax: 12,
            isDefault: false,
            sortOrder: 1,
          } as typeof tiers[0]);
        }
        if (formData.hasInfantPrice) {
          tiers.push({
            id: createId(),
            name: "infant",
            price: { amount: Math.round(parseFloat(formData.infantPrice || "0") * 100), currency: "USD" },
            ageMin: 0,
            ageMax: 2,
            isDefault: false,
            sortOrder: 2,
          } as typeof tiers[0]);
        }
        if (formData.hasSeniorPrice) {
          tiers.push({
            id: createId(),
            name: "senior",
            price: { amount: Math.round(parseFloat(formData.seniorPrice || "0") * 100), currency: "USD" },
            ageMin: 65,
            isDefault: false,
            sortOrder: 3,
          } as typeof tiers[0]);
        }
        return {
          type: "per_person",
          tiers,
        };
      }
      case "per_unit":
        return {
          type: "per_unit",
          unitName: "Vehicle",
          unitNamePlural: "Vehicles",
          pricePerUnit: { amount: Math.round(parseFloat(formData.pricePerUnit || "0") * 100), currency: "USD" },
          maxOccupancy: parseInt(formData.maxOccupancy) || 6,
          minOccupancy: parseInt(formData.minOccupancy) || 1,
        };
      case "flat_rate":
        return {
          type: "flat_rate",
          price: { amount: Math.round(parseFloat(formData.flatPrice || "0") * 100), currency: "USD" },
          maxParticipants: parseInt(formData.flatMaxParticipants) || 10,
        };
      case "tiered_group":
        return {
          type: "tiered_group",
          tiers: formData.tierRanges.map((tier) => ({
            minSize: parseInt(tier.min) || 1,
            maxSize: parseInt(tier.max) || 10,
            price: { amount: Math.round(parseFloat(tier.price || "0") * 100), currency: "USD" },
          })),
        };
      case "base_plus_person":
        return {
          type: "base_plus_person",
          basePrice: { amount: Math.round(parseFloat(formData.basePrice || "0") * 100), currency: "USD" },
          perPersonPrice: { amount: Math.round(parseFloat(formData.pricePerAdditional || "0") * 100), currency: "USD" },
          includedParticipants: parseInt(formData.includedParticipants) || 2,
          maxParticipants: parseInt(formData.baseMaxParticipants) || 10,
        };
      default:
        return { type: "per_person", tiers: [] };
    }
  };

  const buildCapacityModel = (): CapacityModel => {
    if (formData.capacityType === "shared") {
      return {
        type: "shared",
        totalSeats: parseInt(formData.totalSeats) || 20,
      };
    }
    return {
      type: "unit",
      totalUnits: parseInt(formData.totalUnits) || 3,
      occupancyPerUnit: parseInt(formData.occupancyPerUnit) || 6,
    };
  };

  const handleOpenModal = (option?: BookingOption) => {
    if (option) {
      setEditingId(option.id);
      const pm = option.pricingModel as PricingModel;
      const cm = option.capacityModel as CapacityModel;

      // Parse pricing model back to form
      let adultTier, childTier, infantTier, seniorTier;
      if (pm.type === "per_person" && pm.tiers) {
        adultTier = pm.tiers.find((t) => t.name === "adult");
        childTier = pm.tiers.find((t) => t.name === "child");
        infantTier = pm.tiers.find((t) => t.name === "infant");
        seniorTier = pm.tiers.find((t) => t.name === "senior");
      }

      setFormData({
        name: option.name,
        shortDescription: option.shortDescription || "",
        badge: option.badge || "",
        highlightText: option.highlightText || "",
        pricingType: pm.type,
        capacityType: cm.type,
        schedulingType: (option.schedulingType as "fixed" | "flexible") || "fixed",
        isDefault: option.isDefault || false,
        // Per-person
        adultPrice: adultTier ? (adultTier.price.amount / 100).toString() : "",
        childPrice: childTier ? (childTier.price.amount / 100).toString() : "",
        infantPrice: infantTier ? (infantTier.price.amount / 100).toString() : "",
        seniorPrice: seniorTier ? (seniorTier.price.amount / 100).toString() : "",
        hasChildPrice: !!childTier,
        hasInfantPrice: !!infantTier,
        hasSeniorPrice: !!seniorTier,
        minGroupSize: "1",
        maxGroupSize: "",
        // Per-unit
        pricePerUnit: pm.type === "per_unit" ? (pm.pricePerUnit.amount / 100).toString() : "",
        maxOccupancy: pm.type === "per_unit" ? pm.maxOccupancy?.toString() || "6" : "6",
        minOccupancy: pm.type === "per_unit" ? pm.minOccupancy?.toString() || "1" : "1",
        allowMultipleUnits: true,
        // Flat rate
        flatPrice: pm.type === "flat_rate" ? (pm.price.amount / 100).toString() : "",
        flatMaxParticipants: pm.type === "flat_rate" ? pm.maxParticipants?.toString() || "10" : "10",
        // Base + person
        basePrice: pm.type === "base_plus_person" ? (pm.basePrice.amount / 100).toString() : "",
        pricePerAdditional: pm.type === "base_plus_person" ? (pm.perPersonPrice.amount / 100).toString() : "",
        includedParticipants: pm.type === "base_plus_person" ? pm.includedParticipants?.toString() || "2" : "2",
        baseMaxParticipants: pm.type === "base_plus_person" ? pm.maxParticipants?.toString() || "10" : "10",
        // Tiered group - parse if available
        tierRanges: pm.type === "tiered_group" ? pm.tiers.map(t => ({
          min: t.minSize.toString(),
          max: t.maxSize.toString(),
          price: (t.price.amount / 100).toString(),
        })) : [{ min: "1", max: "4", price: "" }],
        // Capacity
        totalSeats: cm.type === "shared" ? cm.totalSeats?.toString() || "20" : "20",
        minBookingSize: "1",
        maxBookingSize: "",
        totalUnits: cm.type === "unit" ? cm.totalUnits?.toString() || "3" : "3",
        occupancyPerUnit: cm.type === "unit" ? cm.occupancyPerUnit?.toString() || "6" : "6",
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setShowModal(true);
  };

  const handleSave = () => {
    const payload = {
      name: formData.name,
      shortDescription: formData.shortDescription || undefined,
      badge: formData.badge || undefined,
      highlightText: formData.highlightText || undefined,
      pricingModel: buildPricingModel(),
      capacityModel: buildCapacityModel(),
      schedulingType: formData.schedulingType,
      isDefault: formData.isDefault,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ tourId, ...payload });
    }
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteMutation.mutate({ id: deletingId });
    }
  };

  const formatPrice = (amount: number): string => {
    return `$${(amount / 100).toFixed(0)}`;
  };

  const getPricingDescription = (pm: PricingModel): string => {
    switch (pm.type) {
      case "per_person": {
        const adultTier = pm.tiers?.find((t: { name: string }) => t.name === "adult");
        return adultTier ? `${formatPrice(adultTier.price.amount)}/person` : "Per person";
      }
      case "per_unit":
        return pm.pricePerUnit ? `${formatPrice(pm.pricePerUnit.amount)}/vehicle` : "Per unit";
      case "flat_rate":
        return pm.price ? `${formatPrice(pm.price.amount)} flat` : "Flat rate";
      case "tiered_group":
        return "Tiered pricing";
      case "base_plus_person":
        return pm.basePrice ? `${formatPrice(pm.basePrice.amount)} base` : "Base + person";
      default:
        return "";
    }
  };

  const getCapacityDescription = (cm: CapacityModel): string => {
    if (cm.type === "shared") {
      return `${cm.totalSeats} seats`;
    }
    return `${cm.totalUnits} units × ${cm.occupancyPerUnit} people`;
  };

  const getExperienceIcon = (pm: PricingModel) => {
    switch (pm.type) {
      case "per_person":
        return <Users className="h-4 w-4" />;
      case "per_unit":
        return <Car className="h-4 w-4" />;
      case "flat_rate":
        return <Crown className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (badge?: string | null) => {
    switch (badge) {
      case "BEST_VALUE":
        return "bg-success/10 text-success dark:text-success";
      case "RECOMMENDED":
        return "bg-primary/10 text-primary";
      case "LUXURY":
        return "bg-warning/10 text-warning dark:text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Booking Options</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure how customers can book this tour (shared, private, VIP, etc.)
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Option
          </button>
        </div>

        {/* Options List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : options.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground mb-1">No booking options configured</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Add booking options to let customers choose between shared tours, private experiences, or VIP packages.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Add your first booking option
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div
                key={option.id}
                className={cn(
                  "rounded-lg border transition-all",
                  option.status === "active"
                    ? "border-border bg-card hover:border-primary/30"
                    : "border-border/50 bg-muted/30 opacity-70"
                )}
              >
                {/* Main Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveOption(option.id, "up")}
                      disabled={index === 0 || reorderMutation.isPending}
                      className={cn(
                        "p-1 rounded transition-colors",
                        index === 0
                          ? "text-muted-foreground/20 cursor-not-allowed"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveOption(option.id, "down")}
                      disabled={index === options.length - 1 || reorderMutation.isPending}
                      className={cn(
                        "p-1 rounded transition-colors",
                        index === options.length - 1
                          ? "text-muted-foreground/20 cursor-not-allowed"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      option.isDefault ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {getExperienceIcon(option.pricingModel)}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{option.name}</span>
                      {option.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {option.badge && (
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getBadgeColor(option.badge))}>
                          {option.badge.replace("_", " ")}
                        </span>
                      )}
                      {option.status !== "active" && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {getPricingDescription(option.pricingModel)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {getCapacityDescription(option.capacityModel)}
                      </span>
                    </div>
                  </div>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => setExpandedId(expandedId === option.id ? null : option.id)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    {expandedId === option.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpenModal(option)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => duplicateMutation.mutate({ id: option.id, newName: `${option.name} (Copy)` })}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {!option.isDefault && (
                        <DropdownMenuItem onClick={() => setDefaultMutation.mutate({ tourId, optionId: option.id })}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingId(option.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Expanded Details */}
                {expandedId === option.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-2">
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      {option.shortDescription && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">{option.shortDescription}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Pricing Model</p>
                        <p className="font-medium capitalize">{option.pricingModel.type.replace("_", " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Capacity Model</p>
                        <p className="font-medium capitalize">{option.capacityModel.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Scheduling</p>
                        <p className="font-medium capitalize">{option.schedulingType || "Fixed"}</p>
                      </div>
                      {option.highlightText && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Highlight</p>
                          <p className="font-medium">{option.highlightText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Presets Info */}
      <div className="bg-muted/30 rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-warning mt-0.5" />
          <div className="space-y-3">
            <p className="font-medium text-foreground">Quick Setup Tips</p>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">Shared Tour</span>
                  <span className="text-muted-foreground"> — Per-person pricing with shared capacity. Best for walking tours, group activities. </span>
                  <span className="text-muted-foreground/70 text-xs">e.g., $89/person, 20 seats per session</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">Private Tour</span>
                  <span className="text-muted-foreground"> — Per-unit pricing for exclusive experiences. Great for vehicle tours, private guides. </span>
                  <span className="text-muted-foreground/70 text-xs">e.g., $400/vehicle, up to 6 guests</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Crown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">VIP Experience</span>
                  <span className="text-muted-foreground"> — Flat rate for premium packages. Ideal for exclusive experiences with added perks. </span>
                  <span className="text-muted-foreground/70 text-xs">e.g., $800 flat for up to 4 guests</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
              💡 Create multiple options for the same tour to offer customers flexibility (e.g., "Join Group" vs "Book Private")
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                {editingId ? "Edit Booking Option" : "Create Booking Option"}
              </h3>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Option Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Shared Tour, Private Charter, VIP Experience"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Short Description</label>
                      <input
                        type="text"
                        value={formData.shortDescription}
                        onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                        placeholder="Brief description shown to customers"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Badge</label>
                      <select
                        value={formData.badge}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                      >
                        <option value="">None</option>
                        <option value="BEST_VALUE">Best Value</option>
                        <option value="RECOMMENDED">Recommended</option>
                        <option value="LUXURY">Luxury</option>
                        <option value="BEST_FOR_FAMILIES">Best for Families</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Scheduling</label>
                      <select
                        value={formData.schedulingType}
                        onChange={(e) => setFormData({ ...formData, schedulingType: e.target.value as "fixed" | "flexible" })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-ring"
                      >
                        <option value="fixed">Fixed Time Slots</option>
                        <option value="flexible">Flexible (Time Range)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pricing Model */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Pricing Model</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { type: "per_person", label: "Per Person", icon: Users },
                      { type: "per_unit", label: "Per Unit", icon: Car },
                      { type: "flat_rate", label: "Flat Rate", icon: Crown },
                      { type: "tiered_group", label: "Tiered", icon: Layers },
                      { type: "base_plus_person", label: "Base + Person", icon: DollarSign },
                    ].map((pm) => (
                      <button
                        key={pm.type}
                        type="button"
                        onClick={() => setFormData({ ...formData, pricingType: pm.type as PricingModelType })}
                        className={cn(
                          "p-3 rounded-lg border-2 text-center transition-all",
                          formData.pricingType === pm.type
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <pm.icon className={cn("h-5 w-5 mx-auto mb-1", formData.pricingType === pm.type ? "text-primary" : "text-muted-foreground")} />
                        <p className={cn("text-xs font-medium", formData.pricingType === pm.type ? "text-primary" : "text-foreground")}>{pm.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* Pricing Fields based on type */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
                    {formData.pricingType === "per_person" && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Adult Price *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.adultPrice}
                                onChange={(e) => setFormData({ ...formData, adultPrice: e.target.value })}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                              />
                            </div>
                          </div>
                          {formData.hasChildPrice && (
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">Child Price (3-12)</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.childPrice}
                                  onChange={(e) => setFormData({ ...formData, childPrice: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.hasChildPrice}
                              onChange={(e) => setFormData({ ...formData, hasChildPrice: e.target.checked })}
                              className="w-4 h-4 rounded border-input"
                            />
                            <span className="text-sm">Child pricing</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.hasInfantPrice}
                              onChange={(e) => setFormData({ ...formData, hasInfantPrice: e.target.checked })}
                              className="w-4 h-4 rounded border-input"
                            />
                            <span className="text-sm">Infant (free)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.hasSeniorPrice}
                              onChange={(e) => setFormData({ ...formData, hasSeniorPrice: e.target.checked })}
                              className="w-4 h-4 rounded border-input"
                            />
                            <span className="text-sm">Senior pricing</span>
                          </label>
                        </div>
                      </>
                    )}

                    {formData.pricingType === "per_unit" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Price per Unit *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.pricePerUnit}
                              onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                              placeholder="e.g., 400"
                              className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Max Occupancy</label>
                          <input
                            type="number"
                            value={formData.maxOccupancy}
                            onChange={(e) => setFormData({ ...formData, maxOccupancy: e.target.value })}
                            placeholder="6"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                        <label className="col-span-2 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowMultipleUnits}
                            onChange={(e) => setFormData({ ...formData, allowMultipleUnits: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm">Allow booking multiple units</span>
                        </label>
                      </div>
                    )}

                    {formData.pricingType === "flat_rate" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Flat Price *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.flatPrice}
                              onChange={(e) => setFormData({ ...formData, flatPrice: e.target.value })}
                              placeholder="e.g., 800"
                              className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Max Participants</label>
                          <input
                            type="number"
                            value={formData.flatMaxParticipants}
                            onChange={(e) => setFormData({ ...formData, flatMaxParticipants: e.target.value })}
                            placeholder="10"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {formData.pricingType === "base_plus_person" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Base Price *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.basePrice}
                              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                              placeholder="e.g., 300"
                              className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Per Additional Person *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.pricePerAdditional}
                              onChange={(e) => setFormData({ ...formData, pricePerAdditional: e.target.value })}
                              placeholder="e.g., 50"
                              className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Included Participants</label>
                          <input
                            type="number"
                            value={formData.includedParticipants}
                            onChange={(e) => setFormData({ ...formData, includedParticipants: e.target.value })}
                            placeholder="2"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Max Participants</label>
                          <input
                            type="number"
                            value={formData.baseMaxParticipants}
                            onChange={(e) => setFormData({ ...formData, baseMaxParticipants: e.target.value })}
                            placeholder="10"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {formData.pricingType === "tiered_group" && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Set different prices per person based on group size. Larger groups can get better rates.
                        </p>
                        {formData.tierRanges.map((tier, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={tier.min}
                              onChange={(e) => {
                                const newTiers = [...formData.tierRanges];
                                newTiers[index] = { ...tier, min: e.target.value };
                                setFormData({ ...formData, tierRanges: newTiers });
                              }}
                              className="w-16 px-2 py-2 border border-input rounded-lg bg-background text-center"
                              placeholder="1"
                            />
                            <span className="text-muted-foreground text-sm">to</span>
                            <input
                              type="number"
                              min="1"
                              value={tier.max}
                              onChange={(e) => {
                                const newTiers = [...formData.tierRanges];
                                newTiers[index] = { ...tier, max: e.target.value };
                                setFormData({ ...formData, tierRanges: newTiers });
                              }}
                              className="w-16 px-2 py-2 border border-input rounded-lg bg-background text-center"
                              placeholder="4"
                            />
                            <span className="text-muted-foreground text-sm">people:</span>
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.price}
                                onChange={(e) => {
                                  const newTiers = [...formData.tierRanges];
                                  newTiers[index] = { ...tier, price: e.target.value };
                                  setFormData({ ...formData, tierRanges: newTiers });
                                }}
                                className="w-full pl-7 pr-3 py-2 border border-input rounded-lg bg-background"
                                placeholder="0.00"
                              />
                            </div>
                            <span className="text-muted-foreground text-sm">/person</span>
                            {formData.tierRanges.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    tierRanges: formData.tierRanges.filter((_, i) => i !== index),
                                  });
                                }}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const lastTier = formData.tierRanges[formData.tierRanges.length - 1];
                            const newMin = lastTier ? (parseInt(lastTier.max) + 1).toString() : "1";
                            const newMax = lastTier ? (parseInt(lastTier.max) + 4).toString() : "4";
                            setFormData({
                              ...formData,
                              tierRanges: [...formData.tierRanges, { min: newMin, max: newMax, price: "" }],
                            });
                          }}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add tier
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity Model */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Capacity Model</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, capacityType: "shared" })}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        formData.capacityType === "shared" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <Users className={cn("h-5 w-5 mb-2", formData.capacityType === "shared" ? "text-primary" : "text-muted-foreground")} />
                      <p className={cn("font-medium", formData.capacityType === "shared" ? "text-primary" : "text-foreground")}>Shared Capacity</p>
                      <p className="text-xs text-muted-foreground mt-1">Multiple groups share the same tour</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, capacityType: "unit" })}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all",
                        formData.capacityType === "unit" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <Car className={cn("h-5 w-5 mb-2", formData.capacityType === "unit" ? "text-primary" : "text-muted-foreground")} />
                      <p className={cn("font-medium", formData.capacityType === "unit" ? "text-primary" : "text-foreground")}>Unit-Based</p>
                      <p className="text-xs text-muted-foreground mt-1">Private vehicles or rooms</p>
                    </button>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    {formData.capacityType === "shared" ? (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Total Seats</label>
                          <input
                            type="number"
                            value={formData.totalSeats}
                            onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                            placeholder="20"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Min Booking</label>
                          <input
                            type="number"
                            value={formData.minBookingSize}
                            onChange={(e) => setFormData({ ...formData, minBookingSize: e.target.value })}
                            placeholder="1"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Max Booking</label>
                          <input
                            type="number"
                            value={formData.maxBookingSize}
                            onChange={(e) => setFormData({ ...formData, maxBookingSize: e.target.value })}
                            placeholder="No limit"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Total Units</label>
                          <input
                            type="number"
                            value={formData.totalUnits}
                            onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
                            placeholder="3"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Capacity per Unit</label>
                          <input
                            type="number"
                            value={formData.occupancyPerUnit}
                            onChange={(e) => setFormData({ ...formData, occupancyPerUnit: e.target.value })}
                            placeholder="6"
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Set as default option (shown first to customers)</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData(defaultFormData);
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingId ? "Update Option" : "Create Option"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Booking Option"
        description="Are you sure you want to delete this booking option? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
