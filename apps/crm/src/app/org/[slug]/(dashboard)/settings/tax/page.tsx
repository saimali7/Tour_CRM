"use client";

import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  DollarSign,
  Info,
  Receipt,
  CreditCard,
  RefreshCcw,
  AlertTriangle,
  Calculator,
  Clock,
  Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type TaxName = "VAT" | "Sales Tax" | "GST" | "HST" | "Tourism Tax" | "City Tax" | "Other";
type DepositType = "percentage" | "fixed";

interface TaxSettings {
  enabled: boolean;
  name: string;
  rate: number;
  taxId?: string;
  includeInPrice: boolean;
  applyToFees: boolean;
}

interface PaymentSettings {
  paymentLinkExpirationHours: number;
  autoSendPaymentReminders: boolean;
  paymentReminderHours: number;
  depositEnabled: boolean;
  depositType: DepositType;
  depositAmount: number;
  depositDueDays: number;
  acceptedPaymentMethods: Array<"card" | "cash" | "bank_transfer" | "check" | "other">;
  allowOnlinePayments: boolean;
  allowPartialPayments: boolean;
  autoRefundOnCancellation: boolean;
  refundDeadlineHours: number;
}

export default function TaxPoliciesPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Tax settings state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxName, setTaxName] = useState<TaxName>("VAT");
  const [taxRate, setTaxRate] = useState(0);
  const [taxId, setTaxId] = useState("");
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);
  const [applyTaxToFees, setApplyTaxToFees] = useState(false);

  // Deposit settings state
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState<DepositType>("percentage");
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositDueDays, setDepositDueDays] = useState(7);

  // Payment link settings state
  const [paymentLinkExpirationHours, setPaymentLinkExpirationHours] = useState(24);
  const [paymentReminderHours, setPaymentReminderHours] = useState(6);
  const [autoSendPaymentReminders, setAutoSendPaymentReminders] = useState(true);

  // Refund settings state
  const [refundDeadlineHours, setRefundDeadlineHours] = useState(24);
  const [autoRefundOnCancellation, setAutoRefundOnCancellation] = useState(false);

  // Tax preview calculator
  const [previewPrice, setPreviewPrice] = useState(100);

  const { data: settings, isLoading } = trpc.organization.getSettings.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => {
      utils.organization.getSettings.invalidate();
      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Load settings on mount
  useEffect(() => {
    if (settings) {
      // Tax settings
      setTaxEnabled(settings.tax?.enabled ?? false);
      setTaxName((settings.tax?.name as TaxName) ?? "VAT");
      setTaxRate(settings.tax?.rate ?? 0);
      setTaxId(settings.tax?.taxId ?? "");
      setPricesIncludeTax(settings.tax?.includeInPrice ?? false);
      setApplyTaxToFees(settings.tax?.applyToFees ?? false);

      // Payment settings
      setDepositEnabled(settings.payment?.depositEnabled ?? false);
      setDepositType(settings.payment?.depositType ?? "percentage");
      setDepositAmount(settings.payment?.depositAmount ?? 0);
      setDepositDueDays(settings.payment?.depositDueDays ?? 7);
      setPaymentLinkExpirationHours(settings.payment?.paymentLinkExpirationHours ?? 24);
      setPaymentReminderHours(settings.payment?.paymentReminderHours ?? 6);
      setAutoSendPaymentReminders(settings.payment?.autoSendPaymentReminders ?? true);
      setRefundDeadlineHours(settings.payment?.refundDeadlineHours ?? 24);
      setAutoRefundOnCancellation(settings.payment?.autoRefundOnCancellation ?? false);
    }
  }, [settings]);

  const handleSave = () => {
    const taxSettings: TaxSettings = {
      enabled: taxEnabled,
      name: taxName,
      rate: taxRate,
      taxId: taxId || undefined,
      includeInPrice: pricesIncludeTax,
      applyToFees: applyTaxToFees,
    };

    const paymentSettings: Partial<PaymentSettings> = {
      depositEnabled,
      depositType,
      depositAmount,
      depositDueDays,
      paymentLinkExpirationHours,
      paymentReminderHours,
      autoSendPaymentReminders,
      refundDeadlineHours,
      autoRefundOnCancellation,
    };

    updateSettingsMutation.mutate({
      tax: taxSettings,
      payment: {
        ...settings?.payment,
        ...paymentSettings,
      } as PaymentSettings,
    });
  };

  // Calculate tax preview
  const calculateTaxPreview = () => {
    if (!taxEnabled || taxRate === 0) {
      return {
        subtotal: previewPrice,
        tax: 0,
        total: previewPrice,
      };
    }

    if (pricesIncludeTax) {
      const taxAmount = previewPrice - previewPrice / (1 + taxRate / 100);
      return {
        subtotal: previewPrice - taxAmount,
        tax: taxAmount,
        total: previewPrice,
      };
    } else {
      const taxAmount = previewPrice * (taxRate / 100);
      return {
        subtotal: previewPrice,
        tax: taxAmount,
        total: previewPrice + taxAmount,
      };
    }
  };

  // Calculate deposit preview
  const calculateDepositPreview = () => {
    if (!depositEnabled) {
      return {
        total: 250,
        deposit: 0,
        balance: 250,
      };
    }

    const total = 250;
    let deposit = 0;

    if (depositType === "percentage") {
      deposit = total * (depositAmount / 100);
    } else {
      deposit = depositAmount;
    }

    return {
      total,
      deposit: Math.min(deposit, total),
      balance: Math.max(total - deposit, 0),
    };
  };

  const taxPreview = calculateTaxPreview();
  const depositPreview = calculateDepositPreview();

  const isSubmitting = updateSettingsMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tax & Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure tax, deposits, and refund policies
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
            onClick={handleSave}
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

      {/* Tax Configuration */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Receipt className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Tax Configuration</h3>
                <p className="text-xs text-muted-foreground">Configure how tax is calculated</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {taxEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">
                  ENABLED
                </span>
              )}
              <Switch
                checked={taxEnabled}
                onCheckedChange={(checked) => {
                  setTaxEnabled(checked);
                  setHasChanges(true);
                }}
              />
            </div>
          </div>
        </div>

        {taxEnabled && (
          <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tax Name</label>
                <select
                  value={taxName}
                  onChange={(e) => {
                    setTaxName(e.target.value as TaxName);
                    setHasChanges(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="VAT">VAT</option>
                  <option value="Sales Tax">Sales Tax</option>
                  <option value="GST">GST</option>
                  <option value="HST">HST</option>
                  <option value="Tourism Tax">Tourism Tax</option>
                  <option value="City Tax">City Tax</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tax Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => {
                      setTaxRate(parseFloat(e.target.value) || 0);
                      setHasChanges(true);
                    }}
                    className="w-full h-10 px-3 pr-8 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tax ID (Optional)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => {
                  setTaxId(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="e.g., GB123456789"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Displayed on invoices and receipts</p>
            </div>

            {/* Tax Options */}
            <div className="space-y-3">
              <div
                onClick={() => {
                  setPricesIncludeTax(!pricesIncludeTax);
                  setHasChanges(true);
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  pricesIncludeTax
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  pricesIncludeTax
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {pricesIncludeTax && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Prices include tax</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    When enabled, listed prices already include tax (tax-inclusive)
                  </p>
                </div>
              </div>

              <div
                onClick={() => {
                  setApplyTaxToFees(!applyTaxToFees);
                  setHasChanges(true);
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                  applyTaxToFees
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors",
                  applyTaxToFees
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {applyTaxToFees && (
                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Apply tax to booking fees</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Also apply tax to any booking or service fees
                  </p>
                </div>
              </div>
            </div>

            {/* Tax Preview Calculator */}
            <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Tax Preview Calculator
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Base Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={previewPrice}
                      onChange={(e) => setPreviewPrice(parseFloat(e.target.value) || 0)}
                      className="w-full h-9 pl-7 pr-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono text-foreground">${taxPreview.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{taxName} ({taxRate}%)</span>
                    <span className="font-mono text-foreground">${taxPreview.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/60">
                    <span className="text-foreground">Total</span>
                    <span className="font-mono text-primary">${taxPreview.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deposit Settings */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Deposit Settings</h3>
                <p className="text-xs text-muted-foreground">Require deposits to secure bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {depositEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">
                  ENABLED
                </span>
              )}
              <Switch
                checked={depositEnabled}
                onCheckedChange={(checked) => {
                  setDepositEnabled(checked);
                  setHasChanges(true);
                }}
              />
            </div>
          </div>
        </div>

        {depositEnabled && (
          <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Deposit Type</label>
                <select
                  value={depositType}
                  onChange={(e) => {
                    setDepositType(e.target.value as DepositType);
                    setHasChanges(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {depositType === "percentage" ? "Deposit Percentage" : "Deposit Amount"}
                </label>
                <div className="relative">
                  {depositType === "fixed" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  )}
                  <input
                    type="number"
                    min="0"
                    step={depositType === "percentage" ? "1" : "0.01"}
                    max={depositType === "percentage" ? "100" : undefined}
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(parseFloat(e.target.value) || 0);
                      setHasChanges(true);
                    }}
                    className={cn(
                      "w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      depositType === "fixed" ? "pl-7 pr-3" : "pr-8"
                    )}
                  />
                  {depositType === "percentage" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Balance Due Days</label>
              <input
                type="number"
                min="0"
                max="365"
                value={depositDueDays}
                onChange={(e) => {
                  setDepositDueDays(parseInt(e.target.value) || 0);
                  setHasChanges(true);
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">Days before tour when full payment is required</p>
            </div>

            {/* Deposit Preview */}
            <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Deposit Preview
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking Total</span>
                  <span className="font-mono text-foreground">${depositPreview.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-foreground flex items-center gap-1.5">
                    Deposit Required
                    {depositType === "percentage" && (
                      <span className="text-xs text-muted-foreground">({depositAmount}%)</span>
                    )}
                  </span>
                  <span className="font-mono text-primary">${depositPreview.deposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">
                    Balance Due
                    <span className="text-xs ml-1">({depositDueDays} days before)</span>
                  </span>
                  <span className="font-mono text-foreground">${depositPreview.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Info Box */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Info className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">About Tax & Policies</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Tax settings apply to all new bookings and will be displayed on invoices</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Deposit settings determine how much customers pay upfront to secure a booking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Payment link settings control the expiration and reminder behavior for online payments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1.5">•</span>
                <span>Refund policies determine when customers can receive refunds for cancellations</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
