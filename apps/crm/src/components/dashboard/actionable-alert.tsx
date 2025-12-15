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
      bg: "bg-destructive/10 border-destructive/20",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      titleColor: "text-destructive",
    },
    warning: {
      bg: "bg-warning/10 border-warning/20",
      icon: AlertCircle,
      iconColor: "text-warning",
      titleColor: "text-warning",
    },
    info: {
      bg: "bg-info/10 border-info/20",
      icon: Info,
      iconColor: "text-info",
      titleColor: "text-info",
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
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={action.isLoading}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    action.variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50",
                    action.variant === "secondary" && "bg-background text-foreground border border-input hover:bg-muted disabled:opacity-50",
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
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
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
