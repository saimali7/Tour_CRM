import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentUser, getOrgContext } from "@/lib/auth";

interface InviteAcceptPageProps {
  params: Promise<{ slug: string }>;
}

export default async function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    const returnUrl = encodeURIComponent(`/invite/${slug}`);
    redirect((`/sign-in?redirect_url=${returnUrl}` as Route));
  }

  try {
    await getOrgContext(slug);
  } catch {
    redirect("/");
  }

  redirect(`/org/${slug}`);
}
