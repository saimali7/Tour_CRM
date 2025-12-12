import { getOrgContext } from "@/lib/auth";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";

interface SchedulesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SchedulesPage({ params }: SchedulesPageProps) {
  const { slug } = await params;
  await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-500 mt-1">
            Schedule tour times and manage availability
          </p>
        </div>
        <Link
          href={`/org/${slug}/schedules/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No schedules yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create a tour first, then schedule specific times for it.
          </p>
          <Link
            href={`/org/${slug}/tours/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create a Tour First
          </Link>
        </div>
      </div>
    </div>
  );
}
