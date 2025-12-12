"use client";

import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Ticket,
  Clock,
  Globe,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";

export default function CustomerDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const customerId = params.id as string;

  const { data: customer, isLoading, error } = trpc.customer.getByIdWithStats.useQuery({
    id: customerId,
  });

  const { data: bookings } = trpc.customer.getBookings.useQuery({ id: customerId });

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
        <p className="text-red-600">Error loading customer: {error.message}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/org/${slug}/customers` as Route}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xl">
                {customer.firstName[0]}
                {customer.lastName[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-gray-500 mt-1">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/org/${slug}/customers/${customer.id}/edit` as Route}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Customer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-xl font-semibold text-gray-900">
                {customer.totalBookings ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-xl font-semibold text-gray-900">
                ${parseFloat(customer.totalSpent ?? "0").toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Booking</p>
              <p className="text-xl font-semibold text-gray-900">
                {customer.lastBookingAt ? formatDate(customer.lastBookingAt) : "Never"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Source</p>
              <p className="text-xl font-semibold text-gray-900">
                {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-gray-900 hover:text-primary"
                >
                  {customer.email}
                </a>
              </div>
            </div>

            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-gray-900 hover:text-primary"
                  >
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {(customer.address || customer.city || customer.country) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">
                    {[customer.address, customer.city, customer.state, customer.postalCode, customer.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Language</p>
                <p className="text-gray-900">
                  {customer.language?.toUpperCase() || "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Currency</p>
                <p className="text-gray-900">{customer.currency || "Not set"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
          {customer.tags && customer.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tags</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      {/* Booking History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h2>

        {bookings && bookings.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-gray-900">
                        {booking.referenceNumber}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1).replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${parseFloat(booking.total).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.totalParticipants} guests
                    </p>
                  </div>
                  <Link
                    href={`/org/${slug}/bookings/${booking.id}` as Route}
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Ticket className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No bookings yet</p>
            <Link
              href={`/org/${slug}/bookings/new` as Route}
              className="mt-2 inline-block text-primary hover:underline"
            >
              Create a booking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
