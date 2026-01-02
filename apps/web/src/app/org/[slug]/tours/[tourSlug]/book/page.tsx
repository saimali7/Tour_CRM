import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOrganization } from "@/lib/organization";
import { createServices, logger } from "@tour/services";
import { BookingFlow } from "@/components/booking-flow";

interface PageProps {
  params: Promise<{ slug: string; tourSlug: string }>;
  searchParams: Promise<{ schedule?: string }>;
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
  const { schedule: scheduleId } = await searchParams;

  if (!scheduleId) {
    // Redirect back to tour page if no schedule selected
    redirect(`/tours/${tourSlug}`);
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

  // Only allow booking of active, public tours
  if (tour.status !== "active" || !tour.isPublic) {
    notFound();
  }

  // Get the selected schedule
  let schedule;
  try {
    schedule = await services.schedule.getById(scheduleId);
  } catch (error) {
    // Schedule not found, redirect to tour page
    logger.debug({ err: error, scheduleId, tourSlug }, "Schedule not found for booking page");
    redirect(`/tours/${tourSlug}`);
  }

  // Validate schedule belongs to this tour and is available
  if (schedule.tourId !== tour.id || schedule.status === "cancelled") {
    redirect(`/tours/${tourSlug}`);
  }

  // Check availability
  const availableSpots = schedule.maxParticipants - (schedule.bookedCount || 0);
  if (availableSpots <= 0) {
    redirect(`/tours/${tourSlug}?error=sold-out`);
  }

  // Get pricing tiers
  const pricingTiers = await services.tour.getPricingTiers(tour.id);
  const activeTiers = pricingTiers.filter((tier) => tier.isActive);

  const currency = org.settings?.defaultCurrency || "USD";

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">
          Tours
        </a>
        <span className="mx-2">/</span>
        <a href={`/tours/${tourSlug}`} className="hover:text-primary">
          {tour.name}
        </a>
        <span className="mx-2">/</span>
        <span>Book</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">Complete Your Booking</h1>

      <BookingFlow
        tour={tour}
        schedule={schedule}
        pricingTiers={activeTiers}
        currency={currency}
        organizationName={org.name}
      />
    </div>
  );
}
