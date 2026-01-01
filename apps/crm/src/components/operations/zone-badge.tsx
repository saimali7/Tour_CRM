"use client";

import { cn } from "@/lib/utils";

// Zone colors - carefully curated for operational clarity
// Each zone gets a distinct, legible color that works in both light/dark
const ZONE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  marina: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
  },
  downtown: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500/30",
  },
  palm: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
  },
  jbr: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
  },
  deira: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
  },
  default: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
};

// Get consistent zone color for timeline segments
export function getZoneColor(zone?: string | null): string {
  const key = zone?.toLowerCase() || "default";
  const colors = ZONE_COLORS[key] ?? ZONE_COLORS.default;
  return colors!.bg;
}

// Get zone accent color for route lines
export function getZoneAccent(zone?: string | null): string {
  const key = zone?.toLowerCase() || "default";
  switch (key) {
    case "marina": return "#3b82f6"; // blue-500
    case "downtown": return "#f97316"; // orange-500
    case "palm": return "#8b5cf6"; // violet-500
    case "jbr": return "#10b981"; // emerald-500
    case "deira": return "#f43f5e"; // rose-500
    default: return "#6b7280"; // gray-500
  }
}

interface ZoneBadgeProps {
  zone?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function ZoneBadge({ zone, size = "sm", className }: ZoneBadgeProps) {
  if (!zone) return null;

  const key = zone.toLowerCase();
  const colors = ZONE_COLORS[key] ?? ZONE_COLORS.default;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border",
        colors!.bg,
        colors!.text,
        colors!.border,
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-0.5 text-xs",
        className
      )}
    >
      {zone}
    </span>
  );
}
