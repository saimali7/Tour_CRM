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
  MessageSquare,
  Pin,
  Trash2,
  Send,
  History,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const customerId = params.id as string;
  const [activeTab, setActiveTab] = useState<"bookings" | "notes" | "communications">("bookings");
  const [newNote, setNewNote] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: customer, isLoading, error } = trpc.customer.getByIdWithStats.useQuery({
    id: customerId,
  });

  const { data: bookings } = trpc.customer.getBookings.useQuery({ id: customerId });

  const { data: notes } = trpc.customerNote.list.useQuery({
    customerId,
    pagination: { limit: 50 },
  });

  const { data: communications } = trpc.communication.getCustomerCommunications.useQuery({
    customerId,
    limit: 50,
  });

  const createNoteMutation = trpc.customerNote.create.useMutation({
    onSuccess: () => {
      utils.customerNote.list.invalidate({ customerId });
      setNewNote("");
      toast.success("Note added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add note");
    },
  });

  const togglePinMutation = trpc.customerNote.togglePin.useMutation({
    onSuccess: (_, variables) => {
      utils.customerNote.list.invalidate({ customerId });
      toast.success("Note updated");
    },
  });

  const deleteNoteMutation = trpc.customerNote.delete.useMutation({
    onSuccess: () => {
      utils.customerNote.list.invalidate({ customerId });
      setDeleteNoteId(null);
      toast.success("Note deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete note");
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNoteMutation.mutate({
      customerId,
      content: newNote.trim(),
    });
  };

  const handleTogglePin = (noteId: string) => {
    togglePinMutation.mutate({ id: noteId });
  };

  const handleDeleteNote = () => {
    if (deleteNoteId) {
      deleteNoteMutation.mutate({ id: deleteNoteId });
    }
  };

  const handleQuickBook = () => {
    // Navigate to booking form with customer pre-selected
    router.push(`/org/${slug}/bookings/new?customerId=${customerId}` as Route);
  };

  const handleRebook = (booking: { tourId?: string | null; scheduleId: string }) => {
    // Navigate to booking form with customer pre-selected
    // Note: A full rebook feature would clone participants, but this is a simpler version
    router.push(`/org/${slug}/bookings/new?customerId=${customerId}` as Route);
  };

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

        <div className="flex items-center gap-2">
          <Button onClick={handleQuickBook} className="gap-2">
            <Plus className="h-4 w-4" />
            Quick Book
          </Button>
          <Link
            href={`/org/${slug}/customers/${customer.id}/edit` as Route}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
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

      {/* Old Notes (from customer record - legacy) */}
      {customer.notes && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Legacy Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      {/* Tabbed Section: Bookings, Notes, Communications */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "bookings"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Bookings ({bookings?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes ({notes?.data?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("communications")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "communications"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Communications ({communications?.length ?? 0})
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <>
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
                        <div className="flex items-center gap-2">
                          {(booking.status === "completed" || booking.status === "cancelled") && (
                            <button
                              onClick={() => handleRebook(booking)}
                              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary px-2 py-1 rounded hover:bg-gray-100"
                              title="Book again with same tour"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Rebook
                            </button>
                          )}
                          <Link
                            href={`/org/${slug}/bookings/${booking.id}` as Route}
                            className="text-primary hover:underline text-sm"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No bookings yet</p>
                  <Button onClick={handleQuickBook} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Booking
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <>
              {/* Add Note Form */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this customer..."
                    rows={2}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || createNoteMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Notes List */}
              {notes?.data && notes.data.length > 0 ? (
                <div className="space-y-4">
                  {notes.data.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border ${
                        note.isPinned ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>{note.authorName}</span>
                            <span>•</span>
                            <span>{formatDateTime(note.createdAt)}</span>
                            {note.isPinned && (
                              <>
                                <span>•</span>
                                <span className="text-yellow-600 flex items-center gap-1">
                                  <Pin className="h-3 w-3" />
                                  Pinned
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-1.5 rounded hover:bg-gray-200 ${
                              note.isPinned ? "text-yellow-600" : "text-gray-400"
                            }`}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteNoteId(note.id)}
                            className="p-1.5 text-red-400 rounded hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No notes yet</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Add notes to keep track of customer interactions
                  </p>
                </div>
              )}
            </>
          )}

          {/* Communications Tab */}
          {activeTab === "communications" && (
            <>
              {communications && communications.length > 0 ? (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              comm.type === "email" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                              {comm.type === "email" ? (
                                <Mail className="h-3 w-3 mr-1" />
                              ) : (
                                <Phone className="h-3 w-3 mr-1" />
                              )}
                              {comm.type.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              comm.status === "delivered" || comm.status === "opened" || comm.status === "clicked"
                                ? "bg-green-100 text-green-700"
                                : comm.status === "failed" || comm.status === "bounced"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {comm.status === "delivered" && <Check className="h-3 w-3 mr-1" />}
                              {comm.status === "failed" && <X className="h-3 w-3 mr-1" />}
                              {comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}
                            </span>
                          </div>
                          {comm.subject && (
                            <p className="font-medium text-gray-900">{comm.subject}</p>
                          )}
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {comm.content.substring(0, 150)}
                            {comm.content.length > 150 && "..."}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDateTime(comm.createdAt)}</span>
                            {comm.templateName && (
                              <>
                                <span>•</span>
                                <span>Template: {comm.templateName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-gray-500">No communications yet</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Email and SMS history will appear here
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Note Confirmation Modal */}
      <ConfirmModal
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteNote}
        isLoading={deleteNoteMutation.isPending}
      />
    </div>
  );
}
