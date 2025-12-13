"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleFormProps {
  schedule?: {
    id: string;
    tourId: string;
    guideId: string | null;
    startsAt: Date;
    endsAt: Date;
    maxParticipants: number;
    price: string | null;
    meetingPoint: string | null;
    meetingPointDetails: string | null;
    internalNotes: string | null;
    publicNotes: string | null;
  };
}

export function ScheduleForm({ schedule }: ScheduleFormProps) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isEditing = !!schedule;

  const { data: toursData } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  const { data: guidesData } = trpc.guide.list.useQuery({
    pagination: { page: 1, limit: 100 },
  });

  const [formData, setFormData] = useState({
    tourId: schedule?.tourId ?? "",
    guideId: schedule?.guideId ?? "",
    date: schedule?.startsAt
      ? new Date(schedule.startsAt).toISOString().split("T")[0]
      : "",
    startTime: schedule?.startsAt
      ? new Date(schedule.startsAt).toTimeString().slice(0, 5)
      : "09:00",
    endTime: schedule?.endsAt
      ? new Date(schedule.endsAt).toTimeString().slice(0, 5)
      : "11:00",
    maxParticipants: schedule?.maxParticipants ?? 10,
    price: schedule?.price ?? "",
    meetingPoint: schedule?.meetingPoint ?? "",
    meetingPointDetails: schedule?.meetingPointDetails ?? "",
    internalNotes: schedule?.internalNotes ?? "",
    publicNotes: schedule?.publicNotes ?? "",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      toast.success("Schedule created successfully");
      router.push(`/org/${slug}/schedules`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });

  const updateMutation = trpc.schedule.update.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      utils.schedule.getById.invalidate({ id: schedule?.id });
      toast.success("Schedule updated successfully");
      router.push(`/org/${slug}/schedules`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startsAt = new Date(`${formData.date}T${formData.startTime}`);
    const endsAt = new Date(`${formData.date}T${formData.endTime}`);

    const submitData = {
      tourId: formData.tourId,
      guideId: formData.guideId || undefined,
      startsAt,
      endsAt,
      maxParticipants: formData.maxParticipants,
      price: formData.price || undefined,
      meetingPoint: formData.meetingPoint || undefined,
      meetingPointDetails: formData.meetingPointDetails || undefined,
      internalNotes: formData.internalNotes || undefined,
      publicNotes: formData.publicNotes || undefined,
    };

    if (isEditing && schedule) {
      updateMutation.mutate({
        id: schedule.id,
        data: {
          guideId: submitData.guideId,
          startsAt: submitData.startsAt,
          endsAt: submitData.endsAt,
          maxParticipants: submitData.maxParticipants,
          price: submitData.price,
          meetingPoint: submitData.meetingPoint,
          meetingPointDetails: submitData.meetingPointDetails,
          internalNotes: submitData.internalNotes,
          publicNotes: submitData.publicNotes,
        },
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Auto-calculate end time based on tour duration
  const handleTourChange = (tourId: string) => {
    setFormData((prev) => ({ ...prev, tourId }));

    const selectedTour = toursData?.data.find((t) => t.id === tourId);
    if (selectedTour && formData.startTime) {
      const [hours, minutes] = formData.startTime.split(":").map(Number);
      const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
      const endMinutes = startMinutes + selectedTour.durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
      setFormData((prev) => ({
        ...prev,
        endTime,
        maxParticipants: selectedTour.maxParticipants,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      {/* Tour Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Tour & Guide</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tour *
            </label>
            <select
              required
              value={formData.tourId}
              onChange={(e) => handleTourChange(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
            >
              <option value="">Select a tour</option>
              {toursData?.data.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.name} ({tour.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Guide
            </label>
            <select
              value={formData.guideId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, guideId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">No guide assigned</option>
              {guidesData?.data.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.firstName} {guide.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, startTime: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={formData.endTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, endTime: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Capacity & Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Capacity & Pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  maxParticipants: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Override ($)
            </label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Leave empty to use tour price"
            />
          </div>
        </div>
      </div>

      {/* Meeting Point Override */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Meeting Point Override</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Point
            </label>
            <input
              type="text"
              value={formData.meetingPoint}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meetingPoint: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Leave empty to use tour default"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Additional meeting point info"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.internalNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Notes for staff only..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public Notes
            </label>
            <textarea
              value={formData.publicNotes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, publicNotes: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Notes shown to customers..."
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Schedule" : "Create Schedule"}
        </button>
      </div>
    </form>
  );
}
