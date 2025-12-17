"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, MoreVertical, Archive, Pause, Play, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  };
  orgSlug: string;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const statusColors = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  paused: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
};

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
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${orgSlug}/tours` as Route}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{tour.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tour.status]}`}
            >
              {tour.status}
            </span>
          </div>
          {tour.slug && (
            <p className="text-muted-foreground mt-1">{tour.slug}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
