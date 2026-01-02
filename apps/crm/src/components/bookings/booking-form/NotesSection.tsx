"use client";

import type { FormUpdateFn } from "./types";

interface NotesSectionProps {
  specialRequests: string;
  dietaryRequirements: string;
  accessibilityNeeds: string;
  internalNotes: string;
  updateField: FormUpdateFn;
}

export function NotesSection({
  specialRequests,
  dietaryRequirements,
  accessibilityNeeds,
  internalNotes,
  updateField,
}: NotesSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Special Requests</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Special Requests
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => updateField("specialRequests", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Any special requests from the customer..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Dietary Requirements
          </label>
          <textarea
            value={dietaryRequirements}
            onChange={(e) => updateField("dietaryRequirements", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Allergies, vegetarian, halal, etc..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Accessibility Needs
          </label>
          <textarea
            value={accessibilityNeeds}
            onChange={(e) => updateField("accessibilityNeeds", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Wheelchair access, mobility assistance, etc..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Internal Notes
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => updateField("internalNotes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Notes visible only to staff..."
          />
        </div>
      </div>
    </div>
  );
}
