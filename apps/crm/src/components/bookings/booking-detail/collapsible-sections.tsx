"use client";

import { useState, useMemo } from "react";
import {
  Users,
  User,
  Baby,
  UserPlus,
  UserX,
  Utensils,
  Accessibility,
  CheckCircle,
  CreditCard,
  DollarSign,
  History,
  Clock,
  AlertTriangle,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";
import { Button, Badge } from "@tour/ui";
import { cn } from "@/lib/utils";
import {
  CollapsibleSection,
  SectionContent,
  SectionList,
  SectionListItem,
  SectionEmptyState,
  SectionGrid,
  type SectionVariant,
} from "@/components/ui/collapsible-section";
import type {
  BookingData,
  BookingParticipant,
  BookingGuideAssignment,
  BalanceInfo,
} from "./types";

// ============================================================================
// GUESTS SECTION
// ============================================================================
// Shows guest count summary, expands to participant details with dietary/accessibility

interface GuestsSectionProps {
  booking: BookingData;
  participants: BookingParticipant[] | null;
  className?: string;
}

export function GuestsSection({
  booking,
  participants = booking.participants,
  className,
}: GuestsSectionProps) {
  const adultCount = booking.adultCount || 0;
  const childCount = booking.childCount || 0;
  const infantCount = booking.infantCount || 0;

  // Detect special needs
  const participantsWithNeeds = useMemo(
    () =>
      participants?.filter(
        (p) => p.dietaryRequirements || p.accessibilityNeeds
      ) || [],
    [participants]
  );
  const hasSpecialNeeds = participantsWithNeeds.length > 0;

  // Determine variant based on special needs
  const variant: SectionVariant = hasSpecialNeeds ? "important" : "default";

  // Build summary line
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (adultCount > 0) parts.push(`${adultCount} adult${adultCount !== 1 ? "s" : ""}`);
    if (childCount > 0) parts.push(`${childCount} child${childCount !== 1 ? "ren" : ""}`);
    if (infantCount > 0) parts.push(`${infantCount} infant${infantCount !== 1 ? "s" : ""}`);

    let summaryText = parts.join(", ");
    if (hasSpecialNeeds) {
      summaryText += ` - ${participantsWithNeeds.length} special need${participantsWithNeeds.length !== 1 ? "s" : ""}`;
    }
    return summaryText;
  }, [adultCount, childCount, infantCount, hasSpecialNeeds, participantsWithNeeds.length]);

  const badge = (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
      {booking.totalParticipants}
    </span>
  );

  return (
    <CollapsibleSection
      title="Guests"
      icon={Users}
      summary={summary}
      badge={badge}
      variant={variant}
      priority={hasSpecialNeeds ? "high" : "medium"}
      defaultOpen={hasSpecialNeeds}
      className={className}
    >
      {participants && participants.length > 0 ? (
        <SectionList>
          {participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} />
          ))}
        </SectionList>
      ) : (
        <SectionContent>
          <div className="text-sm text-muted-foreground">
            No participant details recorded
          </div>
        </SectionContent>
      )}
    </CollapsibleSection>
  );
}

function ParticipantRow({ participant }: { participant: BookingParticipant }) {
  const hasNeeds = participant.dietaryRequirements || participant.accessibilityNeeds;

  return (
    <SectionListItem highlight={!!hasNeeds}>
      <div className="flex items-start justify-between gap-3">
        {/* Participant Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {participant.firstName} {participant.lastName}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                participant.type === "adult" && "bg-muted text-muted-foreground",
                participant.type === "child" && "bg-info/10 text-info",
                participant.type === "infant" && "bg-info/10 text-info"
              )}
            >
              {participant.type}
            </span>
          </div>
          {participant.email && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {participant.email}
            </p>
          )}
        </div>

        {/* Special Needs Indicators */}
        {hasNeeds ? (
          <div className="flex flex-col items-end gap-1">
            {participant.dietaryRequirements && (
              <div className="flex items-center gap-1.5 text-xs text-warning dark:text-warning">
                <Utensils className="h-3.5 w-3.5" />
                <span className="font-medium">{participant.dietaryRequirements}</span>
              </div>
            )}
            {participant.accessibilityNeeds && (
              <div className="flex items-center gap-1.5 text-xs text-warning dark:text-warning">
                <Accessibility className="h-3.5 w-3.5" />
                <span className="font-medium">{participant.accessibilityNeeds}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-success dark:text-success">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>No special needs</span>
          </div>
        )}
      </div>
    </SectionListItem>
  );
}

// ============================================================================
// GUIDE SECTION
// ============================================================================
// Shows assigned guide or "Assign" CTA, expands to guide details/history

interface GuideSectionProps {
  guideAssignments: BookingGuideAssignment[] | null | undefined;
  bookingStatus: string;
  onAssignGuide?: () => void;
  onRemoveAssignment?: (id: string, guideName: string) => void;
  className?: string;
}

export function GuideSection({
  guideAssignments,
  bookingStatus,
  onAssignGuide,
  onRemoveAssignment,
  className,
}: GuideSectionProps) {
  const hasAssignments = guideAssignments && guideAssignments.length > 0;
  const isEditable = bookingStatus !== "completed" && bookingStatus !== "cancelled";

  // Build summary
  const summary = useMemo(() => {
    if (!hasAssignments || !guideAssignments || guideAssignments.length === 0) {
      return "No guide assigned";
    }
    if (guideAssignments.length === 1) {
      const firstAssignment = guideAssignments[0];
      const guide = firstAssignment?.guide;
      return guide ? `${guide.firstName} ${guide.lastName}` : "Guide assigned";
    }
    return `${guideAssignments.length} guides assigned`;
  }, [hasAssignments, guideAssignments]);

  const variant: SectionVariant = hasAssignments ? "default" : "empty";

  const badge = hasAssignments ? (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
      {guideAssignments.length}
    </span>
  ) : null;

  const headerAction = isEditable ? (
    <Button
      size="sm"
      variant="outline"
      onClick={onAssignGuide}
      className="gap-1.5 h-7 text-xs"
    >
      <UserPlus className="h-3 w-3" />
      {hasAssignments ? "Add" : "Assign"}
    </Button>
  ) : null;

  return (
    <CollapsibleSection
      title="Guide"
      icon={User}
      summary={summary}
      badge={badge}
      variant={variant}
      headerAction={headerAction}
      disabled={!hasAssignments}
      className={className}
    >
      {hasAssignments ? (
        <SectionList>
          {guideAssignments.map((assignment) => (
            <SectionListItem key={assignment.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium text-sm">
                      {assignment.guide?.firstName?.charAt(0)}
                      {assignment.guide?.lastName?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {assignment.guide?.firstName} {assignment.guide?.lastName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {assignment.guide?.email && <span>{assignment.guide.email}</span>}
                      <Badge
                        variant={
                          assignment.status === "confirmed" ? "success" :
                          assignment.status === "pending" ? "warning" : "destructive"
                        }
                        className="text-xs"
                      >
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                {isEditable && onRemoveAssignment && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      onRemoveAssignment(
                        assignment.id,
                        `${assignment.guide?.firstName} ${assignment.guide?.lastName}`
                      )
                    }
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </SectionListItem>
          ))}
        </SectionList>
      ) : (
        <SectionEmptyState
          icon={UserPlus}
          message="No guide assigned"
          action={
            isEditable && onAssignGuide ? (
              <Button size="sm" variant="outline" onClick={onAssignGuide}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Assign Guide
              </Button>
            ) : undefined
          }
        />
      )}
    </CollapsibleSection>
  );
}

// ============================================================================
// PAYMENTS SECTION
// ============================================================================
// Shows balance summary, expands to payment history

interface Payment {
  id: string;
  amount: string;
  method: string;
  recordedAt: Date;
  reference?: string | null;
}

interface PaymentsSectionProps {
  balanceInfo: BalanceInfo | null;
  payments: Payment[] | null | undefined;
  onRecordPayment?: () => void;
  onDeletePayment?: (id: string) => void;
  className?: string;
}

export function PaymentsSection({
  balanceInfo,
  payments,
  onRecordPayment,
  onDeletePayment,
  className,
}: PaymentsSectionProps) {
  const total = parseFloat(balanceInfo?.total || "0");
  const totalPaid = parseFloat(balanceInfo?.totalPaid || "0");
  const balance = parseFloat(balanceInfo?.balance || "0");
  const hasPayments = payments && payments.length > 0;
  const isPaid = balance === 0 && total > 0;
  const hasBalance = balance > 0;

  // Build summary
  const summary = useMemo(() => {
    if (isPaid) return `$${total.toFixed(2)} paid in full`;
    if (hasBalance) return `$${balance.toFixed(2)} due of $${total.toFixed(2)}`;
    return "No payment information";
  }, [isPaid, hasBalance, total, balance]);

  const variant: SectionVariant = isPaid ? "success" : hasBalance ? "warning" : "default";

  const badge = hasPayments ? (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
      {payments.length}
    </span>
  ) : null;

  const headerAction = hasBalance && onRecordPayment ? (
    <Button
      size="sm"
      variant="outline"
      onClick={onRecordPayment}
      className="gap-1.5 h-7 text-xs border-warning text-warning hover:bg-warning dark:border-warning dark:text-warning dark:hover:bg-warning"
    >
      <CreditCard className="h-3 w-3" />
      Collect
    </Button>
  ) : null;

  return (
    <CollapsibleSection
      title="Payments"
      icon={CreditCard}
      summary={summary}
      badge={badge}
      variant={variant}
      headerAction={headerAction}
      disabled={!hasPayments && !hasBalance}
      className={className}
    >
      <SectionContent padding="compact">
        {/* Payment breakdown */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono tabular-nums font-medium">${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-success dark:text-success">
            <span>Paid</span>
            <span className="font-mono tabular-nums font-medium">${totalPaid.toFixed(2)}</span>
          </div>
          <div
            className={cn(
              "flex justify-between font-bold pt-2 border-t border-border",
              hasBalance ? "text-warning dark:text-warning" : "text-success dark:text-success"
            )}
          >
            <span>Balance</span>
            <span className="font-mono tabular-nums">${balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isPaid ? "bg-success" : "bg-warning"
              )}
              style={{ width: `${Math.min((totalPaid / total) * 100, 100)}%` }}
            />
          </div>
        )}

        {/* Payment history */}
        {hasPayments && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Payment History
            </p>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium font-mono tabular-nums">
                      ${parseFloat(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.method.replace("_", " ")} -{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(payment.recordedAt))}
                    </p>
                  </div>
                  {onDeletePayment && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeletePayment(payment.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionContent>
    </CollapsibleSection>
  );
}

// ============================================================================
// ACTIVITY SECTION
// ============================================================================
// Shows latest activity, expands to full timeline

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  actorName?: string | null;
  actorType?: string;
}

interface ActivitySectionProps {
  activities: ActivityItem[] | null | undefined;
  isLoading?: boolean;
  className?: string;
}

export function ActivitySection({
  activities,
  isLoading = false,
  className,
}: ActivitySectionProps) {
  const hasActivities = activities && activities.length > 0;
  const latestActivity = hasActivities ? activities[0] : null;

  // Build summary from latest activity
  const summary = useMemo(() => {
    if (isLoading) return "Loading activity...";
    if (!latestActivity) return "No activity recorded";
    return latestActivity.description;
  }, [isLoading, latestActivity]);

  const badge = hasActivities ? (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
      {activities.length}
    </span>
  ) : null;

  return (
    <CollapsibleSection
      title="Activity"
      icon={History}
      summary={summary}
      badge={badge}
      variant="default"
      disabled={!hasActivities}
      className={className}
    >
      {hasActivities ? (
        <SectionContent padding="none">
          <div className="p-4 sm:p-5">
            <ul className="-mb-4">
              {activities.slice(0, 10).map((activity, idx) => {
                const isLast = idx === Math.min(activities.length - 1, 9);
                return (
                  <li key={activity.id} className="relative pb-4">
                    {!isLast && (
                      <span
                        className="absolute left-3 top-6 -ml-px h-full w-0.5 bg-border"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-4 ring-card">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          {activity.description}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {activity.actorName || (activity.actorType === "system" ? "System" : "Unknown")}
                          {" - "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(activity.createdAt))}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </SectionContent>
      ) : (
        <SectionEmptyState
          icon={History}
          message="No activity recorded yet"
        />
      )}
    </CollapsibleSection>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type GuestsSectionProps,
  type GuideSectionProps,
  type PaymentsSectionProps,
  type ActivitySectionProps,
};
