import type { Metadata } from "next";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await requireOrganization(slug);

  return {
    title: `Privacy Policy | ${org.name}`,
    description: `Learn about how ${org.name} collects, uses, and protects your personal information.`,
  };
}

export default async function PrivacyPage({ params }: PageProps) {
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
        <span>Privacy Policy</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              {branding.name} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
              committed to protecting your privacy. This Privacy Policy explains how
              we collect, use, disclose, and safeguard your information when you use
              our booking services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">Personal Information</h3>
            <p className="text-muted-foreground mb-3">
              When you make a booking or contact us, we may collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Name and contact information (email, phone number)</li>
              <li>Billing and payment information</li>
              <li>Date of birth (when required for certain tours)</li>
              <li>Dietary restrictions or medical conditions (when voluntarily provided)</li>
              <li>Emergency contact details</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">Automatically Collected Information</h3>
            <p className="text-muted-foreground mb-3">
              When you visit our website, we automatically collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Pages visited and time spent</li>
              <li>Referring website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process and manage your bookings</li>
              <li>Send booking confirmations and updates</li>
              <li>Provide customer support</li>
              <li>Process payments securely</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Improve our services and website</li>
              <li>Comply with legal obligations</li>
              <li>Ensure the safety of tour participants</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
            <p className="text-muted-foreground mb-3">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Tour guides:</strong> Necessary details for tour operation
              </li>
              <li>
                <strong>Payment processors:</strong> To securely process payments
              </li>
              <li>
                <strong>Service providers:</strong> Who help us operate our business
              </li>
              <li>
                <strong>Legal authorities:</strong> When required by law
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational security measures
              to protect your personal information. This includes encryption,
              secure servers, and regular security assessments. However, no method
              of transmission over the internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-3">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Remember your preferences</li>
              <li>Analyze website traffic and usage</li>
              <li>Improve user experience</li>
              <li>Enable certain website features</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal information for as long as necessary to fulfill
              the purposes outlined in this policy, unless a longer retention period
              is required by law. Booking records are typically retained for 7 years
              for legal and accounting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              Our services are not directed to children under 16. We do not knowingly
              collect personal information from children. If you believe we have
              collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you
              of any material changes by posting the new policy on this page and
              updating the &quot;Last updated&quot; date. We encourage you to review
              this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-3">
              If you have questions about this Privacy Policy or your personal data,
              please contact us:
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
            {branding.address && (
              <p className="text-muted-foreground">Address: {branding.address}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
