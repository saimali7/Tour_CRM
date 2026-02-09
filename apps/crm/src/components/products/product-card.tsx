"use client";

import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Archive,
  Trash2,
  Calendar,
  Users,
  Clock,
  MapPin,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedProduct {
  id: string;
  type: "tour";
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  basePrice: string;
  // Tour-specific
  tour?: {
    id: string;
    durationMinutes: number;
    maxParticipants: number;
    scheduleStats?: {
      upcomingCount: number;
      utilizationPercent: number;
      nextScheduleDate?: Date | null;
    };
  };
}

interface ProductCardProps {
  product: UnifiedProduct;
  orgSlug: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string, name: string) => void;
  onPublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  isOptimistic?: boolean;
}

// =============================================================================
// STATUS BADGE
// =============================================================================

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    className: "bg-warning text-warning-foreground",
  },
  active: {
    label: "Active",
    className: "bg-success text-success-foreground",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
  },
} as const;

function ProductStatusBadge({ status }: { status: "draft" | "active" | "archived" }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// PRODUCT CARD COMPONENT
// =============================================================================

export function ProductCard({
  product,
  orgSlug,
  onDuplicate,
  onPublish,
  onArchive,
  onDelete,
  isOptimistic,
}: ProductCardProps) {
  const detailUrl = `/org/${orgSlug}/tours/${product.tour?.id || product.id}` as Route;
  const editUrl = `/org/${orgSlug}/tours/${product.tour?.id || product.id}?tab=details` as Route;

  // Tour stats rendering
  const renderTourStats = () => {
    if (!product.tour) return null;
    const stats = product.tour.scheduleStats;
    const utilizationPercent = stats?.utilizationPercent ?? 0;

    return (
      <div className="flex items-center gap-4 text-sm">
        {/* Duration */}
        <div className="flex items-center gap-1.5 text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{product.tour.durationMinutes} min</span>
        </div>

        {/* Upcoming schedules */}
        <div className="flex items-center gap-1.5 text-foreground">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats?.upcomingCount ?? 0} upcoming</span>
        </div>

        {/* Capacity utilization */}
        {stats && stats.upcomingCount > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    utilizationPercent >= 80 ? "bg-success" :
                    utilizationPercent >= 50 ? "bg-info" :
                    utilizationPercent >= 20 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-bold tabular-nums",
                utilizationPercent >= 80 ? "text-success dark:text-success" :
                utilizationPercent < 30 ? "text-destructive dark:text-destructive" : "text-foreground"
              )}>
                {utilizationPercent}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all",
        product.status === "active" && product.tour?.scheduleStats?.upcomingCount
          ? "ring-1 ring-primary/10"
          : "border-border",
        isOptimistic && "opacity-70 animate-pulse"
      )}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            {/* Tour badge + Status row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-info/10 text-info">
                <MapPin className="h-3 w-3" />
                Tour
              </span>
              <ProductStatusBadge status={product.status} />
            </div>

            {/* Name */}
            <Link
              href={detailUrl}
              className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
            >
              {product.name}
            </Link>

            {/* Price */}
            <p className="text-sm text-muted-foreground mt-0.5">
              ${parseFloat(product.basePrice).toFixed(0)}
              {product.tour && <span className="ml-1">/ person</span>}
            </p>
          </div>
        </div>

        {/* Tour stats */}
        {renderTourStats()}

        {/* Next schedule */}
        {product.tour?.scheduleStats?.nextScheduleDate && (
          <p className="text-xs text-muted-foreground mt-2">
            Next: {new Date(product.tour.scheduleStats.nextScheduleDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/30">
        <Link
          href={detailUrl}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Eye className="h-4 w-4 text-primary" />
          View Details
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={detailUrl}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={editUrl}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Tour
              </Link>
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(product.id, product.name)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {product.status === "draft" && onPublish && (
              <DropdownMenuItem onClick={() => onPublish(product.id)}>
                <Check className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}
            {product.status === "active" && onArchive && (
              <DropdownMenuItem onClick={() => onArchive(product.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(product.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ProductStatusBadge };
