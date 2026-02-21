import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { BookingFlow, type BookingFlowInitialCart } from "@/components/booking-flow";
import { parseDateKeyToLocalDate } from "@/lib/date-key";
import { Breadcrumb, PageShell, SectionHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{ slug: string; tourSlug: string }>;
  searchParams: Promise<{ date?: string; time?: string; cart?: string }>;
}

function parsePositiveInteger(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  return 0;
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSelectedAddOns(
  value: unknown
): Array<{ addOnProductId: string; quantity: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as {
        addOnProductId?: unknown;
        quantity?: unknown;
      };

      if (typeof source.addOnProductId !== "string") {
        return null;
      }

      const addOnProductId = source.addOnProductId.trim();
      if (!addOnProductId) {
        return null;
      }

      const quantity =
        typeof source.quantity === "number"
          ? Math.round(source.quantity)
          : Number.parseInt(String(source.quantity ?? 0), 10);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      return {
        addOnProductId,
        quantity,
      };
    })
    .filter((item): item is { addOnProductId: string; quantity: number } => item !== null);
}

function mapCartStepToFlowStep(step: unknown): BookingFlowInitialCart["step"] {
  if (typeof step !== "string") {
    return "review";
  }

  if (
    step === "options" ||
    step === "select" ||
    step === "addons" ||
    step === "details" ||
    step === "review" ||
    step === "payment"
  ) {
    return step;
  }

  if (step === "tour_selected" || step === "date_selected" || step === "participants_added") {
    return "select";
  }

  if (step === "customer_info") {
    return "details";
  }

  return "review";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, tourSlug } = await params;
  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  try {
    const tour = await services.tour.getBySlug(tourSlug);
    return {
      title: `Book ${tour.name} | ${org.name}`,
      description: `Complete your booking for ${tour.name}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch (error) {
    logger.debug({ err: error, tourSlug, orgSlug: slug }, "Tour not found for metadata generation");
    return {
      title: "Book Tour",
    };
  }
}

export default async function BookTourPage({ params, searchParams }: PageProps) {
  const { slug, tourSlug } = await params;
  const { date, time, cart } = await searchParams;
  const tourPath = `/org/${slug}/tours/${tourSlug}`;

  if (!date || !time) {
    redirect(tourPath);
  }

  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  let tour;
  try {
    tour = await services.tour.getBySlug(tourSlug);
  } catch (error) {
    logger.debug({ err: error, tourSlug, orgSlug: slug }, "Tour not found for booking page");
    notFound();
  }

  if (tour.status !== "active" || !tour.isPublic) {
    notFound();
  }

  let bookingDate: Date;
  try {
    bookingDate = parseDateKeyToLocalDate(date);
  } catch {
    redirect(tourPath);
  }
  const bookingTime = time;

  const availability = await services.tourAvailability.checkSlotAvailability({
    tourId: tour.id,
    date: bookingDate,
    time: bookingTime,
    requestedSpots: 1,
  });

  if (!availability.available) {
    redirect(`${tourPath}?error=${availability.reason || "unavailable"}`);
  }

  const [pricingTiers, bookingOptions] = await Promise.all([
    services.tour.getPricingTiers(tour.id),
    services.bookingOption.getActiveByTourId(tour.id),
  ]);
  const activeTiers = pricingTiers.filter((tier) => tier.isActive);
  const cartToken = cart?.trim();
  let initialCart: BookingFlowInitialCart | null = null;

  if (cartToken) {
    try {
      const recoveredCart = await services.abandonedCart.getByRecoveryToken(cartToken);

      if (
        recoveredCart &&
        recoveredCart.status === "active" &&
        recoveredCart.tourId === tour.id
      ) {
        const metadata = (recoveredCart.metadata || {}) as {
          selectedAddOns?: unknown;
          discount?: unknown;
          discountCode?: unknown;
          bookingOptionId?: unknown;
          bookingFlowStep?: unknown;
          customerSpecialRequests?: unknown;
          customerDietaryRequirements?: unknown;
          customerAccessibilityNeeds?: unknown;
        };

        const discountAmountRaw =
          typeof metadata.discount === "string"
            ? Number.parseFloat(metadata.discount)
            : Number.NaN;
        const discountCode = parseOptionalString(metadata.discountCode);

        initialCart = {
          cartId: recoveredCart.id,
          step: mapCartStepToFlowStep(metadata.bookingFlowStep || recoveredCart.lastStep),
          bookingOptionId: parseOptionalString(metadata.bookingOptionId) ?? null,
          participantCounts: {
            adult: parsePositiveInteger(recoveredCart.adultCount),
            child: parsePositiveInteger(recoveredCart.childCount),
            infant: parsePositiveInteger(recoveredCart.infantCount),
          },
          selectedAddOns: parseSelectedAddOns(metadata.selectedAddOns),
          customer: recoveredCart.email
            ? {
                email: recoveredCart.email,
                firstName: recoveredCart.firstName || "",
                lastName: recoveredCart.lastName || "",
                phone: recoveredCart.phone || undefined,
                specialRequests: parseOptionalString(metadata.customerSpecialRequests),
                dietaryRequirements: parseOptionalString(
                  metadata.customerDietaryRequirements
                ),
                accessibilityNeeds: parseOptionalString(
                  metadata.customerAccessibilityNeeds
                ),
              }
            : undefined,
          discount:
            Number.isFinite(discountAmountRaw) &&
            discountAmountRaw > 0 &&
            Boolean(discountCode)
              ? {
                  code: discountCode!,
                  amount: Math.round(discountAmountRaw * 100) / 100,
                }
              : null,
        };
      }
    } catch (error) {
      logger.warn(
        { err: error, cartToken, orgSlug: slug, tourSlug },
        "Failed to restore booking cart draft"
      );
    }
  }

  const currency = org.settings?.defaultCurrency || "USD";

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: tour.name, href: tourPath },
          { label: "Book" },
        ]}
      />

      <SectionHeader title="Complete Your Booking" subtitle="Review your details carefully before secure checkout." />

      <BookingFlow
        tour={tour}
        bookingDate={bookingDate}
        bookingTime={bookingTime}
        availableSpots={availability.spotsRemaining ?? tour.maxParticipants}
        pricingTiers={activeTiers}
        bookingOptions={bookingOptions}
        currency={currency}
        taxConfig={org.settings?.tax}
        organizationName={org.name}
        organizationSlug={slug}
        initialCart={initialCart}
      />
    </PageShell>
  );
}
