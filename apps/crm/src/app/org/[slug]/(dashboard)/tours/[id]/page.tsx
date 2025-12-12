"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, Clock, Users, DollarSign, MapPin, Calendar, Check, X, Plus, Trash2, GripVertical, Star, Layers } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

interface PricingTierFormData {
  name: string;
  label: string;
  description: string;
  price: string;
  minAge: string;
  maxAge: string;
  isDefault: boolean;
  countTowardsCapacity: boolean;
  minQuantity: string;
  maxQuantity: string;
}

const defaultTierForm: PricingTierFormData = {
  name: "",
  label: "",
  description: "",
  price: "",
  minAge: "",
  maxAge: "",
  isDefault: false,
  countTowardsCapacity: true,
  minQuantity: "0",
  maxQuantity: "",
};

interface VariantFormData {
  name: string;
  label: string;
  description: string;
  priceModifierType: "absolute" | "percentage" | "fixed_add";
  priceModifier: string;
  durationMinutes: string;
  maxParticipants: string;
  minParticipants: string;
  defaultStartTime: string;
  availableDays: number[];
  isDefault: boolean;
  isActive: boolean;
}

const defaultVariantForm: VariantFormData = {
  name: "",
  label: "",
  description: "",
  priceModifierType: "absolute",
  priceModifier: "",
  durationMinutes: "",
  maxParticipants: "",
  minParticipants: "",
  defaultStartTime: "",
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  isDefault: false,
  isActive: true,
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TourDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const tourId = params.id as string;

  // Pricing tier modal state
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState<PricingTierFormData>(defaultTierForm);

  // Variant modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>(defaultVariantForm);

  const utils = trpc.useUtils();
  const { data: tour, isLoading, error } = trpc.tour.getById.useQuery({ id: tourId });
  const { data: pricingTiers = [], isLoading: tiersLoading } = trpc.tour.listPricingTiers.useQuery(
    { tourId },
    { enabled: !!tourId }
  );
  const { data: variants = [], isLoading: variantsLoading } = trpc.tour.listVariants.useQuery(
    { tourId },
    { enabled: !!tourId }
  );

  const createTierMutation = trpc.tour.createPricingTier.useMutation({
    onSuccess: () => {
      utils.tour.listPricingTiers.invalidate({ tourId });
      setShowTierModal(false);
      setTierForm(defaultTierForm);
    },
  });

  const updateTierMutation = trpc.tour.updatePricingTier.useMutation({
    onSuccess: () => {
      utils.tour.listPricingTiers.invalidate({ tourId });
      setShowTierModal(false);
      setEditingTierId(null);
      setTierForm(defaultTierForm);
    },
  });

  const deleteTierMutation = trpc.tour.deletePricingTier.useMutation({
    onSuccess: () => {
      utils.tour.listPricingTiers.invalidate({ tourId });
    },
  });

  const handleOpenTierModal = (tier?: typeof pricingTiers[0]) => {
    if (tier) {
      setEditingTierId(tier.id);
      setTierForm({
        name: tier.name,
        label: tier.label,
        description: tier.description || "",
        price: tier.price,
        minAge: tier.minAge?.toString() || "",
        maxAge: tier.maxAge?.toString() || "",
        isDefault: tier.isDefault || false,
        countTowardsCapacity: tier.countTowardsCapacity ?? true,
        minQuantity: tier.minQuantity?.toString() || "0",
        maxQuantity: tier.maxQuantity?.toString() || "",
      });
    } else {
      setEditingTierId(null);
      setTierForm(defaultTierForm);
    }
    setShowTierModal(true);
  };

  const handleSaveTier = () => {
    const payload = {
      name: tierForm.name,
      label: tierForm.label,
      description: tierForm.description || undefined,
      price: tierForm.price,
      minAge: tierForm.minAge ? parseInt(tierForm.minAge) : undefined,
      maxAge: tierForm.maxAge ? parseInt(tierForm.maxAge) : undefined,
      isDefault: tierForm.isDefault,
      countTowardsCapacity: tierForm.countTowardsCapacity,
      minQuantity: parseInt(tierForm.minQuantity) || 0,
      maxQuantity: tierForm.maxQuantity ? parseInt(tierForm.maxQuantity) : undefined,
    };

    if (editingTierId) {
      updateTierMutation.mutate({ tierId: editingTierId, data: payload });
    } else {
      createTierMutation.mutate({ tourId, ...payload });
    }
  };

  const handleDeleteTier = (tierId: string) => {
    if (confirm("Are you sure you want to delete this pricing tier?")) {
      deleteTierMutation.mutate({ tierId });
    }
  };

  // Variant mutations
  const createVariantMutation = trpc.tour.createVariant.useMutation({
    onSuccess: () => {
      utils.tour.listVariants.invalidate({ tourId });
      setShowVariantModal(false);
      setVariantForm(defaultVariantForm);
    },
  });

  const updateVariantMutation = trpc.tour.updateVariant.useMutation({
    onSuccess: () => {
      utils.tour.listVariants.invalidate({ tourId });
      setShowVariantModal(false);
      setEditingVariantId(null);
      setVariantForm(defaultVariantForm);
    },
  });

  const deleteVariantMutation = trpc.tour.deleteVariant.useMutation({
    onSuccess: () => {
      utils.tour.listVariants.invalidate({ tourId });
    },
  });

  const handleOpenVariantModal = (variant?: typeof variants[0]) => {
    if (variant) {
      setEditingVariantId(variant.id);
      setVariantForm({
        name: variant.name,
        label: variant.label,
        description: variant.description || "",
        priceModifierType: variant.priceModifierType || "absolute",
        priceModifier: variant.priceModifier || "",
        durationMinutes: variant.durationMinutes?.toString() || "",
        maxParticipants: variant.maxParticipants?.toString() || "",
        minParticipants: variant.minParticipants?.toString() || "",
        defaultStartTime: variant.defaultStartTime || "",
        availableDays: variant.availableDays || [0, 1, 2, 3, 4, 5, 6],
        isDefault: variant.isDefault || false,
        isActive: variant.isActive ?? true,
      });
    } else {
      setEditingVariantId(null);
      setVariantForm(defaultVariantForm);
    }
    setShowVariantModal(true);
  };

  const handleSaveVariant = () => {
    const payload = {
      name: variantForm.name,
      label: variantForm.label,
      description: variantForm.description || undefined,
      priceModifierType: variantForm.priceModifierType,
      priceModifier: variantForm.priceModifier || undefined,
      durationMinutes: variantForm.durationMinutes ? parseInt(variantForm.durationMinutes) : undefined,
      maxParticipants: variantForm.maxParticipants ? parseInt(variantForm.maxParticipants) : undefined,
      minParticipants: variantForm.minParticipants ? parseInt(variantForm.minParticipants) : undefined,
      defaultStartTime: variantForm.defaultStartTime || undefined,
      availableDays: variantForm.availableDays,
      isDefault: variantForm.isDefault,
      isActive: variantForm.isActive,
    };

    if (editingVariantId) {
      updateVariantMutation.mutate({ variantId: editingVariantId, data: payload });
    } else {
      createVariantMutation.mutate({ tourId, ...payload });
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    if (confirm("Are you sure you want to delete this variant?")) {
      deleteVariantMutation.mutate({ variantId });
    }
  };

  const toggleVariantDay = (day: number) => {
    const newDays = variantForm.availableDays.includes(day)
      ? variantForm.availableDays.filter((d) => d !== day)
      : [...variantForm.availableDays, day].sort();
    setVariantForm({ ...variantForm, availableDays: newDays });
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading tour: {error.message}</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Tour not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/tours` as Route}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{tour.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tour.status === "active"
                    ? "bg-green-100 text-green-800"
                    : tour.status === "draft"
                    ? "bg-yellow-100 text-yellow-800"
                    : tour.status === "paused"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {tour.status}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{tour.slug}</p>
          </div>
        </div>
        <Link
          href={`/org/${slug}/tours/${tour.id}/edit` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Tour
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-semibold text-gray-900">{tour.durationMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Capacity</p>
              <p className="font-semibold text-gray-900">
                {tour.minParticipants ?? 1} - {tour.maxParticipants}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Base Price</p>
              <p className="font-semibold text-gray-900">
                ${parseFloat(tour.basePrice).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cutoff</p>
              <p className="font-semibold text-gray-900">{tour.cancellationHours ?? 24}h before</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
        {tour.shortDescription && (
          <p className="text-gray-600 mb-4 font-medium">{tour.shortDescription}</p>
        )}
        {tour.description ? (
          <p className="text-gray-600 whitespace-pre-wrap">{tour.description}</p>
        ) : (
          <p className="text-gray-400 italic">No description provided</p>
        )}
      </div>

      {/* Inclusions & Exclusions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tour.includes && tour.includes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Included</h2>
            <ul className="space-y-2">
              {tour.includes.map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tour.excludes && tour.excludes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Not Included</h2>
            <ul className="space-y-2">
              {tour.excludes.map((item: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Meeting Point */}
      {(tour.meetingPoint || tour.meetingPointDetails) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meeting Point</h2>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              {tour.meetingPoint && (
                <p className="font-medium text-gray-900">{tour.meetingPoint}</p>
              )}
              {tour.meetingPointDetails && (
                <p className="text-gray-600 mt-1">{tour.meetingPointDetails}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Tiers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pricing Tiers</h2>
          <button
            onClick={() => handleOpenTierModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Tier
          </button>
        </div>

        {tiersLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : pricingTiers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-2">No pricing tiers configured</p>
            <p className="text-sm text-gray-400 mb-4">
              Add pricing tiers like Adult, Child, Senior to offer different prices
            </p>
            <button
              onClick={() => handleOpenTierModal()}
              className="text-primary hover:text-primary/80 font-medium text-sm"
            >
              + Add your first pricing tier
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  tier.isActive ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-300" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{tier.label}</span>
                      {tier.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {!tier.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        ${parseFloat(tier.price).toFixed(2)}
                      </span>
                      {(tier.minAge !== null || tier.maxAge !== null) && (
                        <span>
                          Ages: {tier.minAge ?? 0} - {tier.maxAge ?? "∞"}
                        </span>
                      )}
                      {!tier.countTowardsCapacity && (
                        <span className="text-orange-600">Doesn&apos;t count to capacity</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenTierModal(tier)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTier(tier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={deleteTierMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tour Variants */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tour Variants</h2>
          <button
            onClick={() => handleOpenVariantModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Variant
          </button>
        </div>

        {variantsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Layers className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-2">No variants configured</p>
            <p className="text-sm text-gray-400 mb-4">
              Add variants like Morning/Evening tours, Private/Group options, or language versions
            </p>
            <button
              onClick={() => handleOpenVariantModal()}
              className="text-primary hover:text-primary/80 font-medium text-sm"
            >
              + Add your first variant
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  variant.isActive ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-300" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{variant.label}</span>
                      {variant.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      {!variant.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {variant.priceModifier && (
                        <span className="font-medium text-gray-700">
                          {variant.priceModifierType === "absolute"
                            ? `$${parseFloat(variant.priceModifier).toFixed(2)}`
                            : variant.priceModifierType === "percentage"
                            ? `${variant.priceModifier}%`
                            : `+$${parseFloat(variant.priceModifier).toFixed(2)}`}
                        </span>
                      )}
                      {variant.durationMinutes && (
                        <span>{variant.durationMinutes} min</span>
                      )}
                      {variant.defaultStartTime && (
                        <span>{variant.defaultStartTime}</span>
                      )}
                      {variant.availableDays && variant.availableDays.length < 7 && (
                        <span className="text-xs">
                          {variant.availableDays.map((d) => dayNames[d]).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenVariantModal(variant)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVariant(variant.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={deleteVariantMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      {tour.cancellationPolicy && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Policy</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{tour.cancellationPolicy}</p>
        </div>
      )}

      {/* Pricing Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowTierModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingTierId ? "Edit Pricing Tier" : "Add Pricing Tier"}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (internal) *
                    </label>
                    <input
                      type="text"
                      value={tierForm.name}
                      onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                      placeholder="e.g., adult, child"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label (display) *
                    </label>
                    <input
                      type="text"
                      value={tierForm.label}
                      onChange={(e) => setTierForm({ ...tierForm, label: e.target.value })}
                      placeholder="e.g., Adult (13+)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tierForm.price}
                      onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={tierForm.description}
                    onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tierForm.minAge}
                      onChange={(e) => setTierForm({ ...tierForm, minAge: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Age
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tierForm.maxAge}
                      onChange={(e) => setTierForm({ ...tierForm, maxAge: e.target.value })}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tierForm.minQuantity}
                      onChange={(e) => setTierForm({ ...tierForm, minQuantity: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tierForm.maxQuantity}
                      onChange={(e) => setTierForm({ ...tierForm, maxQuantity: e.target.value })}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tierForm.isDefault}
                      onChange={(e) => setTierForm({ ...tierForm, isDefault: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      Set as default tier (shown as primary price)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tierForm.countTowardsCapacity}
                      onChange={(e) =>
                        setTierForm({ ...tierForm, countTowardsCapacity: e.target.checked })
                      }
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      Counts towards tour capacity (uncheck for infants/free additions)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowTierModal(false);
                    setEditingTierId(null);
                    setTierForm(defaultTierForm);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTier}
                  disabled={
                    !tierForm.name ||
                    !tierForm.label ||
                    !tierForm.price ||
                    createTierMutation.isPending ||
                    updateTierMutation.isPending
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createTierMutation.isPending || updateTierMutation.isPending
                    ? "Saving..."
                    : editingTierId
                    ? "Update Tier"
                    : "Add Tier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowVariantModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingVariantId ? "Edit Variant" : "Add Variant"}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name (internal) *
                    </label>
                    <input
                      type="text"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      placeholder="e.g., morning, private"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label (display) *
                    </label>
                    <input
                      type="text"
                      value={variantForm.label}
                      onChange={(e) => setVariantForm({ ...variantForm, label: e.target.value })}
                      placeholder="e.g., Morning Tour"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={variantForm.description}
                    onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Type
                    </label>
                    <select
                      value={variantForm.priceModifierType}
                      onChange={(e) =>
                        setVariantForm({
                          ...variantForm,
                          priceModifierType: e.target.value as "absolute" | "percentage" | "fixed_add",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="absolute">Absolute Price</option>
                      <option value="percentage">Percentage of Base</option>
                      <option value="fixed_add">Add to Base Price</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">
                        {variantForm.priceModifierType === "percentage" ? "%" : "$"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={variantForm.priceModifier}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, priceModifier: e.target.value })
                        }
                        placeholder={variantForm.priceModifierType === "percentage" ? "0" : "0.00"}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={variantForm.durationMinutes}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, durationMinutes: e.target.value })
                      }
                      placeholder="Use default"
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
                      value={variantForm.minParticipants}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, minParticipants: e.target.value })
                      }
                      placeholder="Use default"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={variantForm.maxParticipants}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, maxParticipants: e.target.value })
                      }
                      placeholder="Use default"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Start Time
                  </label>
                  <input
                    type="time"
                    value={variantForm.defaultStartTime}
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, defaultStartTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Days
                  </label>
                  <div className="flex gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleVariantDay(index)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          variantForm.availableDays.includes(index)
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={variantForm.isDefault}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, isDefault: e.target.checked })
                      }
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Set as default variant</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={variantForm.isActive}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Active (visible for booking)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowVariantModal(false);
                    setEditingVariantId(null);
                    setVariantForm(defaultVariantForm);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVariant}
                  disabled={
                    !variantForm.name ||
                    !variantForm.label ||
                    createVariantMutation.isPending ||
                    updateVariantMutation.isPending
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  {createVariantMutation.isPending || updateVariantMutation.isPending
                    ? "Saving..."
                    : editingVariantId
                    ? "Update Variant"
                    : "Add Variant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
