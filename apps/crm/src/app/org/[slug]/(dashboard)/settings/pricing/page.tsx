"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  X,
  Users,
  DollarSign,
  Percent,
  AlertCircle,
} from "lucide-react";

type PricingTab = "seasonal" | "groupDiscounts";

type AdjustmentType = "percentage" | "fixed";
type AppliesTo = "all" | "specific";

interface SeasonalPricingForm {
  name: string;
  startDate: string;
  endDate: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  appliesTo: AppliesTo;
  tourIds: string[];
  priority: number;
  isActive: boolean;
}

interface GroupDiscountForm {
  name: string;
  minParticipants: number;
  maxParticipants: number | null;
  discountType: AdjustmentType;
  discountValue: number;
  appliesTo: AppliesTo;
  tourIds: string[];
  priority: number;
  isActive: boolean;
}

export default function PricingSettingsPage() {
  const [activeTab, setActiveTab] = useState<PricingTab>("seasonal");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Seasonal pricing state
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [editingSeasonalId, setEditingSeasonalId] = useState<string | null>(null);
  const [seasonalForm, setSeasonalForm] = useState<SeasonalPricingForm>({
    name: "",
    startDate: "",
    endDate: "",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    appliesTo: "all",
    tourIds: [],
    priority: 1,
    isActive: true,
  });

  // Group discount state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<GroupDiscountForm>({
    name: "",
    minParticipants: 2,
    maxParticipants: null,
    discountType: "percentage",
    discountValue: 0,
    appliesTo: "all",
    tourIds: [],
    priority: 1,
    isActive: true,
  });

  // Queries
  const { data: seasonalPricingResult, isLoading: seasonalLoading } =
    trpc.seasonalPricing.list.useQuery({});
  const { data: groupDiscountsResult, isLoading: groupLoading } =
    trpc.groupDiscount.list.useQuery({});

  const seasonalPricing = seasonalPricingResult?.data;
  const groupDiscounts = groupDiscountsResult?.data;
  const { data: tours } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  const utils = trpc.useUtils();

  // Seasonal pricing mutations
  const createSeasonalMutation = trpc.seasonalPricing.create.useMutation({
    onSuccess: () => {
      utils.seasonalPricing.list.invalidate();
      setShowSeasonalModal(false);
      resetSeasonalForm();
      showSuccessMessage();
    },
  });

  const updateSeasonalMutation = trpc.seasonalPricing.update.useMutation({
    onSuccess: () => {
      utils.seasonalPricing.list.invalidate();
      setShowSeasonalModal(false);
      setEditingSeasonalId(null);
      resetSeasonalForm();
      showSuccessMessage();
    },
  });

  const deleteSeasonalMutation = trpc.seasonalPricing.delete.useMutation({
    onSuccess: () => {
      utils.seasonalPricing.list.invalidate();
      showSuccessMessage();
    },
  });

  // Group discount mutations
  const createGroupMutation = trpc.groupDiscount.create.useMutation({
    onSuccess: () => {
      utils.groupDiscount.list.invalidate();
      setShowGroupModal(false);
      resetGroupForm();
      showSuccessMessage();
    },
  });

  const updateGroupMutation = trpc.groupDiscount.update.useMutation({
    onSuccess: () => {
      utils.groupDiscount.list.invalidate();
      setShowGroupModal(false);
      setEditingGroupId(null);
      resetGroupForm();
      showSuccessMessage();
    },
  });

  const deleteGroupMutation = trpc.groupDiscount.delete.useMutation({
    onSuccess: () => {
      utils.groupDiscount.list.invalidate();
      showSuccessMessage();
    },
  });

  const showSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const resetSeasonalForm = () => {
    setSeasonalForm({
      name: "",
      startDate: "",
      endDate: "",
      adjustmentType: "percentage",
      adjustmentValue: 0,
      appliesTo: "all",
      tourIds: [],
      priority: 1,
      isActive: true,
    });
  };

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      minParticipants: 2,
      maxParticipants: null,
      discountType: "percentage",
      discountValue: 0,
      appliesTo: "all",
      tourIds: [],
      priority: 1,
      isActive: true,
    });
  };

  const handleEditSeasonal = (seasonal: any) => {
    setEditingSeasonalId(seasonal.id);
    setSeasonalForm({
      name: seasonal.name,
      startDate: seasonal.startDate,
      endDate: seasonal.endDate,
      adjustmentType: seasonal.adjustmentType,
      adjustmentValue: parseFloat(seasonal.adjustmentValue),
      appliesTo: seasonal.appliesTo,
      tourIds: seasonal.tourIds || [],
      priority: seasonal.priority,
      isActive: seasonal.isActive,
    });
    setShowSeasonalModal(true);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name,
      minParticipants: group.minParticipants,
      maxParticipants: group.maxParticipants,
      discountType: group.discountType,
      discountValue: parseFloat(group.discountValue),
      appliesTo: group.appliesTo,
      tourIds: group.tourIds || [],
      priority: group.priority,
      isActive: group.isActive,
    });
    setShowGroupModal(true);
  };

  const handleSubmitSeasonal = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert string dates to Date objects
    const formData = {
      ...seasonalForm,
      startDate: new Date(seasonalForm.startDate),
      endDate: new Date(seasonalForm.endDate),
    };

    if (editingSeasonalId) {
      updateSeasonalMutation.mutate({ id: editingSeasonalId, data: formData });
    } else {
      createSeasonalMutation.mutate(formData);
    }
  };

  const handleSubmitGroup = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert null to undefined for API
    const formData = {
      ...groupForm,
      maxParticipants: groupForm.maxParticipants ?? undefined,
    };

    if (editingGroupId) {
      updateGroupMutation.mutate({ id: editingGroupId, data: formData });
    } else {
      createGroupMutation.mutate(formData);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const tabs = [
    { id: "seasonal" as const, label: "Seasonal Pricing", icon: Calendar },
    { id: "groupDiscounts" as const, label: "Group Discounts", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure seasonal pricing and group discounts
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Changes saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Seasonal Pricing Tab */}
      {activeTab === "seasonal" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Adjust prices based on dates and seasons
            </p>
            <button
              onClick={() => {
                resetSeasonalForm();
                setEditingSeasonalId(null);
                setShowSeasonalModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Season
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {seasonalLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !seasonalPricing || seasonalPricing.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No seasonal pricing yet
                </h3>
                <p className="mt-2 text-gray-500">
                  Create seasonal pricing rules to adjust tour prices for specific date
                  ranges.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adjustment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applies To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seasonalPricing.map((season) => (
                    <tr key={season.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {season.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Priority: {season.priority}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(season.startDate)} - {formatDate(season.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            parseFloat(season.adjustmentValue) > 0
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {parseFloat(season.adjustmentValue) > 0 ? "+" : ""}
                          {season.adjustmentValue}
                          {season.adjustmentType === "percentage" ? "%" : " USD"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {season.appliesTo === "all" ? (
                          "All tours"
                        ) : (
                          <span className="text-xs">
                            {season.tourIds?.length || 0} specific tours
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            season.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {season.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditSeasonal(season)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this seasonal pricing rule?"
                                )
                              ) {
                                deleteSeasonalMutation.mutate({ id: season.id });
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Group Discounts Tab */}
      {activeTab === "groupDiscounts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Offer discounts based on group size
            </p>
            <button
              onClick={() => {
                resetGroupForm();
                setEditingGroupId(null);
                setShowGroupModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Tier
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {groupLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !groupDiscounts || groupDiscounts.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No group discounts yet
                </h3>
                <p className="mt-2 text-gray-500">
                  Create group discount tiers to incentivize larger bookings.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applies To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupDiscounts.map((discount) => (
                    <tr key={discount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {discount.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Priority: {discount.priority}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {discount.minParticipants}
                        {discount.maxParticipants ? ` - ${discount.maxParticipants}` : "+"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {discount.discountValue}
                          {discount.discountType === "percentage" ? "%" : " USD"} off
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {discount.appliesTo === "all" ? (
                          "All tours"
                        ) : (
                          <span className="text-xs">
                            {discount.tourIds?.length || 0} specific tours
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            discount.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {discount.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditGroup(discount)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this group discount?"
                                )
                              ) {
                                deleteGroupMutation.mutate({ id: discount.id });
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Seasonal Pricing Modal */}
      {showSeasonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSeasonalId ? "Edit Seasonal Pricing" : "Add Seasonal Pricing"}
              </h3>
              <button
                onClick={() => {
                  setShowSeasonalModal(false);
                  setEditingSeasonalId(null);
                  resetSeasonalForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSeasonal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={seasonalForm.name}
                  onChange={(e) =>
                    setSeasonalForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  placeholder="e.g., Summer Peak, Holiday Season"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={seasonalForm.startDate}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={seasonalForm.endDate}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    value={seasonalForm.adjustmentType}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({
                        ...prev,
                        adjustmentType: e.target.value as AdjustmentType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={seasonalForm.adjustmentValue}
                      onChange={(e) =>
                        setSeasonalForm((prev) => ({
                          ...prev,
                          adjustmentValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      required
                      placeholder="e.g., 20 or -15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {seasonalForm.adjustmentType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use positive for increase, negative for decrease
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To *
                </label>
                <select
                  value={seasonalForm.appliesTo}
                  onChange={(e) =>
                    setSeasonalForm((prev) => ({
                      ...prev,
                      appliesTo: e.target.value as AppliesTo,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {seasonalForm.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {tours?.data.map((tour) => (
                      <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={seasonalForm.tourIds.includes(tour.id)}
                          onChange={(e) => {
                            setSeasonalForm((prev) => ({
                              ...prev,
                              tourIds: e.target.checked
                                ? [...prev.tourIds, tour.id]
                                : prev.tourIds.filter((id) => id !== tour.id),
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seasonalForm.priority}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher priority rules apply first
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seasonalForm.isActive}
                      onChange={(e) =>
                        setSeasonalForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSeasonalModal(false);
                    setEditingSeasonalId(null);
                    resetSeasonalForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createSeasonalMutation.isPending || updateSeasonalMutation.isPending
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createSeasonalMutation.isPending || updateSeasonalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingSeasonalId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Discount Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingGroupId ? "Edit Group Discount" : "Add Group Discount"}
              </h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setEditingGroupId(null);
                  resetGroupForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  placeholder="e.g., Small Group, Large Group"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Participants *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={groupForm.minParticipants}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        minParticipants: parseInt(e.target.value) || 1,
                      }))
                    }
                    required
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
                    value={groupForm.maxParticipants ?? ""}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        maxParticipants: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={groupForm.discountType}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        discountType: e.target.value as AdjustmentType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={groupForm.discountValue}
                      onChange={(e) =>
                        setGroupForm((prev) => ({
                          ...prev,
                          discountValue: parseFloat(e.target.value) || 0,
                        }))
                      }
                      required
                      placeholder="e.g., 10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {groupForm.discountType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To *
                </label>
                <select
                  value={groupForm.appliesTo}
                  onChange={(e) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      appliesTo: e.target.value as AppliesTo,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {groupForm.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {tours?.data.map((tour) => (
                      <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupForm.tourIds.includes(tour.id)}
                          onChange={(e) => {
                            setGroupForm((prev) => ({
                              ...prev,
                              tourIds: e.target.checked
                                ? [...prev.tourIds, tour.id]
                                : prev.tourIds.filter((id) => id !== tour.id),
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={groupForm.priority}
                    onChange={(e) =>
                      setGroupForm((prev) => ({
                        ...prev,
                        priority: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Higher priority rules apply first
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupForm.isActive}
                      onChange={(e) =>
                        setGroupForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setEditingGroupId(null);
                    resetGroupForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {createGroupMutation.isPending || updateGroupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingGroupId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
