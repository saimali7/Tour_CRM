"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    // Redirect to general settings by default
    router.replace(`/org/${slug}/settings/general`);
  }, [router, slug]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
