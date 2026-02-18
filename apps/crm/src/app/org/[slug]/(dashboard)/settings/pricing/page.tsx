"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
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
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { formatDbDateKey, parseDateKeyToLocalDate } from "@/lib/date-time";

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
  const { confirm, ConfirmModal } = useConfirmModal();

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
    onError: (error) => {
      toast.error(error.message || "Failed to create seasonal pricing");
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
    onError: (error) => {
      toast.error(error.message || "Failed to update seasonal pricing");
    },
  });

  const deleteSeasonalMutation = trpc.seasonalPricing.delete.useMutation({
    onSuccess: () => {
      utils.seasonalPricing.list.invalidate();
      showSuccessMessage();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete seasonal pricing");
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
    onError: (error) => {
      toast.error(error.message || "Failed to create group discount");
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
    onError: (error) => {
      toast.error(error.message || "Failed to update group discount");
    },
  });

  const deleteGroupMutation = trpc.groupDiscount.delete.useMutation({
    onSuccess: () => {
      utils.groupDiscount.list.invalidate();
      showSuccessMessage();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete group discount");
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

  const handleEditSeasonal = (seasonal: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    adjustmentType: "percentage" | "fixed";
    adjustmentValue: string;
    appliesTo: "all" | "specific";
    tourIds?: string[] | null;
    priority: number | null;
    isActive: boolean | null;
  }) => {
    setEditingSeasonalId(seasonal.id);
    setSeasonalForm({
      name: seasonal.name,
      startDate: seasonal.startDate,
      endDate: seasonal.endDate,
      adjustmentType: seasonal.adjustmentType,
      adjustmentValue: parseFloat(seasonal.adjustmentValue),
      appliesTo: seasonal.appliesTo,
      tourIds: seasonal.tourIds || [],
      priority: seasonal.priority ?? 1,
      isActive: seasonal.isActive ?? true,
    });
    setShowSeasonalModal(true);
  };

  const handleEditGroup = (group: {
    id: string;
    name: string;
    minParticipants: number;
    maxParticipants: number | null;
    discountType: "percentage" | "fixed";
    discountValue: string;
    appliesTo: "all" | "specific";
    tourIds?: string[] | null;
    priority: number | null;
    isActive: boolean | null;
  }) => {
    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name,
      minParticipants: group.minParticipants,
      maxParticipants: group.maxParticipants,
      discountType: group.discountType,
      discountValue: parseFloat(group.discountValue),
      appliesTo: group.appliesTo,
      tourIds: group.tourIds || [],
      priority: group.priority ?? 1,
      isActive: group.isActive ?? true,
    });
    setShowGroupModal(true);
  };

  const handleSubmitSeasonal = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert string dates to Date objects
    const formData = {
      ...seasonalForm,
      startDate: parseDateKeyToLocalDate(seasonalForm.startDate),
      endDate: parseDateKeyToLocalDate(seasonalForm.endDate),
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
    }).format(parseDateKeyToLocalDate(formatDbDateKey(date)));
  };

  const tabs = [
    { id: "seasonal" as const, label: "Seasonal Pricing", icon: Calendar },
    { id: "groupDiscounts" as const, label: "Group Discounts", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure seasonal pricing and group discounts
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 text-success bg-success/10 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Changes saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-input"
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
            <p className="text-sm text-muted-foreground">
              Adjust prices based on dates and seasons
            </p>
            <button
              onClick={() => {
                resetSeasonalForm();
                setEditingSeasonalId(null);
                setShowSeasonalModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Season
            </button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {seasonalLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !seasonalPricing || seasonalPricing.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  No seasonal pricing yet
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Create seasonal pricing rules to adjust tour prices for specific date
                  ranges.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Adjustment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Applies To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {seasonalPricing.map((season) => (
                    <tr key={season.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {season.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Priority: {season.priority}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(season.startDate)} - {formatDate(season.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            parseFloat(season.adjustmentValue) > 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {parseFloat(season.adjustmentValue) > 0 ? "+" : ""}
                          {season.adjustmentValue}
                          {season.adjustmentType === "percentage" ? "%" : " USD"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                              ? "bg-success/10 text-success"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {season.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditSeasonal(season)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: "Delete Seasonal Pricing",
                                description: "This will permanently delete this seasonal pricing rule. Tours will revert to their base prices during this date range. This action cannot be undone.",
                                confirmLabel: "Delete Seasonal Pricing",
                                variant: "destructive",
                              });

                              if (confirmed) {
                                deleteSeasonalMutation.mutate({ id: season.id });
                              }
                            }}
                            className="p-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded"
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
            <p className="text-sm text-muted-foreground">
              Offer discounts based on group size
            </p>
            <button
              onClick={() => {
                resetGroupForm();
                setEditingGroupId(null);
                setShowGroupModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Tier
            </button>
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {groupLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !groupDiscounts || groupDiscounts.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  No group discounts yet
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Create group discount tiers to incentivize larger bookings.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Group Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Applies To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {groupDiscounts.map((discount) => (
                    <tr key={discount.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {discount.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Priority: {discount.priority}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {discount.minParticipants}
                        {discount.maxParticipants ? ` - ${discount.maxParticipants}` : "+"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          {discount.discountValue}
                          {discount.discountType === "percentage" ? "%" : " USD"} off
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
                              ? "bg-success/10 text-success"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {discount.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditGroup(discount)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: "Delete Group Discount",
                                description: "This will permanently delete this group discount tier. Groups will no longer receive this discount on new bookings. Existing bookings are not affected. This action cannot be undone.",
                                confirmLabel: "Delete Group Discount",
                                variant: "destructive",
                              });

                              if (confirmed) {
                                deleteGroupMutation.mutate({ id: discount.id });
                              }
                            }}
                            className="p-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded"
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
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingSeasonalId ? "Edit Seasonal Pricing" : "Add Seasonal Pricing"}
              </h3>
              <button
                onClick={() => {
                  setShowSeasonalModal(false);
                  setEditingSeasonalId(null);
                  resetSeasonalForm();
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSeasonal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={seasonalForm.startDate}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={seasonalForm.endDate}
                    onChange={(e) =>
                      setSeasonalForm((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {seasonalForm.adjustmentType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use positive for increase, negative for decrease
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {seasonalForm.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-input rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
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
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority rules apply first
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seasonalForm.isActive}
                      onChange={(e) =>
                        setSeasonalForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowSeasonalModal(false);
                    setEditingSeasonalId(null);
                    resetSeasonalForm();
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createSeasonalMutation.isPending || updateSeasonalMutation.isPending
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingGroupId ? "Edit Group Discount" : "Add Group Discount"}
              </h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setEditingGroupId(null);
                  resetGroupForm();
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {groupForm.discountType === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tours</option>
                  <option value="specific">Specific Tours</option>
                </select>
              </div>

              {groupForm.appliesTo === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Select Tours *
                  </label>
                  <div className="border border-input rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
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
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{tour.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority rules apply first
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={groupForm.isActive}
                      onChange={(e) =>
                        setGroupForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setEditingGroupId(null);
                    resetGroupForm();
                  }}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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

      {ConfirmModal}
    </div>
  );
}
