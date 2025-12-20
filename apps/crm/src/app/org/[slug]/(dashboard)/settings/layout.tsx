import { SettingsNav } from "@/components/settings/settings-nav";
import { use } from "react";

export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <div className="flex h-full bg-muted/30">
      {/* Settings Navigation Sidebar */}
      <aside className="w-[260px] flex-shrink-0 h-full bg-background border-r border-border/50">
        <SettingsNav slug={resolvedParams.slug} />
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
