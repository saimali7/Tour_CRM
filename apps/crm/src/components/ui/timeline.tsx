"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const timelineItemVariants = cva("relative pb-8 last:pb-0", {
  variants: {
    variant: {
      default: "",
      success: "",
      warning: "",
      destructive: "",
      info: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const dotVariants = cva(
  "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background",
  {
    variants: {
      variant: {
        default: "border-border text-muted-foreground",
        success: "border-success text-success",
        warning: "border-warning text-warning",
        destructive: "border-destructive text-destructive",
        info: "border-info text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Timeline({ className, children, ...props }: TimelineProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}

interface TimelineItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineItemVariants> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  timestamp?: string | Date;
  children?: React.ReactNode;
}

function TimelineItem({
  className,
  variant,
  icon,
  title,
  description,
  timestamp,
  children,
  ...props
}: TimelineItemProps) {
  const formattedTime =
    timestamp instanceof Date
      ? timestamp.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : timestamp;

  return (
    <div className={cn(timelineItemVariants({ variant }), className)} {...props}>
      {/* Connector line */}
      <div className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-border last:hidden" />

      {/* Dot */}
      <div className={cn(dotVariants({ variant }))}>
        {icon || (
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              variant === "success" && "bg-success",
              variant === "warning" && "bg-warning",
              variant === "destructive" && "bg-destructive",
              variant === "info" && "bg-info",
              (!variant || variant === "default") && "bg-muted-foreground"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="ml-12">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          {formattedTime && (
            <span className="text-xs text-muted-foreground">{formattedTime}</span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

// Convenience component for activity timeline
interface ActivityItem {
  id: string;
  type: "created" | "updated" | "status_change" | "note" | "email" | "payment" | "refund";
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  className?: string;
}

function ActivityTimeline({ activities, className }: ActivityTimelineProps) {
  const getVariant = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return "success";
      case "payment":
        return "success";
      case "refund":
        return "warning";
      case "status_change":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Timeline className={className}>
      {activities.map((activity) => (
        <TimelineItem
          key={activity.id}
          variant={getVariant(activity.type)}
          title={activity.title}
          description={activity.description}
          timestamp={activity.timestamp}
        />
      ))}
    </Timeline>
  );
}

export {
  Timeline,
  TimelineItem,
  ActivityTimeline,
  timelineItemVariants,
  dotVariants,
  type ActivityItem,
};
