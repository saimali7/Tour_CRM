"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Archive, Pause, Play, Trash2, Copy, Package, Edit } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { TourStatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TourPageHeaderProps {
  tour: {
    id: string;
    name: string;
    slug: string | null;
    status: "draft" | "active" | "paused" | "archived";
    productId?: string | null;
  };
  orgSlug: string;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function TourPageHeader({
  tour,
  orgSlug,
  onPublish,
  onUnpublish,
  onArchive,
  onDuplicate,
  onDelete,
  isLoading,
}: TourPageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <IconButton
          aria-label="Go back"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </IconButton>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {tour.name}
            </h1>
            <TourStatusBadge status={tour.status} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            {tour.slug && (
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {tour.slug}
              </p>
            )}
            {tour.productId && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                Linked to Product
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/org/${orgSlug}/tours/${tour.id}/edit` as Route}>
          <Button variant="outline" disabled={isLoading}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>

        {/* Status Actions */}
        {tour.status === "draft" && onPublish && (
          <Button onClick={onPublish} disabled={isLoading}>
            <Play className="h-4 w-4 mr-2" />
            Publish
          </Button>
        )}
        {tour.status === "active" && onUnpublish && (
          <Button variant="outline" onClick={onUnpublish} disabled={isLoading}>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        )}
        {tour.status === "paused" && onPublish && (
          <Button onClick={onPublish} disabled={isLoading}>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Tour
              </DropdownMenuItem>
            )}
            {onArchive && tour.status !== "archived" && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Tour
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tour
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
