"use client";

import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { BookingCardGhost, type BookingCardData } from "./booking-card";

// Types for drag-and-drop operations
export interface DragData {
  type: "booking";
  booking: BookingCardData;
}

export interface DropData {
  type: "guide";
  guideAssignmentId: string;
  guideName: string;
  currentLoad: number;
  vehicleCapacity: number;
  zone?: string | null;
}

interface AssignmentDndContextValue {
  activeBooking: BookingCardData | null;
  overId: string | null;
  impactWarning: string | null;
}

const AssignmentDndContext = createContext<AssignmentDndContextValue>({
  activeBooking: null,
  overId: null,
  impactWarning: null,
});

export function useAssignmentDnd() {
  return useContext(AssignmentDndContext);
}

interface AssignmentDndProviderProps {
  children: ReactNode;
  bookings: BookingCardData[];
  onAssign: (bookingId: string, guideAssignmentId: string) => void;
  getGuideData?: (guideAssignmentId: string) => {
    currentLoad: number;
    vehicleCapacity: number;
    preferredZones?: string[];
  } | null;
}

export function AssignmentDndProvider({
  children,
  bookings,
  onAssign,
  getGuideData,
}: AssignmentDndProviderProps) {
  const [activeBooking, setActiveBooking] = useState<BookingCardData | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [impactWarning, setImpactWarning] = useState<string | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Calculate impact warning when hovering over a guide
  const calculateImpact = useCallback(
    (booking: BookingCardData, guideAssignmentId: string): string | null => {
      if (!getGuideData) return null;

      const guideData = getGuideData(guideAssignmentId);
      if (!guideData) return null;

      const newLoad = guideData.currentLoad + booking.guestCount;
      const capacity = guideData.vehicleCapacity;

      if (newLoad > capacity) {
        const overflow = newLoad - capacity;
        return `Over capacity by ${overflow} guest${overflow > 1 ? "s" : ""}`;
      }

      // Zone mismatch warning
      if (
        booking.zone &&
        guideData.preferredZones &&
        guideData.preferredZones.length > 0 &&
        !guideData.preferredZones.includes(booking.zone.toLowerCase())
      ) {
        return `Zone mismatch: ${booking.zone}`;
      }

      return null;
    },
    [getGuideData]
  );

  // Drag event handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DragData | undefined;
      if (data?.type === "booking") {
        setActiveBooking(data.booking);
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;

      if (!over) {
        setOverId(null);
        setImpactWarning(null);
        return;
      }

      const dropData = over.data.current as DropData | undefined;
      if (dropData?.type !== "guide") {
        setOverId(null);
        setImpactWarning(null);
        return;
      }

      setOverId(over.id as string);

      // Calculate impact warning
      const dragData = active.data.current as DragData | undefined;
      if (dragData?.type === "booking") {
        const warning = calculateImpact(
          dragData.booking,
          dropData.guideAssignmentId
        );
        setImpactWarning(warning);
      }
    },
    [calculateImpact]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveBooking(null);
      setOverId(null);
      setImpactWarning(null);

      if (!over) return;

      const dragData = active.data.current as DragData | undefined;
      const dropData = over.data.current as DropData | undefined;

      if (dragData?.type === "booking" && dropData?.type === "guide") {
        onAssign(dragData.booking.id, dropData.guideAssignmentId);
      }
    },
    [onAssign]
  );

  const handleDragCancel = useCallback(() => {
    setActiveBooking(null);
    setOverId(null);
    setImpactWarning(null);
  }, []);

  return (
    <AssignmentDndContext.Provider value={{ activeBooking, overId, impactWarning }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        {/* Drag Overlay - renders the ghost preview */}
        <DragOverlay dropAnimation={null}>
          {activeBooking && (
            <div className="w-64 opacity-90 shadow-xl">
              <BookingCardGhost
                booking={activeBooking}
                impactWarning={impactWarning ?? undefined}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </AssignmentDndContext.Provider>
  );
}
