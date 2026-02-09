import { redirect } from "next/navigation";
import { and, db, eq } from "@tour/database";
import { organizationMembers, organizations } from "@tour/database/schema";
import { getCurrentUser } from "@/lib/auth";

interface InviteAcceptPageProps {
  params: Promise<{ slug: string }>;
}

export default async function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    const returnUrl = encodeURIComponent(`/invite/${slug}`);
    redirect(`/sign-in?redirect_url=${returnUrl}`);
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (!organization || organization.status !== "active") {
    redirect("/");
  }

  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organization.id),
      eq(organizationMembers.userId, user.id)
    ),
  });

  if (!membership || membership.status === "suspended") {
    redirect("/");
  }

  if (membership.status === "invited") {
    await db
      .update(organizationMembers)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, membership.id));
  }

  redirect(`/org/${slug}`);
}
