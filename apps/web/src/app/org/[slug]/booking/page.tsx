import type { Metadata } from "next";
import { requireOrganization } from "@/lib/organization";
import { BookingLookup } from "@/components/booking-lookup";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Find Your Booking | ${org.name}`,
    description: `Look up your booking with ${org.name} using your reference number or email.`,
  };
}

export default async function BookingLookupPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">
          Tours
        </a>
        <span className="mx-2">/</span>
        <span>Find Booking</span>
      </nav>

      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Find Your Booking</h1>
        <p className="text-center text-muted-foreground mb-8">
          Enter your booking reference number and email to view your booking details.
        </p>

        <BookingLookup organizationId={org.id} />
      </div>
    </div>
  );
}
