"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Clock,
  Plus,
  X,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { useConfirmModal, ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

interface GuideAvailabilityProps {
  guideId: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export function GuideAvailability({ guideId }: GuideAvailabilityProps) {
  const utils = trpc.useUtils();
  const confirmModal = useConfirmModal();

  // Fetch weekly availability
  const { data: weeklySlots, isLoading: loadingWeekly } =
    trpc.guideAvailability.getWeeklyAvailability.useQuery({ guideId });

  // Fetch overrides (next 90 days)
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 90);

  const { data: overrides, isLoading: loadingOverrides } =
    trpc.guideAvailability.getOverrides.useQuery({
      guideId,
      from: today,
      to: futureDate,
    });

  // State for adding new slots
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
  });

  // State for adding overrides
  const [isAddingOverride, setIsAddingOverride] = useState(false);
  const [newOverride, setNewOverride] = useState({
    date: "",
    isAvailable: false,
    reason: "",
  });

  // Mutations
  const addSlotMutation = trpc.guideAvailability.addWeeklySlot.useMutation({
    onSuccess: () => {
      utils.guideAvailability.getWeeklyAvailability.invalidate({ guideId });
      toast.success("Time slot added successfully");
      setIsAddingSlot(false);
      setNewSlot({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add time slot");
    },
  });

  const deleteSlotMutation = trpc.guideAvailability.deleteWeeklySlot.useMutation({
    onSuccess: () => {
      utils.guideAvailability.getWeeklyAvailability.invalidate({ guideId });
      toast.success("Time slot deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete time slot");
    },
  });

  const createOverrideMutation = trpc.guideAvailability.createOverride.useMutation({
    onSuccess: () => {
      utils.guideAvailability.getOverrides.invalidate({ guideId });
      toast.success("Date override added successfully");
      setIsAddingOverride(false);
      setNewOverride({
        date: "",
        isAvailable: false,
        reason: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add date override");
    },
  });

  const deleteOverrideMutation = trpc.guideAvailability.deleteOverride.useMutation({
    onSuccess: () => {
      utils.guideAvailability.getOverrides.invalidate({ guideId });
      toast.success("Date override deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete date override");
    },
  });

  const handleAddSlot = () => {
    addSlotMutation.mutate({
      guideId,
      slot: newSlot,
    });
  };

  const handleDeleteSlot = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Delete Time Slot",
      description: "This will permanently remove this weekly availability time slot. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteSlotMutation.mutate({ id });
    }
  };

  const handleAddOverride = () => {
    if (!newOverride.date) {
      toast.error("Please select a date");
      return;
    }

    createOverrideMutation.mutate({
      guideId,
      override: {
        date: new Date(newOverride.date),
        isAvailable: newOverride.isAvailable,
        reason: newOverride.reason || undefined,
      },
    });
  };

  const handleDeleteOverride = async (id: string) => {
    const confirmed = await confirmModal.confirm({
      title: "Delete Override",
      description: "This will remove this date override and restore the guide's regular weekly availability for this date.",
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteOverrideMutation.mutate({ id });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // Group slots by day
  const slotsByDay = weeklySlots?.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek]!.push(slot);
    return acc;
  }, {} as Record<number, typeof weeklySlots>) ?? {};

  if (loadingWeekly || loadingOverrides) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Availability Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Weekly Availability</h3>
            <p className="text-sm text-gray-500 mt-1">
              Set recurring weekly availability for this guide
            </p>
          </div>
          {!isAddingSlot && (
            <button
              onClick={() => setIsAddingSlot(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Time Slot
            </button>
          )}
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = slotsByDay?.[day.value] || [];
            const hasAvailableSlots = daySlots.some((slot) => slot.isAvailable);

            return (
              <div
                key={day.value}
                className={`rounded-lg border p-3 ${
                  hasAvailableSlots
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <h4 className="font-medium text-sm text-gray-900 mb-2">
                  {day.label}
                </h4>
                <div className="space-y-2">
                  {daySlots.length > 0 ? (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`relative group text-xs rounded px-2 py-1.5 ${
                          slot.isAvailable
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-200 text-gray-600 border border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                          title="Delete slot"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">Unavailable</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Slot Form */}
        {isAddingSlot && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add New Time Slot</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day
                </label>
                <select
                  value={newSlot.dayOfWeek}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, dayOfWeek: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, startTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, endTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newSlot.isAvailable ? "available" : "unavailable"}
                  onChange={(e) =>
                    setNewSlot({
                      ...newSlot,
                      isAvailable: e.target.value === "available",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleAddSlot}
                disabled={addSlotMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addSlotMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Add Slot
                  </>
                )}
              </button>
              <button
                onClick={() => setIsAddingSlot(false)}
                disabled={addSlotMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>

            {addSlotMutation.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{addSlotMutation.error.message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date Overrides Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Date Overrides</h3>
            <p className="text-sm text-gray-500 mt-1">
              Override availability for specific dates (e.g., vacation, sick days)
            </p>
          </div>
          {!isAddingOverride && (
            <button
              onClick={() => setIsAddingOverride(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Override
            </button>
          )}
        </div>

        {/* Add Override Form */}
        {isAddingOverride && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add Date Override</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newOverride.date}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, date: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newOverride.isAvailable ? "available" : "unavailable"}
                  onChange={(e) =>
                    setNewOverride({
                      ...newOverride,
                      isAvailable: e.target.value === "available",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="unavailable">Unavailable</option>
                  <option value="available">Available</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={newOverride.reason}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, reason: e.target.value })
                  }
                  placeholder="e.g., Vacation"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleAddOverride}
                disabled={createOverrideMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createOverrideMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Add Override
                  </>
                )}
              </button>
              <button
                onClick={() => setIsAddingOverride(false)}
                disabled={createOverrideMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>

            {createOverrideMutation.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">
                  {createOverrideMutation.error.message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Overrides List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {overrides && overrides.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        override.isAvailable
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Calendar
                        className={`h-5 w-5 ${
                          override.isAvailable
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {formatDate(override.date)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            override.isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {override.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                      {override.reason && (
                        <p className="text-sm text-gray-500 mt-1">
                          {override.reason}
                        </p>
                      )}
                      {override.startTime && override.endTime && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {override.startTime} - {override.endTime}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteOverride(override.id)}
                    disabled={deleteOverrideMutation.isPending}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete override"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No upcoming overrides</p>
            </div>
          )}
        </div>
      </div>

      {confirmModal.ConfirmModal}
    </div>
  );
}
