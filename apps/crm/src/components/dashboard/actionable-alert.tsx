"use client";

import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertSeverity = "critical" | "warning" | "info";

export interface ActionableAlertProps {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId?: string;
  entityType?: "schedule" | "booking" | "guide";
  actions: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "destructive";
    isLoading?: boolean;
  }[];
  onDismiss?: () => void;
}

export function ActionableAlert({
  severity,
  title,
  description,
  actions,
  onDismiss,
}: ActionableAlertProps) {
  const severityStyles = {
    critical: {
      bg: "bg-red-50 border-red-200",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      titleColor: "text-red-800",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      icon: AlertCircle,
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-800",
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      icon: Info,
      iconColor: "text-blue-600",
      titleColor: "text-blue-800",
    },
  };

  const styles = severityStyles[severity];
  const Icon = styles.icon;

  return (
    <div className={cn("rounded-lg border p-4", styles.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", styles.iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-medium", styles.titleColor)}>{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={action.isLoading}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    action.variant === "destructive" && "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
                    action.variant === "secondary" && "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50",
                    (!action.variant || action.variant === "primary") && "bg-primary text-white hover:bg-primary/90 disabled:opacity-50",
                    action.isLoading && "cursor-not-allowed"
                  )}
                >
                  {action.isLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : null}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Container for multiple alerts
export function AlertsPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {children}
    </div>
  );
}
