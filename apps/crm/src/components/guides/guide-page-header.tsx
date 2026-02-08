"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GuideStatus = "active" | "inactive" | "on_leave";

const guideStatusVariant: Record<GuideStatus, { label: string; variant: "success" | "warning" | "neutral" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  on_leave: { label: "On Leave", variant: "warning" },
};

interface GuidePageHeaderProps {
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    status: GuideStatus;
    createdAt: Date;
  };
  orgSlug: string;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function GuidePageHeader({
  guide,
  orgSlug,
  onDelete,
  isLoading,
}: GuidePageHeaderProps) {
  const router = useRouter();
  const statusConfig = guideStatusVariant[guide.status];

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

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
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {guide.avatarUrl ? (
            <img
              src={guide.avatarUrl}
              alt={`${guide.firstName} ${guide.lastName}`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <span className="text-primary font-semibold text-lg">
              {guide.firstName?.charAt(0) ?? ""}
              {guide.lastName?.charAt(0) ?? ""}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {guide.firstName} {guide.lastName}
            </h1>
            <StatusBadge label={statusConfig.label} variant={statusConfig.variant} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Guide since {formatDate(guide.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Guide
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
