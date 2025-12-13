import { redirect } from "next/navigation";
import { validateMagicLinkToken } from "@/lib/guide-auth";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface GuideAuthPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function GuideAuthPage({ searchParams }: GuideAuthPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Magic Link Required</h1>
          </div>
          <p className="text-gray-600">
            Please use the magic link sent to your email to access the guide portal.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            If you haven't received a magic link, please contact your organization administrator.
          </p>
        </div>
      </div>
    );
  }

  // Validate the token
  const guideContext = await validateMagicLinkToken(token);

  if (!guideContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Invalid or Expired Link</h1>
          </div>
          <p className="text-gray-600">
            This magic link is invalid or has expired. Please request a new one from your organization.
          </p>
        </div>
      </div>
    );
  }

  // Success - redirect to dashboard
  redirect("/guide");
}
