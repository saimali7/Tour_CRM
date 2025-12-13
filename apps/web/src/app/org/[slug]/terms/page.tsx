import type { Metadata } from "next";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Terms of Service | ${org.name}`,
    description: `Read the terms of service for ${org.name}. These terms govern your use of our booking services.`,
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);

  const lastUpdated = "January 1, 2025";

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">
          Tours
        </a>
        <span className="mx-2">/</span>
        <span>Terms of Service</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using the services provided by {branding.name}
              (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be
              bound by these Terms of Service. If you do not agree to these terms,
              please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Booking and Reservations</h2>
            <p className="text-muted-foreground mb-3">
              When you make a booking through our platform, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Be at least 18 years of age or have parental consent</li>
              <li>Pay all fees associated with your booking</li>
              <li>Arrive at the designated meeting point on time</li>
              <li>Follow all safety instructions provided by guides</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Pricing and Payment</h2>
            <p className="text-muted-foreground mb-3">
              All prices displayed are in the currency specified and include
              applicable taxes unless otherwise stated. Payment is required at the
              time of booking to secure your reservation.
            </p>
            <p className="text-muted-foreground">
              We accept major credit cards and other payment methods as displayed
              during checkout. Your payment information is processed securely through
              our payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cancellation Policy</h2>
            <p className="text-muted-foreground mb-3">
              Cancellation policies vary by tour and are displayed on each tour&apos;s
              detail page. Generally:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                Cancellations made within the free cancellation window receive a full
                refund
              </li>
              <li>
                Late cancellations may be subject to partial or no refund depending on
                the tour&apos;s specific policy
              </li>
              <li>No-shows are not eligible for refunds</li>
              <li>
                We reserve the right to cancel tours due to weather, safety concerns,
                or insufficient participants, with full refunds provided in such cases
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Modifications</h2>
            <p className="text-muted-foreground">
              Booking modifications are subject to availability. Please contact us as
              early as possible if you need to change your booking date or other
              details. Additional fees may apply for certain modifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Participant Responsibilities
            </h2>
            <p className="text-muted-foreground mb-3">As a tour participant, you:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Are responsible for your own safety and belongings</li>
              <li>
                Must disclose any medical conditions that may affect your
                participation
              </li>
              <li>Agree to follow all rules and instructions given by guides</li>
              <li>Will treat other participants, guides, and locals with respect</li>
              <li>Accept that certain activities involve inherent risks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              While we take every precaution to ensure your safety and satisfaction,
              {branding.name} is not liable for any injuries, losses, or damages that
              occur during tours, except where caused by our negligence. We recommend
              appropriate travel insurance for all bookings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on our website, including text, images, logos, and
              multimedia, is owned by {branding.name} and protected by copyright law.
              You may not reproduce, distribute, or use our content without prior
              written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. Continued use of our
              services after changes are posted constitutes acceptance of the revised
              terms. We encourage you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground mb-3">
              If you have questions about these Terms of Service, please contact us:
            </p>
            {branding.email && (
              <p className="text-muted-foreground">
                Email:{" "}
                <a href={`mailto:${branding.email}`} className="text-primary hover:underline">
                  {branding.email}
                </a>
              </p>
            )}
            {branding.phone && (
              <p className="text-muted-foreground">
                Phone:{" "}
                <a href={`tel:${branding.phone}`} className="text-primary hover:underline">
                  {branding.phone}
                </a>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
