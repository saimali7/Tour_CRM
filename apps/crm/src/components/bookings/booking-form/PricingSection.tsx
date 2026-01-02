"use client";

import type { CalculatedPrice, FormUpdateFn } from "./types";

interface PricingSectionProps {
  calculatedPrice: CalculatedPrice;
  discount: string;
  tax: string;
  updateField: FormUpdateFn;
}

export function PricingSection({
  calculatedPrice,
  discount,
  tax,
  updateField,
}: PricingSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Pricing</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Subtotal
          </label>
          <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
            ${calculatedPrice.subtotal}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Discount ($)
          </label>
          <input
            type="text"
            value={discount}
            onChange={(e) => updateField("discount", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tax ($)
          </label>
          <input
            type="text"
            value={tax}
            onChange={(e) => updateField("tax", e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Total
          </label>
          <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground font-semibold">
            ${calculatedPrice.total}
          </div>
        </div>
      </div>
    </div>
  );
}
