"use client";

import { useParams, redirect } from "next/navigation";

/**
 * Redirect to the guide detail page's Details tab.
 * Editing is now inline — no separate edit page needed (matches tour pattern).
 */
export default function EditGuidePage() {
  const params = useParams();
  const slug = params.slug as string;
  const guideId = params.id as string;

  redirect(`/org/${slug}/guides/${guideId}?tab=details`);
}
