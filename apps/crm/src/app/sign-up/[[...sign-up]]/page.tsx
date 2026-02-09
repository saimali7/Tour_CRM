import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { Route } from "next";

interface SignUpPageProps {
  searchParams: Promise<{
    redirect?: string | string[];
    redirect_url?: string | string[];
  }>;
}

function getParamValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getLegacyRedirectTarget(legacyRedirect: string): string | null {
  if (!legacyRedirect.startsWith("/")) {
    return null;
  }

  const orgMatch = legacyRedirect.match(/^\/org\/([^/?#]+)/);
  if (orgMatch?.[1]) {
    return `/invite/${orgMatch[1]}`;
  }

  return legacyRedirect;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectUrl = getParamValue(params.redirect_url);
  const legacyRedirect = getParamValue(params.redirect);

  if (legacyRedirect && !redirectUrl) {
    const target = getLegacyRedirectTarget(legacyRedirect);
    if (target) {
      redirect((`/sign-up?redirect_url=${encodeURIComponent(target)}` as Route));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
