"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Check } from "lucide-react";
import { Button } from "@tour/ui";
import { useBooking, BookingProvider, type AvailableAddOn } from "@/lib/booking-context";
import { BookingOptionSelection } from "./booking-option-selection";
import { TicketSelection } from "./ticket-selection";
import { AddonSelection } from "./addon-selection";
import { CustomerDetailsForm } from "./customer-details-form";
import { ReviewStep } from "./review-step";
import { PaymentStep } from "./payment-step";
import { WaiverStep } from "./waiver-step";
import { BookingConfirmation } from "./booking-confirmation";
import { CardSurface } from "@/components/layout/card-surface";
import type {
  BookingOption,
  OrganizationSettings,
  Tour,
  TourPricingTier,
} from "@tour/database";

type BookingFlowStep =
  | "options"
  | "select"
  | "addons"
  | "details"
  | "review"
  | "payment"
  | "waiver"
  | "confirmation";

type BookingParticipantType = "adult" | "child" | "infant";

export interface BookingFlowInitialCart {
  cartId: string;
  step: BookingFlowStep;
  bookingOptionId?: string | null;
  participantCounts: {
    adult: number;
    child: number;
    infant: number;
  };
  selectedAddOns: Array<{
    addOnProductId: string;
    quantity: number;
  }>;
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    specialRequests?: string;
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
  };
  discount?: {
    code: string;
    amount: number;
  } | null;
}

interface BookingFlowProps {
  tour: Tour;
  bookingDate: Date;
  bookingTime: string;
  availableSpots: number;
  pricingTiers: TourPricingTier[];
  bookingOptions: BookingOption[];
  currency: string;
  taxConfig?: OrganizationSettings["tax"];
  organizationName: string;
  organizationSlug: string;
  initialCart?: BookingFlowInitialCart | null;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours!, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours! * 60 + minutes! + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

function inferParticipantTypeFromTier(tier: TourPricingTier): BookingParticipantType {
  const normalized = `${tier.name} ${tier.label}`.toLowerCase();
  if (normalized.includes("child")) {
    return "child";
  }
  if (normalized.includes("infant")) {
    return "infant";
  }
  return "adult";
}

function BookingFlowContent({
  tour,
  bookingDate,
  bookingTime,
  availableSpots,
  pricingTiers,
  bookingOptions,
  currency,
  taxConfig,
  organizationName,
  organizationSlug,
  initialCart,
}: BookingFlowProps) {
  const {
    state,
    dispatch,
    addParticipant,
    setTourAndAvailability,
    setAvailableAddOns,
    setAbandonedCartId,
    setBookingOption,
    setCustomer,
    setAddOnQuantity,
  } = useBooking();
  const hydratedCartRef = useRef<string | null>(null);
  const hydratedAddOnsRef = useRef<string | null>(null);
  const [isSavingTripCart, setIsSavingTripCart] = useState(false);
  const [tripCartError, setTripCartError] = useState<string | null>(null);
  const [tripCartRecoveryPath, setTripCartRecoveryPath] = useState<string | null>(null);

  useEffect(() => {
    setTourAndAvailability(
      tour,
      bookingDate,
      bookingTime,
      availableSpots,
      pricingTiers,
      bookingOptions,
      currency,
      {
        enabled: Boolean(taxConfig?.enabled),
        rate: taxConfig?.rate ?? 0,
        includeInPrice: Boolean(taxConfig?.includeInPrice),
      }
    );
  }, [
    tour,
    bookingDate,
    bookingTime,
    availableSpots,
    pricingTiers,
    bookingOptions,
    currency,
    taxConfig?.enabled,
    taxConfig?.rate,
    taxConfig?.includeInPrice,
    setTourAndAvailability,
  ]);

  useEffect(() => {
    hydratedCartRef.current = null;
    hydratedAddOnsRef.current = null;
    setTripCartRecoveryPath(null);
    setTripCartError(null);
  }, [tour.id, initialCart?.cartId]);

  useEffect(() => {
    if (!initialCart || hydratedCartRef.current === initialCart.cartId) {
      return;
    }

    if (state.tour?.id !== tour.id || state.participants.length > 0) {
      return;
    }

    const activeTiers = pricingTiers.filter((tier) => tier.isActive);
    const tierByType: Partial<Record<BookingParticipantType, TourPricingTier>> = {};

    for (const tier of activeTiers) {
      const type = inferParticipantTypeFromTier(tier);
      if (!tierByType[type]) {
        tierByType[type] = tier;
      }
    }

    const fallbackPrice: Record<BookingParticipantType, number> = {
      adult: parseFloat(tour.basePrice),
      child: parseFloat(tour.basePrice) * 0.7,
      infant: 0,
    };

    const participantTypes: BookingParticipantType[] = ["adult", "child", "infant"];
    for (const type of participantTypes) {
      const count = Math.max(0, Math.floor(initialCart.participantCounts[type] || 0));
      const tier = tierByType[type];
      const tierPrice = tier ? parseFloat(tier.price as string) : fallbackPrice[type];

      for (let index = 0; index < count; index += 1) {
        addParticipant(type, tierPrice, tier?.id);
      }
    }

    if (
      initialCart.bookingOptionId &&
      bookingOptions.some((option) => option.id === initialCart.bookingOptionId)
    ) {
      setBookingOption(initialCart.bookingOptionId);
    }

    if (initialCart.customer?.email) {
      setCustomer({
        email: initialCart.customer.email,
        firstName: initialCart.customer.firstName,
        lastName: initialCart.customer.lastName,
        phone: initialCart.customer.phone,
        specialRequests: initialCart.customer.specialRequests,
        dietaryRequirements: initialCart.customer.dietaryRequirements,
        accessibilityNeeds: initialCart.customer.accessibilityNeeds,
      });
    }

    setAbandonedCartId(initialCart.cartId);

    if (
      initialCart.discount &&
      initialCart.discount.amount > 0 &&
      initialCart.discount.code.trim().length > 0
    ) {
      dispatch({
        type: "SET_DISCOUNT",
        code: initialCart.discount.code,
        amount: initialCart.discount.amount,
      });
    }

    const totalParticipants =
      initialCart.participantCounts.adult +
      initialCart.participantCounts.child +
      initialCart.participantCounts.infant;
    const hasCustomer = Boolean(
      initialCart.customer?.email &&
      initialCart.customer?.firstName &&
      initialCart.customer?.lastName
    );

    let restoredStep: BookingFlowStep = "select";
    if (totalParticipants === 0) {
      restoredStep =
        initialCart.step === "options" && state.bookingOptions.length > 0
          ? "options"
          : "select";
    } else if (initialCart.step === "options" && state.bookingOptions.length > 0) {
      restoredStep = "options";
    } else if (initialCart.step === "select") {
      restoredStep = "select";
    } else if (initialCart.step === "addons" && state.availableAddOns.length > 0) {
      restoredStep = "addons";
    } else if (initialCart.step === "details") {
      restoredStep = "details";
    } else if (initialCart.step === "payment" && hasCustomer) {
      restoredStep = "payment";
    } else if (hasCustomer) {
      restoredStep = "review";
    } else {
      restoredStep = state.availableAddOns.length > 0 ? "addons" : "details";
    }

    dispatch({ type: "SET_STEP", step: restoredStep });
    hydratedCartRef.current = initialCart.cartId;
  }, [
    addParticipant,
    bookingOptions,
    dispatch,
    initialCart,
    pricingTiers,
    setAbandonedCartId,
    setBookingOption,
    setCustomer,
    state.availableAddOns.length,
    state.bookingOptions.length,
    state.participants.length,
    state.tour?.id,
    tour.basePrice,
    tour.id,
  ]);

  useEffect(() => {
    if (
      !initialCart ||
      hydratedCartRef.current !== initialCart.cartId ||
      hydratedAddOnsRef.current === initialCart.cartId
    ) {
      return;
    }

    if (state.availableAddOns.length === 0) {
      return;
    }

    if (initialCart.selectedAddOns.length === 0) {
      hydratedAddOnsRef.current = initialCart.cartId;
      return;
    }

    for (const addOn of initialCart.selectedAddOns) {
      const exists = state.availableAddOns.some((item) => item.id === addOn.addOnProductId);
      if (!exists) {
        continue;
      }
      setAddOnQuantity(addOn.addOnProductId, addOn.quantity);
    }

    hydratedAddOnsRef.current = initialCart.cartId;
  }, [initialCart, setAddOnQuantity, state.availableAddOns]);

  useEffect(() => {
    let cancelled = false;

    const loadAddOns = async () => {
      try {
        const response = await fetch(`/api/add-ons/for-tour?tourId=${encodeURIComponent(tour.id)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAvailableAddOns([]);
          }
          return;
        }

        const payload = (await response.json()) as {
          addOns?: AvailableAddOn[];
        };

        if (!cancelled) {
          setAvailableAddOns(Array.isArray(payload.addOns) ? payload.addOns : []);
        }
      } catch {
        if (!cancelled) {
          setAvailableAddOns([]);
        }
      }
    };

    void loadAddOns();

    return () => {
      cancelled = true;
    };
  }, [setAvailableAddOns, tour.id]);

  const basePrice = parseFloat(tour.basePrice);
  const hasBookingOptions = state.bookingOptions.length > 0;
  const hasAddOns = state.availableAddOns.length > 0;
  const hasWaiverStep = Boolean(state.bookingId) && state.requiredWaivers.some((waiver) => !waiver.isSigned);

  const steps = useMemo(() => {
    const ordered = [] as Array<{ id: BookingFlowStep; label: string }>;
    if (hasBookingOptions) ordered.push({ id: "options", label: "Options" });
    ordered.push({ id: "select", label: "Tickets" });
    if (hasAddOns) ordered.push({ id: "addons", label: "Add-ons" });
    ordered.push({ id: "details", label: "Details" });
    ordered.push({ id: "review", label: "Review" });
    ordered.push({ id: "payment", label: "Payment" });
    if (hasWaiverStep) ordered.push({ id: "waiver", label: "Waiver" });
    ordered.push({ id: "confirmation", label: "Done" });
    return ordered;
  }, [hasAddOns, hasBookingOptions, hasWaiverStep]);

  const currentStepIndex = Math.max(steps.findIndex((s) => s.id === state.step), 0);
  const endTime = calculateEndTime(bookingTime, tour.durationMinutes);
  const canSaveTripCart = Boolean(
    state.tour?.id &&
    state.participants.length > 0 &&
    state.customer?.email?.trim()
  );

  const handleSaveTripCart = async () => {
    if (!state.tour?.id) {
      setTripCartError("Tour details are missing. Please refresh and try again.");
      return;
    }

    if (!state.customer?.email?.trim()) {
      setTripCartError("Add your email in the details step to save this trip cart.");
      return;
    }

    setIsSavingTripCart(true);
    setTripCartError(null);

    try {
      const response = await fetch("/api/abandoned-carts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tourId: state.tour.id,
          bookingDate: bookingDate ? format(bookingDate, "yyyy-MM-dd") : undefined,
          bookingTime,
          bookingOptionId: state.bookingOptionId ?? undefined,
          customer: state.customer,
          participants: state.participants.map((participant) => ({
            type: participant.type,
          })),
          selectedAddOns: state.selectedAddOns.map((addOn) => ({
            addOnProductId: addOn.addOnProductId,
            quantity: addOn.quantity,
          })),
          subtotal: state.subtotal.toFixed(2),
          discount: state.discount.toFixed(2),
          discountCode: state.discountCode,
          total: state.total.toFixed(2),
          currency: state.currency,
          lastStep: state.step,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        cartId?: string;
        recoveryToken?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save trip cart right now.");
      }

      if (payload.cartId) {
        setAbandonedCartId(payload.cartId);
      }

      if (payload.recoveryToken) {
        setTripCartRecoveryPath(
          `/org/${organizationSlug}/recover/${encodeURIComponent(payload.recoveryToken)}`
        );
      } else {
        setTripCartRecoveryPath(null);
      }
    } catch (error) {
      setTripCartError(
        error instanceof Error ? error.message : "Failed to save trip cart."
      );
    } finally {
      setIsSavingTripCart(false);
    }
  };

  const handleCopyRecoveryLink = async () => {
    if (!tripCartRecoveryPath || typeof window === "undefined") {
      return;
    }

    const absoluteUrl = `${window.location.origin}${tripCartRecoveryPath}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
    } catch {
      setTripCartError("Could not copy the link automatically. Please copy it manually.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 max-w-[1280px] mx-auto py-4">
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="mb-4 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 text-sm font-medium text-muted-foreground sm:hidden">
          Step {Math.min(currentStepIndex + 1, steps.length)} of {steps.length}
        </div>

        <div className="mb-10 hidden items-center justify-between sm:flex">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${index < currentStepIndex
                  ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                  : index === currentStepIndex
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                    : "bg-secondary text-muted-foreground"
                  }`}
              >
                {index < currentStepIndex ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <span
                className={`ml-3 text-sm tracking-wide ${index <= currentStepIndex ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`mx-4 h-[2px] flex-1 rounded-full ${index < currentStepIndex ? "bg-emerald-500/50" : "bg-border/60"}`} />
              )}
            </div>
          ))}
        </div>

        <CardSurface className="p-0 sm:p-0 overflow-hidden shadow-lg border-border/50">
          <div key={state.step} className="animate-fade-in p-6 sm:p-8">
            {state.step === "options" && <BookingOptionSelection />}
            {state.step === "select" && (
              <TicketSelection
                basePrice={basePrice}
                maxParticipants={tour.maxParticipants}
                availableSpots={availableSpots}
                currency={currency}
              />
            )}
            {state.step === "addons" && <AddonSelection />}
            {state.step === "details" && (
              <CustomerDetailsForm
                requireParticipantNames={false}
                organizationSlug={organizationSlug}
              />
            )}
            {state.step === "review" && <ReviewStep />}
            {state.step === "payment" && (
              <PaymentStep organizationName={organizationName} organizationSlug={organizationSlug} />
            )}
            {state.step === "waiver" && <WaiverStep />}
            {state.step === "confirmation" && (
              <BookingConfirmation
                organizationName={organizationName}
                organizationSlug={organizationSlug}
              />
            )}
          </div>
        </CardSurface>
      </div>

      {state.step !== "confirmation" ? (
        <div className="lg:col-span-5 xl:col-span-4 relative">
          <CardSurface className="sticky top-28 p-6 shadow-xl border-border/60 bg-gradient-to-b from-card to-card/95 backdrop-blur-xl">
            <h3 className="mb-5 font-bold text-xl border-b border-border/40 pb-4">Booking Summary</h3>

            {tour.coverImageUrl ? (
              <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-lg border border-border">
                <Image
                  src={tour.coverImageUrl}
                  alt={tour.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 360px"
                />
              </div>
            ) : null}

            <div className="space-y-3 border-b pb-4">
              <h4 className="font-medium">{tour.name}</h4>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(bookingDate)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(bookingTime)} - {formatTime(endTime)}
                </span>
              </div>

              {tour.meetingPoint && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{tour.meetingPoint}</span>
                </div>
              )}

              {state.bookingOptionId && (
                <div className="text-sm text-muted-foreground">
                  Option: {state.bookingOptions.find((option) => option.id === state.bookingOptionId)?.name}
                </div>
              )}
            </div>

            {state.participants.length > 0 && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Participants</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {(() => {
                    const adults = state.participants.filter((p) => p.type === "adult");
                    const children = state.participants.filter((p) => p.type === "child");
                    const infants = state.participants.filter((p) => p.type === "infant");
                    return (
                      <>
                        {adults.length > 0 && <p>{adults.length} Adult(s)</p>}
                        {children.length > 0 && <p>{children.length} Child(ren)</p>}
                        {infants.length > 0 && <p>{infants.length} Infant(s)</p>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {state.selectedAddOns.length > 0 && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Add-ons</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {state.selectedAddOns.map((addon) => (
                    <p key={addon.addOnProductId}>
                      {addon.name} x {addon.quantity}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {state.customer && (
              <div className="border-b py-4">
                <h5 className="mb-2 text-sm font-medium">Lead Contact</h5>
                <p className="text-sm text-muted-foreground">
                  {state.customer.firstName} {state.customer.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{state.customer.email}</p>
              </div>
            )}

            <div className="space-y-2 pt-4 text-sm" aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Participants</span>
                <span>{formatPrice(state.participantSubtotal, state.currency)}</span>
              </div>
              {state.addOnSubtotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span>{formatPrice(state.addOnSubtotal, state.currency)}</span>
                </div>
              )}
              {state.discount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(state.discount, state.currency)}</span>
                </div>
              )}
              {state.tax > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(state.tax, state.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-lg font-bold">
                <span>Total</span>
                <span className="text-foreground">{formatPrice(state.total, state.currency)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border/60 bg-secondary/20 p-4">
              <h5 className="text-sm font-semibold">Trip Cart</h5>
              <p className="mt-1 text-xs text-muted-foreground">
                Save this itinerary and resume later from any device.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSaveTripCart()}
                  disabled={!canSaveTripCart || isSavingTripCart}
                >
                  {isSavingTripCart ? "Saving..." : "Save Trip Cart"}
                </Button>
                {tripCartRecoveryPath && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyRecoveryLink()}
                  >
                    Copy Resume Link
                  </Button>
                )}
              </div>

              {!canSaveTripCart && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Add at least one participant and a customer email to enable cart save.
                </p>
              )}
              {tripCartRecoveryPath && (
                <p className="mt-2 break-all text-xs text-muted-foreground">{tripCartRecoveryPath}</p>
              )}
              {tripCartError && (
                <p className="mt-2 text-xs text-red-600">{tripCartError}</p>
              )}
            </div>

            <div className="pt-6 mt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Call us or{" "}
                <a href={`/org/${organizationSlug}/contact`} className="text-primary font-medium hover:underline">
                  contact support
                </a>
              </p>
            </div>
          </CardSurface>
        </div>
      ) : <div className="hidden lg:block lg:col-span-5 xl:col-span-4" />}
    </div>
  );
}

export function BookingFlow(props: BookingFlowProps) {
  return (
    <BookingProvider>
      <BookingFlowContent {...props} />
    </BookingProvider>
  );
}
