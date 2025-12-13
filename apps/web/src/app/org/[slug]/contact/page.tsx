import type { Metadata } from "next";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { MapPin, Mail, Phone, Clock, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

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

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <a href="/" className="hover:text-primary">
          Tours
        </a>
        <span className="mx-2">/</span>
        <span>Contact Us</span>
      </nav>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            Have questions? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Cards */}
            {branding.email && (
              <div className="p-6 rounded-lg border bg-card">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${branding.primaryColor}20` }}
                  >
                    <Mail className="h-5 w-5" style={{ color: branding.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email Us</h3>
                    <a
                      href={`mailto:${branding.email}`}
                      className="text-primary hover:underline text-sm"
                    >
                      {branding.email}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>
            )}

            {branding.phone && (
              <div className="p-6 rounded-lg border bg-card">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${branding.primaryColor}20` }}
                  >
                    <Phone className="h-5 w-5" style={{ color: branding.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Call Us</h3>
                    <a
                      href={`tel:${branding.phone}`}
                      className="text-primary hover:underline text-sm"
                    >
                      {branding.phone}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available during business hours
                    </p>
                  </div>
                </div>
              </div>
            )}

            {branding.address && (
              <div className="p-6 rounded-lg border bg-card">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${branding.primaryColor}20` }}
                  >
                    <MapPin className="h-5 w-5" style={{ color: branding.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Visit Us</h3>
                    <p className="text-sm text-muted-foreground">{branding.address}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${branding.primaryColor}20` }}
                >
                  <Clock className="h-5 w-5" style={{ color: branding.primaryColor }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Business Hours</h3>
                  <p className="text-sm text-muted-foreground">
                    Monday - Friday: 9:00 AM - 6:00 PM
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Saturday: 10:00 AM - 4:00 PM
                  </p>
                  <p className="text-sm text-muted-foreground">Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="p-8 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-6 w-6" style={{ color: branding.primaryColor }} />
                <h2 className="text-2xl font-semibold">Send us a Message</h2>
              </div>
              <ContactForm organizationId={org.id} organizationName={branding.name} />
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 p-8 rounded-lg border bg-card">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">How do I book a tour?</h3>
              <p className="text-sm text-muted-foreground">
                Browse our available tours, select your preferred date and time, and
                complete the booking process online. You&apos;ll receive a confirmation
                email immediately.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">What&apos;s your cancellation policy?</h3>
              <p className="text-sm text-muted-foreground">
                Cancellation policies vary by tour. Please check the specific tour
                details for cancellation terms before booking.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Can I modify my booking?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can modify your booking by contacting us directly. We&apos;ll
                do our best to accommodate your request based on availability.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Do you offer group discounts?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, we offer discounts for larger groups. Contact us for group rates
                and special arrangements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
