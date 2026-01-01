"use client";

import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { BookingHopper } from "./booking-hopper";
import { GuideTimeline } from "./guide-timeline";
import { RouteMapPanel } from "./route-map-panel";
import { AssignmentDndProvider } from "./dnd-context";
import type { BookingCardData } from "./booking-card";
import type { GuideData } from "./guide-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, Map } from "lucide-react";

interface RoutePoint {
  id: string;
  type: "pickup" | "destination";
  name: string;
  zone?: string | null;
  address?: string;
  estimatedTime?: string;
  order: number;
}

interface RouteRecommendation {
  type: "info" | "warning" | "suggestion";
  message: string;
}

interface AssignmentLayoutProps {
  bookings: BookingCardData[];
  guides: GuideData[];
  // Route context for selected guide
  selectedGuideRoutePoints: RoutePoint[];
  selectedGuideRecommendations: RouteRecommendation[];
  selectedGuideTotalDuration?: number;
  selectedGuideTotalDistance?: number;
  // Loading states
  isLoading?: boolean;
  // Selection state
  selectedBookingId?: string | null;
  selectedGuideId?: string | null;
  onSelectBooking: (bookingId: string | null) => void;
  onSelectGuide: (guideId: string | null) => void;
  // Drag-and-drop assignment
  onAssign: (bookingId: string, guideAssignmentId: string) => void;
  className?: string;
}

export function AssignmentLayout({
  bookings,
  guides,
  selectedGuideRoutePoints,
  selectedGuideRecommendations,
  selectedGuideTotalDuration,
  selectedGuideTotalDistance,
  isLoading,
  selectedBookingId,
  selectedGuideId,
  onSelectBooking,
  onSelectGuide,
  onAssign,
  className,
}: AssignmentLayoutProps) {
  const selectedGuide = guides.find((g) => g.id === selectedGuideId);

  // Get guide data for impact calculation
  const getGuideData = useCallback(
    (guideAssignmentId: string) => {
      const guide = guides.find((g) => g.id === guideAssignmentId);
      if (!guide) return null;
      return {
        currentLoad: guide.currentLoad,
        vehicleCapacity: guide.vehicleCapacity,
        preferredZones: guide.preferredZones,
      };
    },
    [guides]
  );

  return (
    <AssignmentDndProvider
      bookings={bookings}
      onAssign={onAssign}
      getGuideData={getGuideData}
    >
      {/* Desktop: Three-panel layout */}
      <div className={cn("hidden lg:flex h-full", className)}>
        {/* Left Panel: Booking Hopper */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-card">
          <BookingHopper
            bookings={bookings}
            selectedBookingId={selectedBookingId}
            onSelectBooking={onSelectBooking}
            isLoading={isLoading}
          />
        </div>

        {/* Center Panel: Guide Timeline */}
        <div className="flex-1 min-w-0 bg-background">
          <GuideTimeline
            guides={guides}
            selectedGuideId={selectedGuideId}
            onSelectGuide={onSelectGuide}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel: Route Context */}
        <div className="w-72 flex-shrink-0 border-l border-border bg-card">
          <RouteMapPanel
            selectedGuideId={selectedGuideId}
            guideName={selectedGuide?.name}
            routePoints={selectedGuideRoutePoints}
            recommendations={selectedGuideRecommendations}
            totalDuration={selectedGuideTotalDuration}
            totalDistance={selectedGuideTotalDistance}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Mobile/Tablet: Tabbed layout */}
      <div className={cn("lg:hidden flex flex-col h-full", className)}>
        <Tabs defaultValue="bookings" className="flex-1 flex flex-col">
          <TabsList className="flex-shrink-0 w-full justify-start rounded-none border-b bg-background px-4 h-12">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Bookings</span>
              {bookings.filter((b) => !b.assignedGuideId).length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600">
                  {bookings.filter((b) => !b.assignedGuideId).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="route" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span>Route</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="flex-1 mt-0 overflow-hidden">
            <BookingHopper
              bookings={bookings}
              selectedBookingId={selectedBookingId}
              onSelectBooking={onSelectBooking}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 mt-0 overflow-hidden">
            <GuideTimeline
              guides={guides}
              selectedGuideId={selectedGuideId}
              onSelectGuide={onSelectGuide}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="route" className="flex-1 mt-0 overflow-hidden">
            <RouteMapPanel
              selectedGuideId={selectedGuideId}
              guideName={selectedGuide?.name}
              routePoints={selectedGuideRoutePoints}
              recommendations={selectedGuideRecommendations}
              totalDuration={selectedGuideTotalDuration}
              totalDistance={selectedGuideTotalDistance}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AssignmentDndProvider>
  );
}
