"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, User, Users, AlertCircle } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking, type CustomerDetails, type BookingParticipant } from "@/lib/booking-context";

interface CustomerDetailsFormProps {
  requireParticipantNames?: boolean;
  organizationSlug: string;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function CustomerDetailsForm({
  requireParticipantNames = false,
  organizationSlug,
}: CustomerDetailsFormProps) {
  const { state, setCustomer, updateParticipant, nextStep, prevStep } = useBooking();

  const [customer, setCustomerLocal] = useState<CustomerDetails>({
    email: state.customer?.email || "",
    firstName: state.customer?.firstName || "",
    lastName: state.customer?.lastName || "",
    phone: state.customer?.phone || "",
    specialRequests: state.customer?.specialRequests || "",
    dietaryRequirements: state.customer?.dietaryRequirements || "",
    accessibilityNeeds: state.customer?.accessibilityNeeds || "",
  });

  const [participantNames, setParticipantNames] = useState<
    Record<string, { firstName: string; lastName: string }>
  >(() => {
    const names: Record<string, { firstName: string; lastName: string }> = {};
    for (const p of state.participants) {
      names[p.id] = { firstName: p.firstName, lastName: p.lastName };
    }
    return names;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState(false);

  // Sync participant names with state
  useEffect(() => {
    for (const [id, names] of Object.entries(participantNames)) {
      if (names.firstName || names.lastName) {
        updateParticipant(id, { firstName: names.firstName, lastName: names.lastName });
      }
    }
  }, [participantNames, updateParticipant]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate customer fields
    if (!customer.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!customer.firstName) {
      newErrors.firstName = "First name is required";
    }

    if (!customer.lastName) {
      newErrors.lastName = "Last name is required";
    }

    // Validate participant names if required
    if (requireParticipantNames) {
      for (const p of state.participants) {
        const names = participantNames[p.id];
        if (!names?.firstName) {
          newErrors[`participant_${p.id}_firstName`] = "First name is required";
        }
        if (!names?.lastName) {
          newErrors[`participant_${p.id}_lastName`] = "Last name is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setCustomer(customer);
    nextStep();
  };

  const handleCustomerChange = (field: keyof CustomerDetails, value: string) => {
    setCustomerLocal((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleParticipantChange = (
    id: string,
    field: "firstName" | "lastName",
    value: string
  ) => {
    setParticipantNames((prev) => ({
      ...prev,
      [id]: {
        firstName: prev[id]?.firstName || "",
        lastName: prev[id]?.lastName || "",
        [field]: value
      },
    }));
    // Clear error
    const errorKey = `participant_${id}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const adults = state.participants.filter((p) => p.type === "adult");
  const children = state.participants.filter((p) => p.type === "child");
  const infants = state.participants.filter((p) => p.type === "infant");

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Back button */}
      <button
        type="button"
        onClick={prevStep}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to ticket selection
      </button>

      {/* Lead Contact Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lead Contact</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the details of the person making the booking. Confirmation emails will be sent
          to this address.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              value={customer.firstName}
              onChange={(e) => handleCustomerChange("firstName", e.target.value)}
              className={`w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.firstName ? "border-red-500" : ""
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              value={customer.lastName}
              onChange={(e) => handleCustomerChange("lastName", e.target.value)}
              className={`w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.lastName ? "border-red-500" : ""
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={customer.email}
              onChange={(e) => handleCustomerChange("email", e.target.value)}
              className={`w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.email ? "border-red-500" : ""
              }`}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={customer.phone}
              onChange={(e) => handleCustomerChange("phone", e.target.value)}
              className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Participant Names Section (if required) */}
      {requireParticipantNames && state.participants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Participant Names</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Please provide names for all participants. These will be used for the tour
            manifest.
          </p>

          {/* Adults */}
          {adults.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Adults</h4>
              {adults.map((participant, index) => (
                <ParticipantNameFields
                  key={participant.id}
                  participant={participant}
                  index={index + 1}
                  names={participantNames[participant.id] || { firstName: "", lastName: "" }}
                  errors={errors}
                  onChange={handleParticipantChange}
                />
              ))}
            </div>
          )}

          {/* Children */}
          {children.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Children</h4>
              {children.map((participant, index) => (
                <ParticipantNameFields
                  key={participant.id}
                  participant={participant}
                  index={index + 1}
                  names={participantNames[participant.id] || { firstName: "", lastName: "" }}
                  errors={errors}
                  onChange={handleParticipantChange}
                />
              ))}
            </div>
          )}

          {/* Infants */}
          {infants.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Infants</h4>
              {infants.map((participant, index) => (
                <ParticipantNameFields
                  key={participant.id}
                  participant={participant}
                  index={index + 1}
                  names={participantNames[participant.id] || { firstName: "", lastName: "" }}
                  errors={errors}
                  onChange={handleParticipantChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional Fields Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="text-sm text-primary hover:underline"
        >
          {showOptional ? "Hide" : "Show"} special requests & accessibility options
        </button>

        {showOptional && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="specialRequests" className="block text-sm font-medium mb-1">
                Special Requests
              </label>
              <textarea
                id="specialRequests"
                value={customer.specialRequests}
                onChange={(e) => handleCustomerChange("specialRequests", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Any special requests for your booking..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dietaryRequirements"
                  className="block text-sm font-medium mb-1"
                >
                  Dietary Requirements
                </label>
                <input
                  type="text"
                  id="dietaryRequirements"
                  value={customer.dietaryRequirements}
                  onChange={(e) =>
                    handleCustomerChange("dietaryRequirements", e.target.value)
                  }
                  className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., Vegetarian, Gluten-free"
                />
              </div>
              <div>
                <label
                  htmlFor="accessibilityNeeds"
                  className="block text-sm font-medium mb-1"
                >
                  Accessibility Needs
                </label>
                <input
                  type="text"
                  id="accessibilityNeeds"
                  value={customer.accessibilityNeeds}
                  onChange={(e) => handleCustomerChange("accessibilityNeeds", e.target.value)}
                  className="w-full px-4 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g., Wheelchair access"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error summary */}
      {Object.keys(errors).length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Please correct the errors above to continue.</span>
        </div>
      )}

      {/* Order Summary */}
      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
        <h4 className="font-medium mb-2">Order Summary</h4>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {state.participants.length} participant
            {state.participants.length !== 1 ? "s" : ""}
          </span>
          <span>{formatPrice(state.subtotal, state.currency)}</span>
        </div>
        {state.discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(state.discount, state.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(state.total, state.currency)}</span>
        </div>
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" size="lg">
        Continue to Review
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By continuing, you agree to our{" "}
        <a href={`/org/${organizationSlug}/terms`} className="text-primary hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href={`/org/${organizationSlug}/privacy`} className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

interface ParticipantNameFieldsProps {
  participant: BookingParticipant;
  index: number;
  names: { firstName: string; lastName: string };
  errors: Record<string, string>;
  onChange: (id: string, field: "firstName" | "lastName", value: string) => void;
}

function ParticipantNameFields({
  participant,
  index,
  names,
  errors,
  onChange,
}: ParticipantNameFieldsProps) {
  const firstNameError = errors[`participant_${participant.id}_firstName`];
  const lastNameError = errors[`participant_${participant.id}_lastName`];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-md border bg-card">
      <div>
        <label className="block text-xs font-medium mb-1 text-muted-foreground">
          {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)} {index} - First
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={names.firstName}
          onChange={(e) => onChange(participant.id, "firstName", e.target.value)}
          className={`w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            firstNameError ? "border-red-500" : ""
          }`}
          placeholder="First name"
        />
        {firstNameError && <p className="text-xs text-red-500 mt-1">{firstNameError}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-muted-foreground">
          Last Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={names.lastName}
          onChange={(e) => onChange(participant.id, "lastName", e.target.value)}
          className={`w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            lastNameError ? "border-red-500" : ""
          }`}
          placeholder="Last name"
        />
        {lastNameError && <p className="text-xs text-red-500 mt-1">{lastNameError}</p>}
      </div>
    </div>
  );
}
