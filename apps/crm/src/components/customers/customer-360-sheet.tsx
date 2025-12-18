"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Copy,
  ExternalLink,
  Plus,
  MessageSquare,
  BookOpen,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  Send,
  Crown,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Customer360SheetProps {
  customerId: string;
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEGMENT_CONFIG = {
  vip: { color: "bg-amber-500", text: "text-amber-600", label: "VIP", icon: Crown },
  loyal: { color: "bg-emerald-500", text: "text-emerald-600", label: "Loyal", icon: Star },
  promising: { color: "bg-blue-500", text: "text-blue-600", label: "Promising", icon: TrendingUp },
  at_risk: { color: "bg-orange-500", text: "text-orange-600", label: "At Risk", icon: AlertTriangle },
  dormant: { color: "bg-gray-400", text: "text-gray-500", label: "Dormant", icon: Clock },
} as const;

type TimelineFilter = "all" | "bookings" | "communications" | "notes";

export function Customer360Sheet({
  customerId,
  orgSlug,
  open,
  onOpenChange,
}: Customer360SheetProps) {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [newNote, setNewNote] = useState("");
  const { openQuickBooking } = useQuickBookingContext();

  const utils = trpc.useUtils();

  // Fetch customer with stats
  const { data: customer, isLoading: customerLoading } =
    trpc.customer.getByIdWithStats.useQuery({ id: customerId }, { enabled: open });

  // Fetch customer score/segment
  const { data: customerScore, isLoading: scoreLoading } =
    trpc.customer.getCustomerWithScore.useQuery({ id: customerId }, { enabled: open });

  // Fetch customer bookings
  const { data: bookings, isLoading: bookingsLoading } =
    trpc.customer.getBookings.useQuery({ id: customerId }, { enabled: open });

  // Fetch customer notes
  const { data: notes, isLoading: notesLoading } =
    trpc.customerNote.list.useQuery(
      { customerId, pagination: { limit: 10 } },
      { enabled: open }
    );

  // Fetch customer communications
  const { data: communications, isLoading: commsLoading } =
    trpc.communication.getCustomerCommunications.useQuery(
      { customerId, limit: 10 },
      { enabled: open }
    );

  // Add note mutation
  const addNoteMutation = trpc.customerNote.create.useMutation({
    onSuccess: () => {
      utils.customerNote.list.invalidate({ customerId });
      setNewNote("");
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isLoading = customerLoading || scoreLoading;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      customerId,
      content: newNote.trim(),
    });
  };

  // Build timeline from bookings, communications, and notes
  const timelineItems = (() => {
    const items: Array<{
      id: string;
      type: "booking" | "communication" | "note";
      date: Date;
      title: string;
      description: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Add bookings
    if (bookings && (timelineFilter === "all" || timelineFilter === "bookings")) {
      bookings.forEach((booking) => {
        items.push({
          id: `booking-${booking.id}`,
          type: "booking",
          date: new Date(booking.createdAt),
          title: `Booking #${booking.referenceNumber || booking.id.slice(-6)}`,
          description: `${booking.status} - $${parseFloat(booking.total || "0").toFixed(0)}`,
          metadata: { bookingId: booking.id, status: booking.status },
        });
      });
    }

    // Add communications
    if (communications && (timelineFilter === "all" || timelineFilter === "communications")) {
      communications.forEach((comm) => {
        items.push({
          id: `comm-${comm.id}`,
          type: "communication",
          date: new Date(comm.createdAt),
          title: comm.subject || (comm.type === "email" ? "Email sent" : "SMS sent"),
          description: comm.type,
          metadata: { status: comm.status },
        });
      });
    }

    // Add notes
    if (notes?.data && (timelineFilter === "all" || timelineFilter === "notes")) {
      notes.data.forEach((note) => {
        items.push({
          id: `note-${note.id}`,
          type: "note",
          date: new Date(note.createdAt),
          title: "Note",
          description: note.content,
          metadata: { authorName: note.authorName },
        });
      });
    }

    // Sort by date descending
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  })();

  const segment = customerScore?.segment;
  const segmentConfig = segment ? SEGMENT_CONFIG[segment] : null;
  const SegmentIcon = segmentConfig?.icon || Star;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        ) : customer ? (
          <div className="space-y-6">
            {/* Header */}
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">
                    {customer.firstName} {customer.lastName}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Customer since {format(new Date(customer.createdAt), "MMMM yyyy")}
                  </p>
                </div>
                {segmentConfig && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      segmentConfig.color.replace("bg-", "bg-opacity-10 bg-"),
                      segmentConfig.text
                    )}
                  >
                    <SegmentIcon className="h-3.5 w-3.5" />
                    {segmentConfig.label}
                    {customerScore?.score && (
                      <span className="ml-1">({customerScore.score})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </SheetHeader>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  openQuickBooking({ customerId });
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Booking
              </Button>
              {customer.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${customer.email}`, "_blank")}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Email
                </Button>
              )}
              {customer.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${customer.phone}`, "_blank")}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
              )}
            </div>

            {/* Contact Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Contact</h4>
              <div className="space-y-2">
                {customer.email && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{customer.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleCopy(customer.email!, "Email")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleCopy(customer.phone!, "Phone")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {(customer.city || customer.country) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {[customer.city, customer.state, customer.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-lg border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold text-foreground">
                  {customer.totalBookings || 0}
                </p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  ${parseFloat(customer.totalSpent || "0").toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold text-foreground">
                  ${customer.totalBookings && customer.totalBookings > 0
                    ? (
                        parseFloat(customer.totalSpent || "0") / customer.totalBookings
                      ).toFixed(0)
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Order</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Activity Timeline</h4>
                <div className="flex gap-1">
                  {(["all", "bookings", "communications", "notes"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimelineFilter(filter)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md transition-colors",
                        timelineFilter === filter
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {timelineItems.length > 0 ? (
                  timelineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          item.type === "booking" && "bg-blue-500/10",
                          item.type === "communication" && "bg-purple-500/10",
                          item.type === "note" && "bg-amber-500/10"
                        )}
                      >
                        {item.type === "booking" && (
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        )}
                        {item.type === "communication" && (
                          <Mail className="h-4 w-4 text-purple-600" />
                        )}
                        {item.type === "note" && (
                          <MessageSquare className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(item.date, { addSuffix: true })}
                        </p>
                      </div>
                      {item.type === "booking" && item.metadata?.status === "confirmed" && (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity to show
                  </p>
                )}
              </div>
            </div>

            {/* Add Note */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Add Note</h4>
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note about this customer..."
                  className="flex-1 min-h-[60px] px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  {addNoteMutation.isPending ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>

            {/* View Full Profile */}
            <div className="pt-4 border-t border-border">
              <Link
                href={`/org/${orgSlug}/customers/${customerId}` as Route}
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Full Customer Profile
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Customer not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
