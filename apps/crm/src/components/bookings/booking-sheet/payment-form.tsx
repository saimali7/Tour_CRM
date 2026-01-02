"use client";

// ============================================================================
// TYPES
// ============================================================================

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "check";

export interface PaymentFormProps {
  recordPayment: boolean;
  onRecordPaymentChange: (record: boolean) => void;
  paymentAmount: string;
  onPaymentAmountChange: (amount: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  defaultAmount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentForm({
  recordPayment,
  onRecordPaymentChange,
  paymentAmount,
  onPaymentAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  defaultAmount,
}: PaymentFormProps) {
  const handleRecordPaymentToggle = (checked: boolean) => {
    onRecordPaymentChange(checked);
    if (checked) {
      onPaymentAmountChange(defaultAmount.toFixed(2));
    }
  };

  return (
    <section className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={recordPayment}
          onChange={(e) => handleRecordPaymentToggle(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <span className="text-sm font-medium text-foreground">Record payment now</span>
      </label>

      {recordPayment && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => onPaymentAmountChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Method</label>
            <div className="flex flex-wrap gap-2">
              {(["card", "cash", "bank_transfer", "check"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => onPaymentMethodChange(method)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    paymentMethod === method
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  {method === "bank_transfer" ? "Bank" : method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
