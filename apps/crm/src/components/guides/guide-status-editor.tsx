"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBadge } from "@/components/ui/status-badge";

type GuideStatus = "active" | "inactive" | "on_leave";

interface GuideStatusEditorProps {
  status: GuideStatus;
  onStatusChange: (status: GuideStatus) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const STATUS_OPTIONS: { value: GuideStatus; label: string; variant: "success" | "warning" | "neutral" }[] = [
  { value: "active", label: "Active", variant: "success" },
  { value: "inactive", label: "Inactive", variant: "neutral" },
  { value: "on_leave", label: "On Leave", variant: "warning" },
];

export function GuideStatusEditor({
  status,
  onStatusChange,
  disabled = false,
  className,
}: GuideStatusEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<GuideStatus | null>(null);

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === status);

  const handleSelect = async (newStatus: GuideStatus) => {
    if (newStatus === status || loading) return;

    setLoading(true);
    setPendingStatus(newStatus);

    try {
      await onStatusChange(newStatus);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setLoading(false);
      setPendingStatus(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "inline-flex items-center gap-1 group",
            "rounded-full transition-all duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !disabled && "hover:opacity-80 cursor-pointer",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Change status from ${currentOption?.label}`}
        >
          <StatusBadge
            label={currentOption?.label || status}
            variant={currentOption?.variant || "neutral"}
          />
          {!disabled && (
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                open && "opacity-100"
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-40 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = option.value === status;
            const isPending = option.value === pendingStatus;

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm",
                  "transition-colors",
                  isSelected
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50",
                  loading && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={option.label}
                    variant={option.variant}
                    size="sm"
                  />
                </div>
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : isSelected ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
