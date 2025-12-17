"use client";

import { trpc } from "@/lib/trpc";
import {
  Database,
  Shield,
  CreditCard,
  Mail,
  Zap,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

type ServiceStatus = "connected" | "not_configured" | "error";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message?: string;
  details?: Record<string, unknown>;
}

const serviceIcons: Record<string, typeof Database> = {
  database: Database,
  authentication: Shield,
  payments: CreditCard,
  email: Mail,
  automations: Zap,
  cache: Server,
};

const serviceLabels: Record<string, string> = {
  database: "Database",
  authentication: "Authentication",
  payments: "Payments",
  email: "Email",
  automations: "Automations",
  cache: "Cache",
};

const serviceDescriptions: Record<string, string> = {
  database: "PostgreSQL database connection",
  authentication: "User authentication service",
  payments: "Stripe Connect for accepting payments",
  email: "Transactional email delivery",
  automations: "Background jobs and workflows",
  cache: "Redis caching for performance",
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </span>
      );
    case "not_configured":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Not Configured
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
  }
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const Icon = serviceIcons[service.name] || Server;
  const label = serviceLabels[service.name] || service.name;
  const description = serviceDescriptions[service.name] || "";

  return (
    <div
      className={`p-4 rounded-lg border ${
        service.status === "connected"
          ? "border-success/30 bg-success/5"
          : service.status === "error"
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 p-2 rounded-lg ${
            service.status === "connected"
              ? "bg-success/10 text-success"
              : service.status === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-foreground">{label}</h4>
            <StatusBadge status={service.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {service.message && (
            <p
              className={`text-xs mt-1 ${
                service.status === "error" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {service.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ServiceHealthPanelProps {
  orgSlug: string;
  isActive?: boolean;
}

export function ServiceHealthPanel({ orgSlug, isActive = true }: ServiceHealthPanelProps) {
  const { data, isLoading, refetch, isRefetching } =
    trpc.organization.getServiceHealth.useQuery(undefined, {
      refetchInterval: isActive ? 60000 : false, // Only refresh when tab is active
      staleTime: 30000,
    });

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const connectedCount = data.services.filter((s) => s.status === "connected").length;
  const errorCount = data.services.filter((s) => s.status === "error").length;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Status</h2>
          <p className="text-sm text-muted-foreground">
            {connectedCount} of {data.services.length} services connected
            {errorCount > 0 && (
              <span className="text-destructive"> ({errorCount} error{errorCount > 1 ? "s" : ""})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {data.environment === "production" ? "Production" : "Development"}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div
        className={`p-4 rounded-lg ${
          errorCount > 0
            ? "bg-destructive/10 border border-destructive/30"
            : connectedCount === data.services.length
              ? "bg-success/10 border border-success/30"
              : "bg-warning/10 border border-warning/30"
        }`}
      >
        <div className="flex items-center gap-2">
          {errorCount > 0 ? (
            <>
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-destructive">Some services have issues</span>
            </>
          ) : connectedCount === data.services.length ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium text-success">All systems operational</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="font-medium text-warning">Some services not configured</span>
            </>
          )}
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      {/* Help Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Last checked: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Need help setting up services?{" "}
          <a
            href="https://github.com/your-repo/docs/DEPLOYMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            View deployment guide
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
