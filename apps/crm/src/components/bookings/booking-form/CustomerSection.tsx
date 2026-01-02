"use client";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import type { ExistingBooking, FormUpdateFn } from "./types";

interface CustomerSectionProps {
  customerId: string;
  updateField: FormUpdateFn;
  isEditing: boolean;
  booking?: ExistingBooking;
  customerOptions: ComboboxOption[];
  customersLoading: boolean;
  onCreateNew: () => void;
}

export function CustomerSection({
  customerId,
  updateField,
  isEditing,
  booking,
  customerOptions,
  customersLoading,
  onCreateNew,
}: CustomerSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Customer *
      </label>
      {isEditing ? (
        <div className="px-3 py-2 border border-border rounded-lg bg-muted text-foreground">
          {booking?.customer?.firstName} {booking?.customer?.lastName}
        </div>
      ) : (
        <Combobox
          options={customerOptions}
          value={customerId}
          onValueChange={(value) => updateField("customerId", value)}
          placeholder="Search customers..."
          searchPlaceholder="Search by name or email..."
          emptyText="No customers found"
          createLabel="Create New Customer"
          onCreateNew={onCreateNew}
          isLoading={customersLoading}
        />
      )}
    </div>
  );
}
