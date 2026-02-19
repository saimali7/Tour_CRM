"use client";

import { useState } from "react";
import { Button } from "@tour/ui";
import { CheckCircle2, Send } from "lucide-react";

interface PrivateInquiryFormProps {
  organizationId: string;
  organizationName: string;
}

interface PrivateInquiryState {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  alternateDate: string;
  groupSize: string;
  pickupCity: string;
  pickupLocation: string;
  airportPickup: string;
  budgetRange: string;
  occasion: string;
  interests: string;
  notes: string;
}

const INITIAL_STATE: PrivateInquiryState = {
  name: "",
  email: "",
  phone: "",
  preferredDate: "",
  alternateDate: "",
  groupSize: "",
  pickupCity: "Dubai",
  pickupLocation: "",
  airportPickup: "No",
  budgetRange: "",
  occasion: "",
  interests: "",
  notes: "",
};

function buildInquiryMessage(values: PrivateInquiryState): string {
  return [
    "Private Tour Inquiry",
    "",
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Phone/WhatsApp: ${values.phone || "Not provided"}`,
    `Preferred Date: ${values.preferredDate || "Flexible"}`,
    `Alternate Date: ${values.alternateDate || "None"}`,
    `Group Size: ${values.groupSize || "Not provided"}`,
    `Pickup City: ${values.pickupCity}`,
    `Pickup Location: ${values.pickupLocation || "Not provided"}`,
    `Airport Pickup Needed: ${values.airportPickup}`,
    `Budget Range: ${values.budgetRange || "Not provided"}`,
    `Occasion: ${values.occasion || "Not provided"}`,
    `Interests: ${values.interests || "Not provided"}`,
    "",
    "Additional Notes:",
    values.notes || "None",
  ].join("\n");
}

export function PrivateInquiryForm({ organizationId, organizationName }: PrivateInquiryFormProps) {
  const [values, setValues] = useState<PrivateInquiryState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (submitError) {
      setSubmitError(null);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: values.name,
          email: values.email,
          phone: values.phone,
          subject: "private-tour-inquiry",
          message: buildInquiryMessage(values),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Failed to send inquiry");
      }

      setIsSubmitted(true);
      setValues(INITIAL_STATE);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to send inquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 text-xl font-semibold text-emerald-900">Inquiry sent</h3>
        <p className="mt-2 text-sm text-emerald-800">
          {organizationName} received your request. You should get a response within 2 business hours.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setIsSubmitted(false)}>
          Send another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            value={values.name}
            onChange={onChange}
            required
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={onChange}
            required
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium">
            Phone / WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="+971 ..."
          />
        </div>
        <div>
          <label htmlFor="groupSize" className="mb-2 block text-sm font-medium">
            Group size <span className="text-red-500">*</span>
          </label>
          <input
            id="groupSize"
            name="groupSize"
            type="number"
            min={1}
            value={values.groupSize}
            onChange={onChange}
            required
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="6"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredDate" className="mb-2 block text-sm font-medium">
            Preferred date
          </label>
          <input
            id="preferredDate"
            name="preferredDate"
            type="date"
            value={values.preferredDate}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label htmlFor="alternateDate" className="mb-2 block text-sm font-medium">
            Alternate date
          </label>
          <input
            id="alternateDate"
            name="alternateDate"
            type="date"
            value={values.alternateDate}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pickupCity" className="mb-2 block text-sm font-medium">
            Pickup city
          </label>
          <select
            id="pickupCity"
            name="pickupCity"
            value={values.pickupCity}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option>Dubai</option>
            <option>Abu Dhabi</option>
            <option>Both / Flexible</option>
            <option>Other UAE city</option>
          </select>
        </div>
        <div>
          <label htmlFor="airportPickup" className="mb-2 block text-sm font-medium">
            Airport pickup
          </label>
          <select
            id="airportPickup"
            name="airportPickup"
            value={values.airportPickup}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option>No</option>
            <option>Yes</option>
            <option>Possibly</option>
          </select>
        </div>
        <div>
          <label htmlFor="budgetRange" className="mb-2 block text-sm font-medium">
            Budget range
          </label>
          <select
            id="budgetRange"
            name="budgetRange"
            value={values.budgetRange}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select range</option>
            <option value="aed-500-1500">AED 500 - 1,500</option>
            <option value="aed-1500-3000">AED 1,500 - 3,000</option>
            <option value="aed-3000-6000">AED 3,000 - 6,000</option>
            <option value="aed-6000-plus">AED 6,000+</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="pickupLocation" className="mb-2 block text-sm font-medium">
          Pickup location details
        </label>
        <input
          id="pickupLocation"
          name="pickupLocation"
          value={values.pickupLocation}
          onChange={onChange}
          className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Hotel name or meeting point area"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="occasion" className="mb-2 block text-sm font-medium">
            Occasion
          </label>
          <input
            id="occasion"
            name="occasion"
            value={values.occasion}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Birthday, honeymoon, corporate..."
          />
        </div>
        <div>
          <label htmlFor="interests" className="mb-2 block text-sm font-medium">
            Interests
          </label>
          <input
            id="interests"
            name="interests"
            value={values.interests}
            onChange={onChange}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Desert, yacht, family, luxury..."
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-2 block text-sm font-medium">
          Additional notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={values.notes}
          onChange={onChange}
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Share anything important for planning your private experience."
        />
      </div>

      {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          We usually respond within 2 business hours.
        </p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Sending
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Send className="h-4 w-4" />
              Request private itinerary
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
