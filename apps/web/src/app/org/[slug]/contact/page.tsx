import type { Metadata } from "next";
import Link from "next/link";
import {
  requireOrganization,
  getOrganizationBranding,
  getOrganizationBookingUrl,
} from "@/lib/organization";
import { MapPin, Mail, Phone, Clock, MessageSquare, ExternalLink, ChevronDown } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { BreadcrumbStructuredData, FAQStructuredData } from "@/components/structured-data";
import { Breadcrumb, Section, SectionHeader, HeroSection } from "@/components/layout";
import { Button } from "@tour/ui";

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

      <HeroSection
        eyebrow="Get in touch"
        title="Contact Us"
        subtitle="Have questions before booking or need help with an existing reservation? We're here to help."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-white/95 text-stone-900 hover:bg-white px-6 h-11">
            <Link href="/booking" className="inline-flex items-center gap-2">
              Manage Booking
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10 px-6 h-11">
            <Link href="/private-tours">Private Inquiry</Link>
          </Button>
        </div>
      </HeroSection>

      {/* Contact info + form */}
      <Section spacing="spacious">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              {branding.email && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email Us</h3>
                      <a href={`mailto:${branding.email}`} className="text-sm text-primary hover:underline">
                        {branding.email}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">We typically respond within 24 hours</p>
                    </div>
                  </div>
                </div>
              )}

              {branding.phone && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Call Us</h3>
                      <a href={`tel:${branding.phone}`} className="text-sm text-primary hover:underline">
                        {branding.phone}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">Available during business hours</p>
                    </div>
                  </div>
                </div>
              )}

              {branding.address && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Visit Us</h3>
                      <p className="text-sm text-muted-foreground">{branding.address}</p>
                      {mapQuery && (
                        <a
                          href={`https://maps.google.com/?q=${mapQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open in Maps
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Business Hours</h3>
                    <p className="text-sm text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-sm text-muted-foreground">Saturday: 10:00 AM - 4:00 PM</p>
                    <p className="text-sm text-muted-foreground">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-sm)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-title">Send us a Message</h2>
                </div>
                <ContactForm organizationId={org.id} organizationName={branding.name} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section spacing="spacious" variant="accent">
        <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
          <SectionHeader
            eyebrow="FAQ"
            title="Frequently Asked Questions"
            subtitle="Quick answers before you book."
          />
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-sm)]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground hover:text-primary transition-colors">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
