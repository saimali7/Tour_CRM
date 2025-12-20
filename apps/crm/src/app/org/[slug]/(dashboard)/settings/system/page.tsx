"use client";

import { useParams } from "next/navigation";
import { ServiceHealthPanel } from "@/components/settings/service-health";

export default function SystemSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Service Status</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor the health of connected services and integrations
        </p>
      </div>

      <ServiceHealthPanel orgSlug={slug} isActive={true} />
    </div>
  );
}
