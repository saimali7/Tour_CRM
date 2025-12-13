import type { Metadata } from "next";
import Image from "next/image";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { MapPin, Mail, Phone, Globe, Clock } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `About Us | ${org.name}`,
    description: `Learn more about ${org.name} and our tours. Discover our story, mission, and commitment to providing exceptional tour experiences.`,
    openGraph: {
      title: `About Us | ${org.name}`,
      description: `Learn more about ${org.name} and our tours.`,
      type: "website",
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
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
        <span>About Us</span>
      </nav>

      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {branding.logo && (
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                src={branding.logo}
                alt={branding.name}
                fill
                className="object-contain"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold mb-4">About {branding.name}</h1>
          <p className="text-xl text-muted-foreground">
            Discover extraordinary experiences with us
          </p>
        </div>

        {/* About Content */}
        <div className="prose prose-neutral max-w-none mb-12">
          <div className="p-8 rounded-lg border bg-card">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to {branding.name}! We are passionate about creating memorable
              tour experiences that connect people with amazing destinations and
              unforgettable moments.
            </p>
            <p className="text-muted-foreground mb-4">
              Our team of experienced guides and travel experts work tirelessly to
              design tours that go beyond the ordinary. We believe that every journey
              should be an adventure, and every traveler deserves personalized
              attention and care.
            </p>
            <p className="text-muted-foreground">
              Whether you&apos;re looking for cultural immersion, outdoor adventures,
              or relaxing getaways, we have something special waiting for you.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg border bg-card text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}20` }}
            >
              <Clock className="h-6 w-6" style={{ color: branding.primaryColor }} />
            </div>
            <h3 className="font-semibold mb-2">Expert Guides</h3>
            <p className="text-sm text-muted-foreground">
              Our knowledgeable guides bring destinations to life with their passion
              and expertise.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}20` }}
            >
              <MapPin className="h-6 w-6" style={{ color: branding.primaryColor }} />
            </div>
            <h3 className="font-semibold mb-2">Unique Experiences</h3>
            <p className="text-sm text-muted-foreground">
              Discover hidden gems and authentic experiences off the beaten path.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${branding.primaryColor}20` }}
            >
              <Globe className="h-6 w-6" style={{ color: branding.primaryColor }} />
            </div>
            <h3 className="font-semibold mb-2">Sustainable Tourism</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;re committed to responsible travel that benefits local
              communities.
            </p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-8 rounded-lg border bg-card">
          <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branding.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <a
                    href={`mailto:${branding.email}`}
                    className="text-primary hover:underline"
                  >
                    {branding.email}
                  </a>
                </div>
              </div>
            )}
            {branding.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <a
                    href={`tel:${branding.phone}`}
                    className="text-primary hover:underline"
                  >
                    {branding.phone}
                  </a>
                </div>
              </div>
            )}
            {branding.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Website</p>
                  <a
                    href={branding.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {branding.website}
                  </a>
                </div>
              </div>
            )}
            {branding.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-muted-foreground">{branding.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
