import { redirect } from "next/navigation";
import { abandonedCarts, db, eq, organizations } from "@tour/database";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function RecoverByTokenPage({ params }: PageProps) {
  const { token } = await params;
  const recoveryToken = token.trim();

  if (!recoveryToken) {
    redirect("/no-org");
  }

  const result = await db
    .select({
      slug: organizations.slug,
      status: organizations.status,
    })
    .from(abandonedCarts)
    .innerJoin(organizations, eq(abandonedCarts.organizationId, organizations.id))
    .where(eq(abandonedCarts.recoveryToken, recoveryToken))
    .limit(1);

  const row = result[0];
  if (!row || row.status !== "active") {
    redirect("/no-org?recovery=invalid");
  }

  redirect(`/org/${row.slug}/recover/${encodeURIComponent(recoveryToken)}`);
}
