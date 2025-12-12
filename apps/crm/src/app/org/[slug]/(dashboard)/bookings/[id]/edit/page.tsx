"use client";

import { trpc } from "@/lib/trpc";
import { BookingForm } from "@/components/bookings/booking-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

export default function EditBookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const bookingId = params.id as string;

  const { data: booking, isLoading, error } = trpc.booking.getById.useQuery({ id: bookingId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-600">Error loading booking: {error.message}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Booking not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/org/${slug}/bookings/${booking.id}` as Route}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Booking</h1>
          <p className="text-gray-500 mt-1">
            {booking.referenceNumber} • {booking.customer?.firstName} {booking.customer?.lastName}
          </p>
        </div>
      </div>

      <BookingForm booking={booking} />
    </div>
  );
}
