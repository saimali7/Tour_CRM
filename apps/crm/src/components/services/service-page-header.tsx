"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ServicePageHeaderProps {
  service: {
    id: string;
    name: string;
    slug: string | null;
    status: "draft" | "active" | "archived";
    serviceType: "transfer" | "addon" | "rental" | "package" | "custom";
  };
  orgSlug: string;
  onArchive?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const statusColors = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-muted text-muted-foreground",
};

const serviceTypeLabels = {
  transfer: "Transfer",
  addon: "Add-on",
  rental: "Rental",
  package: "Package",
  custom: "Custom",
};

const serviceTypeColors = {
  transfer: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  addon: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  rental: "bg-green-500/10 text-green-700 dark:text-green-400",
  package: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  custom: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export function ServicePageHeader({
  service,
  orgSlug,
  onArchive,
  onDelete,
  isLoading,
}: ServicePageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{service.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[service.status]}`}
            >
              {service.status}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceTypeColors[service.serviceType]}`}
            >
              {serviceTypeLabels[service.serviceType]}
            </span>
          </div>
          {service.slug && (
            <p className="text-muted-foreground mt-1">{service.slug}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onArchive && service.status !== "archived" && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Service
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
                  Delete Service
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
