"use client";

import { useDroppable } from "@dnd-kit/core";
import { GuideRow, type GuideData } from "./guide-row";
import type { DropData } from "./dnd-context";
import { useAssignmentDnd } from "./dnd-context";

interface DroppableGuideRowProps {
  guide: GuideData;
  hourWidth: number;
  startHour: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function DroppableGuideRow({
  guide,
  hourWidth,
  startHour,
  isSelected,
  onSelect,
}: DroppableGuideRowProps) {
  const { overId } = useAssignmentDnd();

  const { setNodeRef, isOver } = useDroppable({
    id: `guide-${guide.id}`,
    data: {
      type: "guide",
      guideAssignmentId: guide.id,
      guideName: guide.name,
      currentLoad: guide.currentLoad,
      vehicleCapacity: guide.vehicleCapacity,
      zone: guide.preferredZones?.[0] ?? null,
    } satisfies DropData,
  });

  // Determine if this is the active drop target
  const isDropTarget = isOver || overId === `guide-${guide.id}`;

  return (
    <div ref={setNodeRef}>
      <GuideRow
        guide={guide}
        hourWidth={hourWidth}
        startHour={startHour}
        isDropTarget={isDropTarget}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
}
