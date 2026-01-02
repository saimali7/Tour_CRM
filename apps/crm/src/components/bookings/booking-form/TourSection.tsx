"use client";

import { useMemo } from "react";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { trpc } from "@/lib/trpc";
import { Clock } from "lucide-react";

interface TourSectionProps {
  tourId: string;
  onTourChange: (tourId: string) => void;
  disabled?: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

export function TourSection({
  tourId,
  onTourChange,
  disabled = false,
}: TourSectionProps) {
  // Fetch tours for dropdown
  const { data: toursData, isLoading: toursLoading } = trpc.tour.list.useQuery({
    pagination: { page: 1, limit: 100 },
    filters: { status: "active" },
  });

  // Transform tours to combobox options
  const tourOptions: ComboboxOption[] = useMemo(() => {
    if (!toursData?.data) return [];
    return toursData.data.map((tour) => ({
      value: tour.id,
      label: tour.name,
      sublabel: formatDuration(tour.durationMinutes),
    }));
  }, [toursData?.data]);

  // Get selected tour details for display
  const selectedTour = useMemo(() => {
    if (!tourId || !toursData?.data) return null;
    return toursData.data.find((t) => t.id === tourId);
  }, [tourId, toursData?.data]);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Tour *
        </label>
        <Combobox
          options={tourOptions}
          value={tourId}
          onValueChange={onTourChange}
          placeholder="Select a tour..."
          searchPlaceholder="Search tours..."
          emptyText="No tours found"
          isLoading={toursLoading}
          disabled={disabled}
        />
      </div>

      {selectedTour && (
        <div className="bg-muted rounded-lg p-4 md:col-span-2">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Selected Tour
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tour Name</p>
              <p className="font-medium">{selectedTour.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDuration(selectedTour.durationMinutes)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Base Price</p>
              <p className="font-medium">
                ${parseFloat(selectedTour.basePrice).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
