"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BookingCard, type BookingCardData } from "./booking-card";
import type { DragData } from "./dnd-context";

interface DraggableBookingCardProps {
  booking: BookingCardData;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function DraggableBookingCard({
  booking,
  isSelected,
  onSelect,
}: DraggableBookingCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: {
      type: "booking",
      booking,
    } satisfies DragData,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <BookingCard
        booking={booking}
        isDragging={isDragging}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
}
