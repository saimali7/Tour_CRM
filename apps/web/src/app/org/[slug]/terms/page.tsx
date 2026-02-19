import type { Metadata } from "next";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { Breadcrumb, CardSurface, PageShell } from "@/components/layout";

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

interface TermsSection {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
}

const sections: TermsSection[] = [
  {
    id: "agreement",
    title: "Agreement to Terms",
    body: "By accessing or using our booking services, you agree to these Terms of Service. If you do not agree, please do not use our services.",
  },
  {
    id: "booking",
    title: "Booking and Reservations",
    bullets: [
      "Provide accurate and complete booking information",
      "Be at least 18 years of age or have parental consent",
      "Pay all fees associated with your reservation",
      "Arrive at the designated meeting point on time",
      "Follow all safety instructions from guides",
    ],
  },
  {
    id: "pricing",
    title: "Pricing and Payment",
    body: "Prices are shown in the displayed currency and may include taxes depending on jurisdiction. Payment processing is handled through our secure payment partners.",
  },
  {
    id: "cancellation",
    title: "Cancellation Policy",
    body: "Cancellation windows and refund eligibility vary by tour. The policy shown on each tour page applies to that booking.",
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    body: "While we prioritize safety and quality, participation in tours may involve inherent risk. Liability is limited to the maximum extent permitted by applicable law.",
  },
  {
    id: "updates",
    title: "Changes to Terms",
    body: "We may update these terms from time to time. Continued use of our services after updates are published constitutes acceptance.",
  },
];

export default async function TermsPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);

  const lastUpdated = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Terms of Service" },
        ]}
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">On this page</p>
            <nav className="mt-3 space-y-2">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="block text-sm text-muted-foreground hover:text-primary">
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-3 text-4xl font-bold">Terms of Service</h1>
          <p className="mb-8 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <CardSurface key={section.id} className="scroll-mt-24" id={section.id}>
                <h2 className="mb-3 text-2xl font-semibold">{index + 1}. {section.title}</h2>
                {section.body ? <p className="text-muted-foreground">{section.body}</p> : null}
                {section.bullets ? (
                  <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </CardSurface>
            ))}

            <CardSurface id="contact" className="scroll-mt-24">
              <h2 className="mb-3 text-2xl font-semibold">Contact Information</h2>
              <p className="text-muted-foreground">
                If you have questions about these terms, contact us at{" "}
                <a href={`mailto:${branding.email}`} className="text-primary hover:underline">
                  {branding.email}
                </a>
                {branding.phone ? (
                  <>
                    {" "}or call{" "}
                    <a href={`tel:${branding.phone}`} className="text-primary hover:underline">
                      {branding.phone}
                    </a>
                  </>
                ) : null}
                .
              </p>
            </CardSurface>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
