"use client";

import type { BookingFormData, FormUpdateFn } from "./types";

interface ParticipantSectionProps {
  adultCount: number;
  childCount: number;
  infantCount: number;
  updateField: FormUpdateFn;
}

export function ParticipantSection({
  adultCount,
  childCount,
  infantCount,
  updateField,
}: ParticipantSectionProps) {
  const totalParticipants = adultCount + childCount + infantCount;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Guests</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Adults *
          </label>
          <input
            type="number"
            required
            min="1"
            value={adultCount}
            onChange={(e) =>
              updateField("adultCount", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Children
          </label>
          <input
            type="number"
            min="0"
            value={childCount}
            onChange={(e) =>
              updateField("childCount", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Infants
          </label>
          <input
            type="number"
            min="0"
            value={infantCount}
            onChange={(e) =>
              updateField("infantCount", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Total participants: {totalParticipants}
      </div>
    </div>
  );
}
