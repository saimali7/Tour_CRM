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
    <PageShell>
      <Breadcrumb
        items={[
          { label: "Tours", href: `/org/${slug}` },
          { label: "Privacy Policy" },
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
          <h1 className="mb-3 text-4xl font-bold">Privacy Policy</h1>
          <p className="mb-8 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

          <div className="space-y-6">
            {sections.map((section) => (
              <CardSurface key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="mb-3 text-2xl font-semibold">{section.title}</h2>
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
              <h2 className="mb-3 text-2xl font-semibold">Contact</h2>
              <p className="text-muted-foreground">
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
            </CardSurface>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
