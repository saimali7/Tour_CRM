"use client";

// ============================================================================
// TYPES
// ============================================================================

export interface PriceSummaryProps {
  tourName: string;
  selectedDate: Date;
  selectedTime: string;
  totalGuests: number;
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingPriceSummary({
  tourName,
  selectedDate,
  selectedTime,
  totalGuests,
  total,
}: PriceSummaryProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-foreground">{tourName}</p>
        <p className="text-xs text-muted-foreground">
          {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          {selectedTime && ` at ${selectedTime}`}
          {` \u00B7 ${totalGuests} guest${totalGuests > 1 ? "s" : ""}`}
        </p>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {formatCurrency(total)}
      </p>
    </div>
  );
}
