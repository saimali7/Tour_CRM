import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/auth";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;

  try {
    // Validate user has access to this organization
    await getOrgContext(slug);
  } catch {
    // If access denied or org not found, redirect to home
    redirect("/");
  }

  return <>{children}</>;
}
