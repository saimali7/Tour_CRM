"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Loader2, Clock, Users, MapPin, ChevronDown, ChevronUp, FileText, User, DollarSign, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const { data: toursData, isLoading: toursLoading } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  const { data: guidesData } = trpc.guide.list.useQuery({
    pagination: { page: 1, limit: 100 },
  });

  const [formData, setFormData] = useState({
    tourId: schedule?.tourId ?? "",
    guideId: schedule?.guideId ?? "",
    date: schedule?.startsAt ? new Date(schedule.startsAt).toISOString().split("T")[0] : "",
    startTime: schedule?.startsAt ? new Date(schedule.startsAt).toTimeString().slice(0, 5) : "09:00",
    endTime: schedule?.endsAt ? new Date(schedule.endsAt).toTimeString().slice(0, 5) : "11:00",
    maxParticipants: schedule?.maxParticipants ?? 10,
    price: schedule?.price ?? "",
    meetingPoint: schedule?.meetingPoint ?? "",
    meetingPointDetails: schedule?.meetingPointDetails ?? "",
    internalNotes: schedule?.internalNotes ?? "",
    publicNotes: schedule?.publicNotes ?? "",
  });

  // Collapsible sections
  const [showGuide, setShowGuide] = useState(isEditing && !!schedule?.guideId);
  const [showOverrides, setShowOverrides] = useState(
    isEditing && !!(schedule?.price || schedule?.meetingPoint)
  );
  const [showNotes, setShowNotes] = useState(
    isEditing && !!(schedule?.internalNotes || schedule?.publicNotes)
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.schedule.create.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      toast.success("Schedule created successfully");
      router.push(`/org/${slug}/availability`);
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
      router.push(`/org/${slug}/availability`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Selected tour
  const selectedTour = useMemo(
    () => toursData?.data.find((t) => t.id === formData.tourId),
    [toursData?.data, formData.tourId]
  );

  // Validate end time is after start time
  const isValidTimeRange = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return false;
    return formData.endTime > formData.startTime;
  }, [formData.startTime, formData.endTime]);

  // Can submit
  const canSubmit = formData.tourId && formData.date && formData.startTime && formData.endTime && isValidTimeRange;

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

    const tour = toursData?.data.find((t) => t.id === tourId);
    if (tour && formData.startTime) {
      const [hours, minutes] = formData.startTime.split(":").map(Number);
      const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
      const endMinutes = startMinutes + tour.durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
      setFormData((prev) => ({
        ...prev,
        endTime,
        maxParticipants: tour.maxParticipants,
      }));
    }
  };

  // Recalculate end time when start time changes
  const handleStartTimeChange = (startTime: string) => {
    setFormData((prev) => ({ ...prev, startTime }));

    if (selectedTour) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
      const endMinutes = startMinutes + selectedTour.durationMinutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
      setFormData((prev) => ({ ...prev, endTime }));
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Collapsible section component
  const CollapsibleSection = ({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="p-4 bg-card">{children}</div>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      {/* Tour Selection - Visual Cards */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Select Tour</h2>
          <p className="text-sm text-muted-foreground mt-1">Which tour is this schedule for?</p>
        </div>

        {isEditing ? (
          // Show selected tour in edit mode (non-editable)
          selectedTour && (
            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
              <div className="flex gap-4">
                {selectedTour.coverImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectedTour.coverImageUrl} alt={selectedTour.name} className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground">{selectedTour.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(selectedTour.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {selectedTour.maxParticipants}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Tour cannot be changed after creation</p>
                </div>
              </div>
            </div>
          )
        ) : toursLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : toursData?.data && toursData.data.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {toursData.data.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => handleTourChange(tour.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  formData.tourId === tour.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-input"
                )}
              >
                <div className="flex gap-4">
                  {tour.coverImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={tour.coverImageUrl} alt={tour.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{tour.name}</h3>
                      {formData.tourId === tour.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(tour.durationMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {tour.maxParticipants}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p>No active tours available</p>
          </div>
        )}
      </div>

      {/* Date & Time - Shown after tour selection */}
      {formData.tourId && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">When?</h2>
            <p className="text-sm text-muted-foreground mt-1">Set the date and start time</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Time *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Auto-calculated info */}
          {selectedTour && formData.date && formData.startTime && (
            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ends at</p>
                  <p className="font-medium text-foreground">{formData.endTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">{formatDuration(selectedTour.durationMinutes)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capacity</p>
                  <p className="font-medium text-foreground">{formData.maxParticipants} guests</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Sections */}
      {formData.tourId && (
        <div className="space-y-3">
          {/* Guide Assignment */}
          <CollapsibleSection title="Assign Guide" icon={User} isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)}>
            <select
              value={formData.guideId}
              onChange={(e) => setFormData((prev) => ({ ...prev, guideId: e.target.value }))}
              className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">No guide assigned yet</option>
              {guidesData?.data.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.firstName} {guide.lastName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">You can also assign guides later from the schedule detail page</p>
          </CollapsibleSection>

          {/* Overrides */}
          <CollapsibleSection title="Price & Meeting Point" icon={DollarSign} isOpen={showOverrides} onToggle={() => setShowOverrides(!showOverrides)}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Price Override ($)</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder={selectedTour ? `Default: $${selectedTour.basePrice}` : "Enter price"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Max Participants</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxParticipants: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Meeting Point Override</label>
                <input
                  type="text"
                  value={formData.meetingPoint}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meetingPoint: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={selectedTour?.meetingPoint || "Enter meeting point"}
                />
              </div>
              {formData.meetingPoint && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Meeting Point Details</label>
                  <input
                    type="text"
                    value={formData.meetingPointDetails}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meetingPointDetails: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Additional directions or info"
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Notes */}
          <CollapsibleSection title="Notes" icon={FileText} isOpen={showNotes} onToggle={() => setShowNotes(!showNotes)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Internal Notes</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, internalNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Notes for staff only..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Public Notes</label>
                <textarea
                  value={formData.publicNotes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, publicNotes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Notes shown to customers on confirmation..."
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Update Schedule" : "Create Schedule"}
        </button>
      </div>
    </form>
  );
}
