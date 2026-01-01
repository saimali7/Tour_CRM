"use client";

import { cn } from "@/lib/utils";
import { Calendar, Users, UserCheck, AlertTriangle } from "lucide-react";

interface DayStatsProps {
  tours: number;
  guests: number;
  guides: number;
  needsAttention: number;
  isLoading?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  variant?: "default" | "warning" | "success";
  isLoading?: boolean;
}

function StatCard({ icon, value, label, variant = "default", isLoading }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
        variant === "default" && "bg-card border-border",
        variant === "warning" && "bg-amber-500/5 border-amber-500/20",
        variant === "success" && "bg-emerald-500/5 border-emerald-500/20"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
          variant === "default" && "bg-muted text-muted-foreground",
          variant === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          variant === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        {isLoading ? (
          <div className="h-7 w-12 skeleton rounded" />
        ) : (
          <p
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight",
              variant === "warning" && "text-amber-700 dark:text-amber-400",
              variant === "success" && "text-emerald-700 dark:text-emerald-400",
              variant === "default" && "text-foreground"
            )}
          >
            {value}
          </p>
        )}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

export function DayStats({
  tours,
  guests,
  guides,
  needsAttention,
  isLoading,
  className,
}: DayStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      <StatCard
        icon={<Calendar className="h-5 w-5" />}
        value={tours}
        label="Tours"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        value={guests}
        label="Guests"
        isLoading={isLoading}
      />
      <StatCard
        icon={<UserCheck className="h-5 w-5" />}
        value={guides}
        label="Guides"
        variant="success"
        isLoading={isLoading}
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        value={needsAttention}
        label="Need Attention"
        variant={needsAttention > 0 ? "warning" : "default"}
        isLoading={isLoading}
      />
    </div>
  );
}

// Compact version for mobile
export function DayStatsCompact({
  tours,
  guests,
  guides,
  needsAttention,
  className,
}: Omit<DayStatsProps, "isLoading">) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-2.5 rounded-lg bg-muted/50 overflow-x-auto",
        className
      )}
    >
      <StatPill icon={<Calendar className="h-3.5 w-3.5" />} value={tours} label="tours" />
      <StatPill icon={<Users className="h-3.5 w-3.5" />} value={guests} label="guests" />
      <StatPill icon={<UserCheck className="h-3.5 w-3.5" />} value={guides} label="guides" />
      {needsAttention > 0 && (
        <StatPill
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          value={needsAttention}
          label="attention"
          variant="warning"
        />
      )}
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  variant = "default",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  variant?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm whitespace-nowrap",
        variant === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
