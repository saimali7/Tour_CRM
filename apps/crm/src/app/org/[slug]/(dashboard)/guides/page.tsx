import { getOrgContext } from "@/lib/auth";
import { UserCircle, Plus } from "lucide-react";
import Link from "next/link";

interface GuidesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GuidesPage({ params }: GuidesPageProps) {
  const { slug } = await params;
  await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guides</h1>
          <p className="text-gray-500 mt-1">Manage your tour guides</p>
        </div>
        <Link
          href={`/org/${slug}/guides/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Guide
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-12 text-center">
          <UserCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No guides yet
          </h3>
          <p className="mt-2 text-gray-500">
            Add guides to assign them to scheduled tours.
          </p>
          <Link
            href={`/org/${slug}/guides/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
