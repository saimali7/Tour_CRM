import type { Metadata } from "next";
import { requireOrganization, getOrganizationBranding } from "@/lib/organization";
import { Breadcrumb, Section } from "@/components/layout";

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

interface PrivacySection {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
}

const sections: PrivacySection[] = [
  {
    id: "intro",
    title: "Introduction",
    body: "We respect your privacy and are committed to safeguarding personal information collected through our booking and support channels.",
  },
  {
    id: "collect",
    title: "Information We Collect",
    bullets: [
      "Contact details such as name, email, and phone",
      "Booking details and participant preferences",
      "Payment metadata from secure payment processors",
      "Website usage data for analytics and performance",
    ],
  },
  {
    id: "use",
    title: "How We Use Information",
    bullets: [
      "Process and manage bookings",
      "Send confirmations and operational updates",
      "Provide support and service recovery",
      "Improve tours, website performance, and customer experience",
      "Comply with legal and safety obligations",
    ],
  },
  {
    id: "share",
    title: "Information Sharing",
    body: "We only share personal data with necessary service providers (e.g., payment processors, communication providers) and legal authorities where required.",
  },
  {
    id: "cookies",
    title: "Cookies and Analytics",
    body: "We use cookies and similar technologies to maintain session security, measure site performance, and improve user experience.",
  },
  {
    id: "rights",
    title: "Your Rights",
    body: "Depending on your jurisdiction, you may request access, correction, deletion, or portability of your personal data.",
  },
];

export default async function PrivacyPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await requireOrganization(slug);
  const branding = getOrganizationBranding(org);

  const lastUpdated = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <Section spacing="spacious">
      <div className="mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy" },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">On this page</p>
              <nav className="mt-3 space-y-2">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="mx-auto w-full" style={{ maxWidth: "var(--content-width, 720px)" }}>
            <h1 className="text-display mb-3">Privacy Policy</h1>
            <p className="mb-10 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                  <h2 className="mb-3 text-heading font-bold">{section.title}</h2>
                  {section.body ? <p className="text-muted-foreground leading-relaxed">{section.body}</p> : null}
                  {section.bullets ? (
                    <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}

              <div id="contact" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
                <h2 className="mb-3 text-heading font-bold">Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Questions about this policy can be sent to{" "}
                  <a href={`mailto:${branding.email}`} className="text-primary hover:underline">
                    {branding.email}
                  </a>
                  {branding.phone ? (
                    <>
                      {" "}or by phone at{" "}
                      <a href={`tel:${branding.phone}`} className="text-primary hover:underline">
                        {branding.phone}
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
