import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { BookingFlow } from "@/components/booking-flow";
import { parseDateKeyToLocalDate } from "@/lib/date-key";
import { Breadcrumb, PageShell, SectionHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{ slug: string; tourSlug: string }>;
  searchParams: Promise<{ date?: string; time?: string }>;
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
  const { date, time } = await searchParams;
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
      />
    </PageShell>
  );
}
