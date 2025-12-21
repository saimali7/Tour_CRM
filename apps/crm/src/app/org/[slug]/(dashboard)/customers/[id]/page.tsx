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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Target,
  Zap,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "sonner";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { cn } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const customerId = params.id as string;
  const [activeTab, setActiveTab] = useState<"bookings" | "notes" | "communications">("bookings");
  const [newNote, setNewNote] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { openQuickBooking } = useQuickBookingContext();
  const utils = trpc.useUtils();

  const { data: customer, isLoading, error } = trpc.customer.getByIdWithStats.useQuery({
    id: customerId,
  });

  // Customer Intelligence data
  const { data: customerScore } = trpc.customerIntelligence.getCustomerScore.useQuery(
    { customerId },
    { enabled: !!customerId }
  );

  const { data: customerCLV } = trpc.customerIntelligence.getCustomerCLV.useQuery(
    { customerId },
    { enabled: !!customerId }
  );

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
    // Open quick booking modal with customer pre-selected
    openQuickBooking({ customerId });
  };

  // Segment styling helpers
  const getSegmentBadge = (segment?: string) => {
    if (!segment) return null;
    const styles = {
      vip: { bg: "bg-amber-500/10", text: "text-amber-600", icon: Star },
      loyal: { bg: "bg-emerald-500/10", text: "text-emerald-600", icon: TrendingUp },
      promising: { bg: "bg-blue-500/10", text: "text-blue-600", icon: Target },
      at_risk: { bg: "bg-orange-500/10", text: "text-orange-600", icon: AlertTriangle },
      dormant: { bg: "bg-gray-500/10", text: "text-gray-600", icon: Clock },
    };
    const style = styles[segment as keyof typeof styles] || styles.dormant;
    const Icon = style.icon;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", style.bg, style.text)}>
        <Icon className="h-3 w-3" />
        {segment.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const handleRebook = (booking: { tourId?: string | null; scheduleId: string }) => {
    // Open booking sheet with customer pre-selected
    openQuickBooking({ customerId, tourId: booking.tourId ?? undefined });
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
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <p className="text-destructive">Error loading customer: {error.message}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">Customer not found</p>
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
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      case "no_show":
        return "status-no-show";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xl">
                {customer.firstName?.charAt(0) ?? ""}
                {customer.lastName?.charAt(0) ?? ""}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-muted-foreground mt-1">Customer since {formatDate(customer.createdAt)}</p>
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
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Customer Intelligence Panel */}
      {(customerScore || customerCLV) && (
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Customer Insights</h2>
            {customerScore?.segment && getSegmentBadge(customerScore.segment)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Customer Score */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", getScoreColor(customerScore?.score))}>
                  {customerScore?.score ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {customerScore?.score && customerScore.score < 40 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Needs attention
                </p>
              )}
            </div>

            {/* Lifetime Value */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lifetime Value</p>
              <p className="text-3xl font-bold text-foreground">
                ${parseFloat(customerCLV?.historicalCLV ?? "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {customerCLV?.predictedCLV && parseFloat(customerCLV.predictedCLV) > 0 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +${parseFloat(customerCLV.predictedCLV).toLocaleString(undefined, { maximumFractionDigits: 0 })} predicted
                </p>
              )}
            </div>

            {/* Booking Frequency */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-3xl font-bold text-foreground">
                ${parseFloat(customerCLV?.averageOrderValue ?? "0").toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {customerCLV?.bookingFrequency && (
                <p className="text-xs text-muted-foreground">
                  {customerCLV.bookingFrequency.toFixed(1)} bookings/year
                </p>
              )}
            </div>

            {/* Days Since Last Booking */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Days Since Last</p>
              <p className={cn(
                "text-3xl font-bold",
                customerScore?.daysSinceLastBooking && customerScore.daysSinceLastBooking > 90
                  ? "text-orange-600"
                  : "text-foreground"
              )}>
                {customerScore?.daysSinceLastBooking ?? "—"}
              </p>
              {customerScore?.daysSinceLastBooking && customerScore.daysSinceLastBooking > 60 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time for outreach
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions for at-risk customers */}
          {customerScore?.segment === "at_risk" && (
            <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between">
              <p className="text-sm text-orange-600 font-medium">
                This customer is at risk of churning. Consider reaching out with a special offer.
              </p>
              <Button size="sm" variant="outline" onClick={handleQuickBook} className="gap-1">
                <Plus className="h-3 w-3" />
                Quick Book
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-xl font-semibold text-foreground">
                {customer.totalBookings ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-semibold text-foreground">
                ${parseFloat(customer.totalSpent ?? "0").toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Booking</p>
              <p className="text-xl font-semibold text-foreground">
                {customer.lastBookingAt ? formatDate(customer.lastBookingAt) : "Never"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="text-xl font-semibold text-foreground">
                {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${customer.email}`}
                  className="text-foreground hover:text-primary"
                >
                  {customer.email}
                </a>
              </div>
            </div>

            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-foreground hover:text-primary"
                  >
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {(customer.address || customer.city || customer.country) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground">
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
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="text-foreground">
                  {customer.language?.toUpperCase() || "Not set"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="text-foreground">{customer.currency || "Not set"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Tags</h2>
          {customer.tags && customer.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm",
                    tag === "vip"
                      ? "bg-amber-500/10 text-amber-600"
                      : tag === "repeat-customer"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-primary/10 text-primary"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tags</p>
          )}
        </div>
      </div>

      {/* Old Notes (from customer record - legacy) */}
      {customer.notes && (
        <div className="bg-warning/10 rounded-lg border border-warning/20 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Legacy Notes</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      {/* Tabbed Section: Bookings, Notes, Communications */}
      <div className="bg-card rounded-lg border border-border">
        {/* Tab Headers */}
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
            >
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Bookings ({bookings?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "notes"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes ({notes?.data?.length ?? 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("communications")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "communications"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
                <div className="divide-y divide-border">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/org/${slug}/bookings/${booking.id}` as Route)}
                      className="py-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-6 px-6 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-foreground">
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
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDateTime(booking.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            ${parseFloat(booking.total).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.totalParticipants} guests
                          </p>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {(booking.status === "completed" || booking.status === "cancelled") && (
                            <button
                              onClick={() => handleRebook(booking)}
                              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-accent"
                              title="Book again with same tour"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Rebook
                            </button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">No bookings yet</p>
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
                    className="flex-1 rounded-lg border border-input px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || createNoteMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`p-4 rounded-lg border ${note.isPinned ? "border-warning/30 bg-warning/10" : "border-border bg-muted"
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{note.authorName}</span>
                            <span>•</span>
                            <span>{formatDateTime(note.createdAt)}</span>
                            {note.isPinned && (
                              <>
                                <span>•</span>
                                <span className="text-warning flex items-center gap-1">
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
                            className={`p-1.5 rounded hover:bg-accent ${note.isPinned ? "text-warning" : "text-muted-foreground"
                              }`}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteNoteId(note.id)}
                            className="p-1.5 text-destructive/60 rounded hover:bg-destructive/10 hover:text-destructive"
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
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">No notes yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
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
                      className="p-4 rounded-lg border border-border bg-muted"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${comm.type === "email" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                              }`}>
                              {comm.type === "email" ? (
                                <Mail className="h-3 w-3 mr-1" />
                              ) : (
                                <Phone className="h-3 w-3 mr-1" />
                              )}
                              {comm.type.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${comm.status === "delivered" || comm.status === "opened" || comm.status === "clicked"
                              ? "bg-success/10 text-success"
                              : comm.status === "failed" || comm.status === "bounced"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-secondary text-secondary-foreground"
                              }`}>
                              {comm.status === "delivered" && <Check className="h-3 w-3 mr-1" />}
                              {comm.status === "failed" && <X className="h-3 w-3 mr-1" />}
                              {comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}
                            </span>
                          </div>
                          {comm.subject && (
                            <p className="font-medium text-foreground">{comm.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {comm.content.substring(0, 150)}
                            {comm.content.length > 150 && "..."}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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
                  <History className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">No communications yet</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
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
