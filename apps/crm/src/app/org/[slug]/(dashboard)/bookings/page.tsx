import { getOrgContext } from "@/lib/auth";
import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

interface BookingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { slug } = await params;
  await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage your tour reservations</p>
        </div>
        <Link
          href={`/org/${slug}/bookings/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No bookings yet
          </h3>
          <p className="mt-2 text-gray-500">
            Get started by creating your first booking.
          </p>
          <Link
            href={`/org/${slug}/bookings/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
