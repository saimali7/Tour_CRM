"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Banknote,
  Building2,
  Wallet,
  CircleDollarSign,
  Clock,
  Zap,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "card" as const, label: "Card", icon: CreditCard },
  { value: "cash" as const, label: "Cash", icon: Banknote },
  { value: "bank_transfer" as const, label: "Bank Transfer", icon: Building2 },
  { value: "check" as const, label: "Check", icon: Wallet },
  { value: "other" as const, label: "Other", icon: CircleDollarSign },
];

export default function PaymentsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: stripeStatus, isLoading: stripeLoading } =
    trpc.organization.getStripeStatus.useQuery();
  const { data: settings, isLoading: settingsLoading } =
    trpc.organization.getSettings.useQuery();

  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      utils.organization.getSettings.invalidate();
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save payment settings");
    },
  });

  const [paymentForm, setPaymentForm] = useState({
    acceptedPaymentMethods: [] as Array<"card" | "cash" | "bank_transfer" | "check" | "other">,
    allowOnlinePayments: true,
    allowPartialPayments: false,
  });

  // Payment link settings
  const [paymentLinkExpirationHours, setPaymentLinkExpirationHours] = useState(24);
  const [paymentReminderHours, setPaymentReminderHours] = useState(6);
  const [autoSendPaymentReminders, setAutoSendPaymentReminders] = useState(true);

  // Refund settings
  const [refundDeadlineHours, setRefundDeadlineHours] = useState(24);
  const [autoRefundOnCancellation, setAutoRefundOnCancellation] = useState(false);

  // Initialize form when settings load
  useEffect(() => {
    if (settings?.payment) {
      setPaymentForm({
        acceptedPaymentMethods: settings.payment.acceptedPaymentMethods ?? ["card", "cash", "bank_transfer"],
        allowOnlinePayments: settings.payment.allowOnlinePayments ?? true,
        allowPartialPayments: settings.payment.allowPartialPayments ?? false,
      });
      setPaymentLinkExpirationHours(settings.payment.paymentLinkExpirationHours ?? 24);
      setPaymentReminderHours(settings.payment.paymentReminderHours ?? 6);
      setAutoSendPaymentReminders(settings.payment.autoSendPaymentReminders ?? true);
      setRefundDeadlineHours(settings.payment.refundDeadlineHours ?? 24);
      setAutoRefundOnCancellation(settings.payment.autoRefundOnCancellation ?? false);
    }
  }, [settings]);

  const handleSavePaymentSettings = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateSettingsMutation.mutate({
      payment: {
        ...settings?.payment,
        acceptedPaymentMethods: paymentForm.acceptedPaymentMethods,
        allowOnlinePayments: paymentForm.allowOnlinePayments,
        allowPartialPayments: paymentForm.allowPartialPayments,
        paymentLinkExpirationHours,
        autoSendPaymentReminders,
        paymentReminderHours,
        refundDeadlineHours,
        autoRefundOnCancellation,
        depositEnabled: settings?.payment?.depositEnabled ?? false,
        depositType: settings?.payment?.depositType ?? "percentage",
        depositAmount: settings?.payment?.depositAmount ?? 25,
        depositDueDays: settings?.payment?.depositDueDays ?? 7,
      },
    });
  };

  const togglePaymentMethod = (method: typeof paymentForm.acceptedPaymentMethods[number]) => {
    const newMethods = paymentForm.acceptedPaymentMethods.includes(method)
      ? paymentForm.acceptedPaymentMethods.filter((m) => m !== method)
      : [...paymentForm.acceptedPaymentMethods, method];
    setPaymentForm((prev) => ({
      ...prev,
      acceptedPaymentMethods: newMethods,
    }));
    setHasChanges(true);
  };

  if (stripeLoading || settingsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const isSubmitting = updateSettingsMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure payment processing, methods, and policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Success Toast */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300",
              saveSuccess
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 translate-x-0 opacity-100"
                : "translate-x-4 opacity-0 pointer-events-none"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Changes saved</span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePaymentSettings}
            disabled={isSubmitting || !hasChanges}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
              hasChanges
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stripe Connection */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Stripe Connection</h3>
                <p className="text-xs text-muted-foreground">Accept payments via Stripe</p>
              </div>
            </div>
            {stripeStatus?.configured && (
              <span className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                stripeStatus.testMode
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  stripeStatus.testMode ? "bg-amber-500" : "bg-emerald-500"
                )} />
                {stripeStatus.testMode ? "Test Mode" : "Live"}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {stripeStatus?.configured ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Stripe is configured and ready</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {stripeStatus.message}
                    </p>
                  </div>
                </div>
              </div>

              {stripeStatus.testMode && (
                <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                    <h4 className="text-sm font-medium text-foreground">Test Card Numbers</h4>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Successful payment</span>
                      <code className="bg-background px-2 py-1 rounded text-xs font-mono">4242 4242 4242 4242</code>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Declined</span>
                      <code className="bg-background px-2 py-1 rounded text-xs font-mono">4000 0000 0000 0002</code>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">3D Secure</span>
                      <code className="bg-background px-2 py-1 rounded text-xs font-mono">4000 0000 0000 3220</code>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
                      Use any future expiry date and any 3-digit CVC
                    </p>
                  </div>
                </div>
              )}

              <a
                href={stripeStatus.testMode ? "https://dashboard.stripe.com/test/payments" : "https://dashboard.stripe.com/payments"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open Stripe Dashboard
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Stripe not configured</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Add your Stripe API keys to enable payments
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                  <h4 className="text-sm font-medium text-foreground">Setup Instructions</h4>
                </div>
                <div className="p-4 space-y-3">
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Go to <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.stripe.com/test/apikeys</a></li>
                    <li>Copy your Secret key (starts with <code className="bg-background px-1 py-0.5 rounded text-xs">sk_test_</code>)</li>
                    <li>Add to your <code className="bg-background px-1 py-0.5 rounded text-xs">.env.local</code> file:</li>
                  </ol>
                  <pre className="mt-2 p-3 bg-background rounded-lg text-xs overflow-x-auto font-mono">
                    STRIPE_SECRET_KEY=&quot;sk_test_...&quot;
                  </pre>
                  <p className="text-xs text-muted-foreground">
                    Then restart your dev server with <code className="bg-background px-1 py-0.5 rounded">pnpm dev</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Payment Methods & Options */}
      <div className="space-y-6">
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Wallet className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Payment Methods</h3>
                <p className="text-xs text-muted-foreground">Select which methods you accept</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentForm.acceptedPaymentMethods.includes(method.value);
                return (
                  <div
                    key={method.value}
                    onClick={() => togglePaymentMethod(method.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {method.label}
                    </span>
                    <div className={cn(
                      "h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border/60 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Online Payment Options</h4>

              <div
                onClick={() => {
                  setPaymentForm((prev) => ({
                    ...prev,
                    allowOnlinePayments: !prev.allowOnlinePayments,
                  }));
                  setHasChanges(true);
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentForm.allowOnlinePayments
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  paymentForm.allowOnlinePayments
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {paymentForm.allowOnlinePayments && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Allow online payments</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accept card payments through Stripe Checkout
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setPaymentForm((prev) => ({
                    ...prev,
                    allowPartialPayments: !prev.allowPartialPayments,
                  }));
                  setHasChanges(true);
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  paymentForm.allowPartialPayments
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  paymentForm.allowPartialPayments
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {paymentForm.allowPartialPayments && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Allow partial payments</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Let customers pay in installments (requires manual tracking)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Links */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <CreditCard className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Payment Links</h3>
                <p className="text-xs text-muted-foreground">Configure payment link expiration and reminders</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Link Expiration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={paymentLinkExpirationHours}
                    onChange={(e) => {
                      setPaymentLinkExpirationHours(parseInt(e.target.value) || 24);
                      setHasChanges(true);
                    }}
                    className="w-full h-10 px-3 pr-14 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hours</span>
                </div>
                <p className="text-xs text-muted-foreground">1-168 hours (max 7 days)</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  Reminder Before Expiry
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={paymentReminderHours}
                    onChange={(e) => {
                      setPaymentReminderHours(parseInt(e.target.value) || 6);
                      setHasChanges(true);
                    }}
                    className="w-full h-10 px-3 pr-14 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hours</span>
                </div>
                <p className="text-xs text-muted-foreground">1-24 hours</p>
              </div>
            </div>

            <div
              onClick={() => {
                setAutoSendPaymentReminders(!autoSendPaymentReminders);
                setHasChanges(true);
              }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                autoSendPaymentReminders
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                autoSendPaymentReminders
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}>
                {autoSendPaymentReminders && (
                  <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">Auto-send payment reminders</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically send reminder emails before payment links expire
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Settings */}
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <RefreshCcw className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Refund Settings</h3>
                <p className="text-xs text-muted-foreground">Configure refund policies and automation</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Refund Deadline</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="720"
                  value={refundDeadlineHours}
                  onChange={(e) => {
                    setRefundDeadlineHours(parseInt(e.target.value) || 0);
                    setHasChanges(true);
                  }}
                  className="w-full h-10 px-3 pr-20 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hours before</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hours before tour when refunds are no longer available (0-720 hours / 30 days)
              </p>
            </div>

            <div
              onClick={() => {
                setAutoRefundOnCancellation(!autoRefundOnCancellation);
                setHasChanges(true);
              }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                autoRefundOnCancellation
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
              )}
            >
              <div className={cn(
                "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                autoRefundOnCancellation
                  ? "border-amber-500 bg-amber-500"
                  : "border-amber-400/50"
              )}>
                {autoRefundOnCancellation && (
                  <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-foreground">Auto-refund on cancellation</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically process refunds when bookings are cancelled (requires payment gateway integration and may have processing fees)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
