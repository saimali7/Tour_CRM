"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Target,
  Loader2,
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
} from "lucide-react";
import type { Goal } from "@tour/database";

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSuccess?: () => void;
}

const METRIC_OPTIONS = [
  {
    value: "revenue",
    label: "Revenue",
    description: "Track total revenue from bookings",
    icon: DollarSign,
    placeholder: "e.g., 50000",
    format: (v: string) => `$${parseFloat(v).toLocaleString()}`,
  },
  {
    value: "bookings",
    label: "Bookings",
    description: "Track number of confirmed bookings",
    icon: CalendarDays,
    placeholder: "e.g., 100",
    format: (v: string) => parseInt(v).toLocaleString(),
  },
  {
    value: "capacity_utilization",
    label: "Capacity Utilization",
    description: "Track percentage of tour capacity filled",
    icon: TrendingUp,
    placeholder: "e.g., 75",
    format: (v: string) => `${parseFloat(v)}%`,
  },
  {
    value: "new_customers",
    label: "New Customers",
    description: "Track number of new customers acquired",
    icon: Users,
    placeholder: "e.g., 50",
    format: (v: string) => parseInt(v).toLocaleString(),
  },
] as const;

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

// Helper to format date for input[type="date"]
function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export function GoalModal({ open, onOpenChange, goal, onSuccess }: GoalModalProps) {
  const utils = trpc.useUtils();
  const isEditing = !!goal;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metricType: "revenue" as typeof METRIC_OPTIONS[number]["value"],
    targetValue: "",
    periodType: "monthly" as typeof PERIOD_OPTIONS[number]["value"],
    periodStart: "",
    periodEnd: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when editing
  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: goal.description || "",
        metricType: goal.metricType as typeof formData.metricType,
        targetValue: goal.targetValue,
        periodType: goal.periodType as typeof formData.periodType,
        periodStart: formatDateForInput(new Date(goal.periodStart)),
        periodEnd: formatDateForInput(new Date(goal.periodEnd)),
      });
    } else {
      // Reset form for new goal
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      setFormData({
        name: "",
        description: "",
        metricType: "revenue",
        targetValue: "",
        periodType: "monthly",
        periodStart: formatDateForInput(startOfMonth),
        periodEnd: formatDateForInput(endOfMonth),
      });
    }
    setErrors({});
  }, [goal, open]);

  // Update period dates when period type changes
  const handlePeriodTypeChange = (periodType: typeof formData.periodType) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (periodType) {
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "quarterly": {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      }
      case "yearly":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setFormData((prev) => ({
      ...prev,
      periodType,
      periodStart: formatDateForInput(start),
      periodEnd: formatDateForInput(end),
    }));
  };

  const createMutation = trpc.goal.create.useMutation({
    onSuccess: () => {
      utils.goal.list.invalidate();
      utils.goal.getActive.invalidate();
      utils.goal.getSummary.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const updateMutation = trpc.goal.update.useMutation({
    onSuccess: () => {
      utils.goal.list.invalidate();
      utils.goal.getActive.invalidate();
      utils.goal.getSummary.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Goal name is required";
    }

    if (!formData.targetValue || parseFloat(formData.targetValue) <= 0) {
      newErrors.targetValue = "Target value must be greater than 0";
    }

    if (!formData.periodStart) {
      newErrors.periodStart = "Start date is required";
    }

    if (!formData.periodEnd) {
      newErrors.periodEnd = "End date is required";
    }

    if (formData.periodStart && formData.periodEnd) {
      if (new Date(formData.periodStart) >= new Date(formData.periodEnd)) {
        newErrors.periodEnd = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      metricType: formData.metricType,
      targetValue: formData.targetValue,
      periodType: formData.periodType,
      periodStart: new Date(formData.periodStart),
      periodEnd: new Date(formData.periodEnd),
    };

    if (isEditing && goal) {
      updateMutation.mutate({
        id: goal.id,
        data: {
          name: payload.name,
          description: payload.description,
          targetValue: payload.targetValue,
        },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === formData.metricType);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            {isEditing ? "Edit Goal" : "Create New Goal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Goal Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Goal Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Q1 Revenue Target"
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-success/30 focus:border-success"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Add context or notes about this goal..."
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-success/30 focus:border-success resize-none"
            />
          </div>

          {/* Metric Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Metric Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METRIC_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.metricType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, metricType: option.value }))}
                    disabled={isEditing}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? "border-success bg-success/5"
                        : "border-border hover:border-success/50"
                    } ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-success" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${isSelected ? "text-success" : "text-foreground"}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Value */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Target Value
            </label>
            <div className="relative">
              {formData.metricType === "revenue" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              )}
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetValue: e.target.value }))}
                placeholder={selectedMetric?.placeholder}
                min="0"
                step={formData.metricType === "capacity_utilization" ? "0.1" : "1"}
                className={`w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-success/30 focus:border-success ${
                  formData.metricType === "revenue" ? "pl-7" : ""
                } ${formData.metricType === "capacity_utilization" ? "pr-8" : ""}`}
              />
              {formData.metricType === "capacity_utilization" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              )}
            </div>
            {errors.targetValue && (
              <p className="mt-1 text-sm text-destructive">{errors.targetValue}</p>
            )}
            {formData.targetValue && selectedMetric && (
              <p className="mt-1 text-sm text-muted-foreground">
                Target: {selectedMetric.format(formData.targetValue)}
              </p>
            )}
          </div>

          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Period
            </label>
            <div className="flex gap-2 mb-3">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePeriodTypeChange(option.value)}
                  disabled={isEditing}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.periodType === option.value
                      ? "border-success bg-success/5 text-success"
                      : "border-border text-muted-foreground hover:border-success/50"
                  } ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData((prev) => ({ ...prev, periodStart: e.target.value }))}
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-success/30 focus:border-success disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {errors.periodStart && (
                  <p className="mt-1 text-sm text-destructive">{errors.periodStart}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData((prev) => ({ ...prev, periodEnd: e.target.value }))}
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-success/30 focus:border-success disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {errors.periodEnd && (
                  <p className="mt-1 text-sm text-destructive">{errors.periodEnd}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-success hover:bg-success"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>{isEditing ? "Save Changes" : "Create Goal"}</>
              )}
            </Button>
          </div>

          {(createMutation.error || updateMutation.error) && (
            <p className="text-sm text-destructive text-center">
              {createMutation.error?.message || updateMutation.error?.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
