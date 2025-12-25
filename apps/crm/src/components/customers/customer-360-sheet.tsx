"use client";

import { useState, useRef, useEffect } from "react";
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
  Pencil,
  Check,
  X,
  Tag,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useQuickBookingContext } from "@/components/bookings/quick-booking-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Inline editable field component
function InlineEditField({
  value,
  onSave,
  icon: Icon,
  placeholder,
  type = "text",
  isSaving,
}: {
  value: string | null | undefined;
  onSave: (value: string) => void;
  icon: typeof Mail;
  placeholder: string;
  type?: "text" | "email" | "tel";
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="h-7 text-sm flex-1"
          disabled={isSaving}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-emerald-500 hover:bg-accent rounded transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm group">
      <div className="flex items-center gap-2 text-muted-foreground flex-1 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{value || <span className="italic">Not set</span>}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        {value && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(value);
              toast.success(`${placeholder} copied`);
            }}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Inline tag adder component
function TagAdder({
  existingTags,
  onAddTag,
}: {
  existingTags: string[];
  onAddTag: (tag: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !existingTags.includes(tag)) {
      onAddTag(tag);
      setNewTag("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setNewTag("");
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!newTag.trim()) setIsAdding(false);
          }}
          placeholder="new tag"
          className="h-5 w-20 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          className="p-0.5 text-emerald-500 hover:bg-accent rounded transition-colors"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            setNewTag("");
            setIsAdding(false);
          }}
          className="p-0.5 text-muted-foreground hover:bg-muted rounded transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Plus className="h-3 w-3" />
      Add tag
    </button>
  );
}

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

  // Update customer mutation for inline editing
  const updateCustomerMutation = trpc.customer.update.useMutation({
    onSuccess: () => {
      utils.customer.getByIdWithStats.invalidate({ id: customerId });
      utils.customer.list.invalidate();
      toast.success("Customer updated");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleUpdateField = (field: string, value: string) => {
    updateCustomerMutation.mutate({
      id: customerId,
      data: { [field]: value || null },
    });
  };

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
            <SheetHeader>
              <SheetTitle className="sr-only">Loading customer details</SheetTitle>
            </SheetHeader>
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

              {/* Tags - Editable */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {(customer.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs group/tag",
                        tag === "vip"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tag}
                      <button
                        onClick={() => {
                          const newTags = (customer.tags || []).filter(t => t !== tag);
                          updateCustomerMutation.mutate({
                            id: customerId,
                            data: { tags: newTags },
                          });
                        }}
                        className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
                        title="Remove tag"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <TagAdder
                    existingTags={customer.tags || []}
                    onAddTag={(tag) => {
                      const newTags = [...(customer.tags || []), tag];
                      updateCustomerMutation.mutate({
                        id: customerId,
                        data: { tags: newTags },
                      });
                    }}
                  />
                </div>
              </div>
            </SheetHeader>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  openQuickBooking({ customerId });
                }}
              >
                <Plus className="h-4 w-4" />
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

            {/* Contact Info - Inline Editable */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Contact</h4>
                <span className="text-[10px] text-muted-foreground">Click to edit</span>
              </div>
              <div className="space-y-2">
                <InlineEditField
                  value={customer.email}
                  onSave={(value) => handleUpdateField("email", value)}
                  icon={Mail}
                  placeholder="Email"
                  type="email"
                  isSaving={updateCustomerMutation.isPending}
                />
                <InlineEditField
                  value={customer.phone}
                  onSave={(value) => handleUpdateField("phone", value)}
                  icon={Phone}
                  placeholder="Phone"
                  type="tel"
                  isSaving={updateCustomerMutation.isPending}
                />
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
            <SheetHeader>
              <SheetTitle className="sr-only">Customer not found</SheetTitle>
            </SheetHeader>
            Customer not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
