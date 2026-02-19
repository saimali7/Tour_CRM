import { notFound } from "next/navigation";
import { getOrganizationBySlug, getOrganizationBranding } from "@/lib/organization";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  const branding = getOrganizationBranding(org);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        {
          "--primary-color": branding.primaryColor,
          "--org-primary-color": branding.primaryColor,
          "--org-currency": branding.currency,
          "--org-timezone": branding.timezone,
        } as React.CSSProperties
      }
    >
      <Header
        orgName={branding.name}
        logo={branding.logo}
        primaryColor={branding.primaryColor}
        timezone={branding.timezone}
        currency={branding.currency}
      />
      <main className="flex-1">{children}</main>
      <Footer
        orgName={branding.name}
        email={branding.email}
        phone={branding.phone}
        website={branding.website}
        address={branding.address}
        timezone={branding.timezone}
        currency={branding.currency}
        socialLinks={branding.socialLinks}
      />
    </div>
  );
}
