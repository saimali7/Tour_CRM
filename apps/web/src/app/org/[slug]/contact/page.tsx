import type { Metadata } from "next";
import Link from "next/link";
import {
  requireOrganization,
  getOrganizationBranding,
  getOrganizationBookingUrl,
} from "@/lib/organization";
import { MapPin, Mail, Phone, Clock, MessageSquare, ExternalLink } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { BreadcrumbStructuredData, FAQStructuredData } from "@/components/structured-data";
import { Breadcrumb, CardSurface, PageShell, Section, SectionHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Contact Us | ${org.name}`,
    description: `Get in touch with ${org.name}. We're here to help with your tour inquiries, bookings, and questions.`,
    openGraph: {
      title: `Contact Us | ${org.name}`,
      description: `Contact ${org.name} for tour inquiries and bookings.`,
      type: "website",
    },
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);
  const faqs = [
    {
      question: "How do I book a tour?",
      answer:
        "Browse our available tours, select your preferred date and time, and complete the booking process online. You will receive a confirmation email immediately.",
    },
    {
      question: "What's your cancellation policy?",
      answer:
        "Cancellation policies vary by tour. Please check the specific tour details for cancellation terms before booking.",
    },
    {
      question: "Can I modify my booking?",
      answer:
        "Yes. You can request changes from the booking management page, or contact us directly for support.",
    },
    {
      question: "Do you offer group discounts?",
      answer:
        "Yes, we offer discounts for larger groups. Contact us for group rates and special arrangements.",
    },
  ];

  const mapQuery = branding.address ? encodeURIComponent(branding.address) : null;

  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: "Tours", url: getOrganizationBookingUrl(org, "/") },
          { name: "Contact Us", url: getOrganizationBookingUrl(org, "/contact") },
        ]}
      />
      <FAQStructuredData items={faqs} />

      <PageShell>
        <Breadcrumb
          items={[
            { label: "Tours", href: `/org/${slug}` },
            { label: "Contact Us" },
          ]}
        />

        <div className="mx-auto max-w-6xl">
          <SectionHeader
            align="center"
            title="Contact Us"
            subtitle="Have questions before booking or need help with an existing reservation? We’re here to help."
          />

          <Section spacing="compact" className="pt-2">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                {branding.email && (
                  <CardSurface>
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Email Us</h3>
                        <a href={`mailto:${branding.email}`} className="text-sm text-primary hover:underline">
                          {branding.email}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">We typically respond within 24 hours</p>
                      </div>
                    </div>
                  </CardSurface>
                )}

                {branding.phone && (
                  <CardSurface>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Call Us</h3>
                        <a href={`tel:${branding.phone}`} className="text-sm text-primary hover:underline">
                          {branding.phone}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">Available during business hours</p>
                        <Link
                          href={`tel:${branding.phone}`}
                          className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
                        >
                          One-tap call
                        </Link>
                      </div>
                    </div>
                  </CardSurface>
                )}

                {branding.address && (
                  <CardSurface>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Visit Us</h3>
                        <p className="text-sm text-muted-foreground">{branding.address}</p>
                      </div>
                    </div>
                  </CardSurface>
                )}

                <CardSurface>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Business Hours</h3>
                      <p className="text-sm text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p className="text-sm text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</p>
                      <p className="text-sm text-muted-foreground">Sunday: Closed</p>
                    </div>
                  </div>
                </CardSurface>

                {mapQuery && (
                  <CardSurface>
                    <h3 className="mb-3 text-sm font-semibold">Map Preview</h3>
                    <a
                      href={`https://maps.google.com/?q=${mapQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </CardSurface>
                )}
              </div>

              <div className="lg:col-span-2">
                <CardSurface className="p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold">Send us a Message</h2>
                  </div>
                  <ContactForm organizationId={org.id} organizationName={branding.name} />
                </CardSurface>
              </div>
            </div>
          </Section>

          <Section spacing="compact" className="pt-0">
            <SectionHeader title="Frequently Asked Questions" subtitle="Quick answers before you book." />
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-lg border border-border bg-card p-4">
                  <summary className="cursor-pointer list-none pr-6 text-sm font-medium marker:hidden">
                    {faq.question}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        </div>
      </PageShell>
    </>
  );
}
