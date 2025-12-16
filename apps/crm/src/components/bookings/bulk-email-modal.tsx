"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, Loader2, FileText, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type EmailTemplateType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_modification"
  | "booking_cancellation"
  | "schedule_cancellation"
  | "review_request"
  | "custom";

interface BulkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBookings: Array<{
    id: string;
    referenceNumber: string;
    customer?: { firstName: string; lastName: string; email?: string | null } | null;
    tour?: { name: string } | null;
  }>;
  onSuccess: () => void;
}

const EMAIL_TEMPLATES: Array<{
  value: EmailTemplateType;
  label: string;
  description: string;
}> = [
  {
    value: "booking_confirmation",
    label: "Booking Confirmation",
    description: "Send booking confirmation details",
  },
  {
    value: "booking_reminder",
    label: "Booking Reminder",
    description: "Remind customers about their upcoming tour",
  },
  {
    value: "booking_modification",
    label: "Booking Modification",
    description: "Notify about changes to their booking",
  },
  {
    value: "review_request",
    label: "Review Request",
    description: "Request a review after tour completion",
  },
  {
    value: "custom",
    label: "Custom Message",
    description: "Send a custom email message",
  },
];

export function BulkEmailModal({
  open,
  onOpenChange,
  selectedBookings,
  onSuccess,
}: BulkEmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | "">("");
  const [customSubject, setCustomSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // Filter bookings with valid email addresses
  const bookingsWithEmail = selectedBookings.filter((b) => b.customer?.email);
  const bookingsWithoutEmail = selectedBookings.filter((b) => !b.customer?.email);

  const sendBulkEmailMutation = trpc.communication.sendBulkEmail.useMutation({
    onSuccess: (result) => {
      if (result.totalErrors === 0) {
        toast.success(`Email sent to ${result.totalSent} customers`);
      } else {
        toast.warning(
          `${result.totalSent} sent, ${result.totalErrors} failed`
        );
      }
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to send emails: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedTemplate("");
    setCustomSubject("");
    setCustomMessage("");
  };

  const handleSubmit = () => {
    if (!selectedTemplate) {
      toast.error("Please select an email template");
      return;
    }

    if (selectedTemplate === "custom" && !customSubject) {
      toast.error("Please enter a subject for your custom email");
      return;
    }

    sendBulkEmailMutation.mutate({
      bookingIds: bookingsWithEmail.map((b) => b.id),
      templateType: selectedTemplate,
      customSubject: selectedTemplate === "custom" ? customSubject : undefined,
      customMessage: selectedTemplate === "custom" ? customMessage : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email to {bookingsWithEmail.length} Customers
          </DialogTitle>
          <DialogDescription>
            Select a template and send bulk emails to customers with valid email addresses.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Warning for bookings without email */}
          {bookingsWithoutEmail.length > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <p className="text-sm text-warning">
                {bookingsWithoutEmail.length} booking(s) will be skipped (no email address)
              </p>
            </div>
          )}

          {/* Recipients summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Recipients</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {bookingsWithEmail.slice(0, 4).map((booking) => (
                <div key={booking.id} className="flex items-center gap-2 text-sm">
                  <span className="text-foreground">
                    {booking.customer?.firstName} {booking.customer?.lastName}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({booking.customer?.email})
                  </span>
                </div>
              ))}
              {bookingsWithEmail.length > 4 && (
                <p className="text-sm text-muted-foreground">
                  ...and {bookingsWithEmail.length - 4} more
                </p>
              )}
            </div>
          </div>

          {/* Template selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email Template
            </label>
            <div className="space-y-2">
              {EMAIL_TEMPLATES.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  onClick={() => setSelectedTemplate(template.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedTemplate === template.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{template.label}</span>
                      {selectedTemplate === template.value && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom message fields */}
          {selectedTemplate === "custom" && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Subject <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Message
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{customer_name}"}, {"{booking_reference}"}, {"{tour_name}"}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            className="px-4 py-2 text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedTemplate ||
              bookingsWithEmail.length === 0 ||
              (selectedTemplate === "custom" && !customSubject) ||
              sendBulkEmailMutation.isPending
            }
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {sendBulkEmailMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send {bookingsWithEmail.length} Emails
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
