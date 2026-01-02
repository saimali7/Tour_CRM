import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth";
import { logger } from "@tour/services";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;

  try {
    // Validate user has access to this organization
    await getOrgContext(slug);
  } catch (error) {
    // If access denied or org not found, redirect to home
    logger.debug({ err: error, slug }, "User access denied to organization, redirecting to home");
    redirect("/");
  }

  return <>{children}</>;
}
