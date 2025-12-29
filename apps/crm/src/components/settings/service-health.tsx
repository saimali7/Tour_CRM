"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Database,
  Shield,
  CreditCard,
  Mail,
  Zap,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Loader2,
  FlaskConical,
  Server,
  MessageSquare,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ServiceStatus = "connected" | "not_configured" | "error";
type ServiceName = "database" | "authentication" | "payments" | "email" | "automations" | "storage" | "cache" | "sms" | "monitoring";
type FunctionalTestService = "database" | "email" | "storage" | "payments" | "automations" | "cache" | "sms";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  message?: string;
  details?: Record<string, unknown>;
}

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
  details?: Record<string, unknown>;
}

const serviceIcons: Record<string, typeof Database> = {
  database: Database,
  authentication: Shield,
  payments: CreditCard,
  email: Mail,
  automations: Zap,
  storage: HardDrive,
  cache: Server,
  sms: MessageSquare,
  monitoring: Bug,
};

const serviceLabels: Record<string, string> = {
  database: "Database",
  authentication: "Authentication",
  payments: "Payments",
  email: "Email",
  automations: "Background Jobs",
  storage: "File Storage",
  cache: "Cache",
  sms: "SMS",
  monitoring: "Error Monitoring",
};

const serviceDescriptions: Record<string, string> = {
  database: "PostgreSQL database connection",
  authentication: "Clerk user authentication",
  payments: "Stripe payment processing",
  email: "Resend transactional emails",
  automations: "Inngest background workflows",
  storage: "S3/MinIO file storage",
  cache: "Redis caching layer",
  sms: "Twilio SMS notifications",
  monitoring: "Sentry error tracking",
};

const functionalTestDescriptions: Record<string, string> = {
  database: "Tests CREATE, INSERT, SELECT, DELETE operations",
  email: "Sends a real test email to verify delivery",
  storage: "Tests upload, download, and delete operations",
  payments: "Creates and cancels a test payment intent",
  automations: "Sends a test event to Inngest",
  cache: "Tests SET, GET, DELETE operations",
  sms: "Sends a test SMS to verify delivery",
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

function ServiceCard({
  service,
  onTest,
  onFunctionalTest,
  testResult,
  functionalTestResult,
  isTesting,
  isFunctionalTesting,
  testEmail,
  onTestEmailChange,
  testPhone,
  onTestPhoneChange,
}: {
  service: ServiceHealth;
  onTest: () => void;
  onFunctionalTest: () => void;
  testResult?: TestResult;
  functionalTestResult?: TestResult;
  isTesting: boolean;
  isFunctionalTesting: boolean;
  testEmail?: string;
  onTestEmailChange?: (email: string) => void;
  testPhone?: string;
  onTestPhoneChange?: (phone: string) => void;
}) {
  const Icon = serviceIcons[service.name] || Database;
  const label = serviceLabels[service.name] || service.name;
  const description = serviceDescriptions[service.name] || "";
  const canTest = service.status !== "not_configured";
  const hasFunctionalTest = service.name !== "authentication" && service.name !== "monitoring";
  const functionalDescription = functionalTestDescriptions[service.name];
  const needsEmail = service.name === "email";
  const needsPhone = service.name === "sms";

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

          {/* Connection Test Result */}
          {testResult && (
            <div className={`mt-2 p-2 rounded text-xs ${
              testResult.success
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <div className="flex items-center gap-1.5">
                {testResult.success ? (
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-medium">{testResult.message}</span>
                {testResult.latency && (
                  <span className="text-muted-foreground ml-auto">{testResult.latency}ms</span>
                )}
              </div>
            </div>
          )}

          {/* Functional Test Result */}
          {functionalTestResult && (
            <div className={`mt-2 p-2 rounded text-xs ${
              functionalTestResult.success
                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <div className="flex items-center gap-1.5">
                {functionalTestResult.success ? (
                  <FlaskConical className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="font-medium">{functionalTestResult.message}</span>
                {functionalTestResult.latency && (
                  <span className="text-muted-foreground ml-auto">{functionalTestResult.latency}ms</span>
                )}
              </div>
              {functionalTestResult.details && (
                <div className="mt-1.5 text-[10px] text-muted-foreground font-mono">
                  {JSON.stringify(functionalTestResult.details)}
                </div>
              )}
            </div>
          )}

          {/* Email input for email test */}
          {needsEmail && hasFunctionalTest && canTest && (
            <div className="mt-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={testEmail || ""}
                onChange={(e) => onTestEmailChange?.(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Phone input for SMS test */}
          {needsPhone && hasFunctionalTest && canTest && (
            <div className="mt-3">
              <Input
                type="tel"
                placeholder="+1 555 123 4567"
                value={testPhone || ""}
                onChange={(e) => onTestPhoneChange?.(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Test Buttons */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={!canTest || isTesting || isFunctionalTesting}
              className="h-7 text-xs"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1.5" />
                  Ping
                </>
              )}
            </Button>

            {hasFunctionalTest && (
              <Button
                variant="default"
                size="sm"
                onClick={onFunctionalTest}
                disabled={!canTest || isTesting || isFunctionalTesting || (needsEmail && !testEmail) || (needsPhone && !testPhone)}
                className="h-7 text-xs"
                title={functionalDescription}
              >
                {isFunctionalTesting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-3 w-3 mr-1.5" />
                    Full Test
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Functional test description */}
          {hasFunctionalTest && functionalDescription && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Full Test: {functionalDescription}
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
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [functionalTestResults, setFunctionalTestResults] = useState<Record<string, TestResult>>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [functionalTestingService, setFunctionalTestingService] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const { data, isLoading, refetch, isRefetching } =
    trpc.organization.getServiceHealth.useQuery(undefined, {
      refetchInterval: isActive ? 60000 : false,
      staleTime: 30000,
    });

  const testMutation = trpc.organization.testService.useMutation({
    onSuccess: (result, variables) => {
      setTestResults(prev => ({
        ...prev,
        [variables.service]: result,
      }));
      setTestingService(null);
    },
    onError: (error, variables) => {
      setTestResults(prev => ({
        ...prev,
        [variables.service]: { success: false, message: error.message },
      }));
      setTestingService(null);
    },
  });

  const functionalTestMutation = trpc.organization.functionalTestService.useMutation({
    onSuccess: (result, variables) => {
      setFunctionalTestResults(prev => ({
        ...prev,
        [variables.service]: result,
      }));
      setFunctionalTestingService(null);
    },
    onError: (error, variables) => {
      setFunctionalTestResults(prev => ({
        ...prev,
        [variables.service]: { success: false, message: error.message },
      }));
      setFunctionalTestingService(null);
    },
  });

  const handleTest = (serviceName: string) => {
    setTestingService(serviceName);
    setTestResults(prev => {
      const newResults = { ...prev };
      delete newResults[serviceName];
      return newResults;
    });
    testMutation.mutate({ service: serviceName as ServiceName });
  };

  const handleFunctionalTest = (serviceName: string) => {
    setFunctionalTestingService(serviceName);
    setFunctionalTestResults(prev => {
      const newResults = { ...prev };
      delete newResults[serviceName];
      return newResults;
    });
    functionalTestMutation.mutate({
      service: serviceName as FunctionalTestService,
      testEmail: serviceName === "email" ? testEmail : undefined,
      testPhone: serviceName === "sms" ? testPhone : undefined,
    });
  };

  const handleTestAll = () => {
    if (!data) return;
    const testableServices = data.services.filter(s => s.status !== "not_configured");
    testableServices.forEach((service, index) => {
      setTimeout(() => {
        handleTest(service.name);
      }, index * 500);
    });
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAll}
            disabled={testingService !== null || functionalTestingService !== null}
            className="h-8"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Ping All
          </Button>
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
          <ServiceCard
            key={service.name}
            service={service}
            onTest={() => handleTest(service.name)}
            onFunctionalTest={() => handleFunctionalTest(service.name)}
            testResult={testResults[service.name]}
            functionalTestResult={functionalTestResults[service.name]}
            isTesting={testingService === service.name}
            isFunctionalTesting={functionalTestingService === service.name}
            testEmail={service.name === "email" ? testEmail : undefined}
            onTestEmailChange={service.name === "email" ? setTestEmail : undefined}
            testPhone={service.name === "sms" ? testPhone : undefined}
            onTestPhoneChange={service.name === "sms" ? setTestPhone : undefined}
          />
        ))}
      </div>

      {/* Help Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Last checked: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Ping:</strong> Quick connection check | <strong>Full Test:</strong> End-to-end functional test
        </p>
      </div>
    </div>
  );
}
