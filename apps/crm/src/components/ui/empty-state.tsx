"use client";

import {
  LucideIcon,
  Inbox,
  Calendar,
  Users,
  MapPin,
  UserCheck,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// =============================================================================
// ILLUSTRATION COMPONENTS
// Simple, elegant SVG illustrations that convey meaning without external deps
// =============================================================================

function CalendarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Calendar body */}
      <rect
        x="20"
        y="20"
        width="80"
        height="65"
        rx="8"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      {/* Calendar header */}
      <rect
        x="20"
        y="20"
        width="80"
        height="18"
        rx="8"
        className="fill-primary/20"
      />
      <rect
        x="20"
        y="30"
        width="80"
        height="8"
        className="fill-primary/20"
      />
      {/* Calendar rings */}
      <circle cx="35" cy="20" r="3" className="fill-muted-foreground/40" />
      <circle cx="85" cy="20" r="3" className="fill-muted-foreground/40" />
      {/* Calendar cells */}
      <rect x="28" y="45" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="44" y="45" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="60" y="45" width="12" height="10" rx="2" className="fill-primary/30" />
      <rect x="76" y="45" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="28" y="60" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="44" y="60" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="60" y="60" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      <rect x="76" y="60" width="12" height="10" rx="2" className="fill-muted-foreground/10" />
      {/* Sparkle */}
      <circle cx="100" cy="15" r="4" className="fill-primary animate-pulse" />
    </svg>
  );
}

function UsersIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Background circles */}
      <circle cx="60" cy="50" r="35" className="fill-muted" />
      {/* Person 1 */}
      <circle cx="45" cy="40" r="12" className="fill-primary/20 stroke-primary/40" strokeWidth="2" />
      <path
        d="M30 70 C30 55 60 55 60 70"
        className="fill-primary/20 stroke-primary/40"
        strokeWidth="2"
      />
      {/* Person 2 */}
      <circle cx="75" cy="40" r="12" className="fill-primary/30 stroke-primary/50" strokeWidth="2" />
      <path
        d="M60 70 C60 55 90 55 90 70"
        className="fill-primary/30 stroke-primary/50"
        strokeWidth="2"
      />
      {/* Plus icon */}
      <circle cx="98" cy="25" r="10" className="fill-primary" />
      <path d="M98 20 V30 M93 25 H103" className="stroke-primary-foreground" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MapIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Map background */}
      <path
        d="M15 25 L40 15 L80 25 L105 15 L105 75 L80 85 L40 75 L15 85 Z"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      {/* Map fold lines */}
      <path d="M40 15 L40 75" className="stroke-border" strokeWidth="1" strokeDasharray="4 4" />
      <path d="M80 25 L80 85" className="stroke-border" strokeWidth="1" strokeDasharray="4 4" />
      {/* Location pin */}
      <path
        d="M60 30 C50 30 45 38 45 45 C45 55 60 70 60 70 C60 70 75 55 75 45 C75 38 70 30 60 30"
        className="fill-primary"
      />
      <circle cx="60" cy="45" r="6" className="fill-primary-foreground" />
      {/* Decorative dots */}
      <circle cx="30" cy="50" r="2" className="fill-muted-foreground/30" />
      <circle cx="90" cy="40" r="2" className="fill-muted-foreground/30" />
      <circle cx="25" cy="65" r="1.5" className="fill-muted-foreground/20" />
    </svg>
  );
}

function GuideIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Person with flag */}
      <circle cx="50" cy="35" r="14" className="fill-primary/20 stroke-primary/40" strokeWidth="2" />
      <path
        d="M32 80 C32 60 68 60 68 80"
        className="fill-primary/20 stroke-primary/40"
        strokeWidth="2"
      />
      {/* Flag pole */}
      <line x1="80" y1="20" x2="80" y2="75" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      {/* Flag */}
      <path
        d="M80 20 L100 30 L80 40 Z"
        className="fill-primary"
      />
      {/* Badge/checkmark */}
      <circle cx="95" cy="60" r="12" className="fill-success" />
      <path
        d="M90 60 L93 63 L100 56"
        className="stroke-primary-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Magnifying glass */}
      <circle cx="50" cy="45" r="25" className="fill-muted stroke-border" strokeWidth="3" />
      <circle cx="50" cy="45" r="18" className="fill-background stroke-muted-foreground/30" strokeWidth="2" />
      <line x1="68" y1="63" x2="90" y2="85" className="stroke-muted-foreground" strokeWidth="6" strokeLinecap="round" />
      {/* Question marks / dots */}
      <circle cx="42" cy="45" r="2" className="fill-muted-foreground/40" />
      <circle cx="50" cy="45" r="2" className="fill-muted-foreground/40" />
      <circle cx="58" cy="45" r="2" className="fill-muted-foreground/40" />
    </svg>
  );
}

// =============================================================================
// SUGGESTION CARD
// Quick action cards for empty states
// =============================================================================

interface SuggestionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export function SuggestionCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
}: SuggestionCardProps) {
  const content = (
    <>
      <div className="p-2 rounded-lg bg-primary/10 text-primary mb-3 transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </>
  );

  const className = cn(
    "group flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card",
    "hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  );

  if (href) {
    return (
      <Link href={href as Route} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}

// =============================================================================
// MAIN EMPTY STATE
// The primary empty state component with illustrations
// =============================================================================

type IllustrationType = 'calendar' | 'users' | 'map' | 'guide' | 'search' | 'generic';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  suggestions?: SuggestionCardProps[];
  className?: string;
  /** Show encouraging tips for first-time users */
  showTip?: boolean;
  tipText?: string;
}

const illustrationMap: Record<IllustrationType, React.FC<{ className?: string }>> = {
  calendar: CalendarIllustration,
  users: UsersIllustration,
  map: MapIllustration,
  guide: GuideIllustration,
  search: SearchIllustration,
  generic: CalendarIllustration,
};

export function EmptyState({
  icon: Icon = Inbox,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  suggestions,
  className,
  showTip = false,
  tipText,
}: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrationMap[illustration] : null;
  const ActionIcon = action?.icon || Plus;

  return (
    <div
      className={cn("space-y-6 animate-in fade-in duration-500 empty-state", className)}
      role="region"
      aria-label={title}
      data-testid="empty-state"
    >
      {/* Suggestion cards */}
      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard key={index} {...suggestion} />
          ))}
        </div>
      )}

      {/* Main empty state */}
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {/* Illustration or Icon */}
        <div className="relative mb-8 animate-in zoom-in-50 duration-500 delay-100">
          {IllustrationComponent ? (
            <div className="w-32 h-24">
              <IllustrationComponent />
            </div>
          ) : (
            <>
              {/* Animated gradient background circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-xl animate-pulse" />
              <div className="relative rounded-full bg-gradient-to-br from-muted to-muted/50 p-6 ring-1 ring-border/50 shadow-sm">
                <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
              </div>
            </>
          )}
        </div>

        {/* Title and description */}
        <h3 className="text-xl font-semibold text-foreground mb-2 animate-in slide-in-from-bottom-2 duration-500 delay-150">
          {title}
        </h3>
        <p className="text-muted-foreground max-w-md mb-6 leading-relaxed animate-in slide-in-from-bottom-2 duration-500 delay-200">
          {description}
        </p>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center gap-3 animate-in slide-in-from-bottom-2 duration-500 delay-300">
            {action && (
              action.href ? (
                <Button asChild className="gap-2 px-6 py-3">
                  <Link href={action.href as Route}>
                    <ActionIcon className="h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </Link>
                </Button>
              ) : (
                <Button onClick={action.onClick} className="gap-2 px-6 py-3">
                  <ActionIcon className="h-4 w-4" aria-hidden="true" />
                  {action.label}
                </Button>
              )
            )}
            {secondaryAction && (
              secondaryAction.href ? (
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link href={secondaryAction.href as Route}>
                    {secondaryAction.label}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={secondaryAction.onClick}
                  className="gap-1.5"
                >
                  {secondaryAction.label}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Button>
              )
            )}
          </div>
        )}

        {/* Tip for first-time users */}
        {showTip && (
          <div className="mt-8 flex items-start gap-2 max-w-sm text-left p-3 rounded-lg bg-muted/50 animate-in fade-in duration-500 delay-500">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">
              {tipText || "Takes less than 2 minutes to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PRE-CONFIGURED EMPTY STATES
// Ready-to-use empty states for common scenarios
// =============================================================================

export function NoBookingsEmpty({
  orgSlug,
  onCreateBooking
}: {
  orgSlug: string;
  onCreateBooking?: () => void;
}) {
  return (
    <EmptyState
      illustration="calendar"
      title="Ready to take your first booking"
      description="Create a booking to see your schedule come to life. All booking data syncs in real-time across your dashboard."
      action={onCreateBooking ? {
        label: "Create First Booking",
        onClick: onCreateBooking,
      } : {
        label: "Create First Booking",
        href: `/org/${orgSlug}/bookings`,
      }}
      showTip
      tipText="Your first booking celebration awaits!"
    />
  );
}

export function NoCustomersEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      illustration="users"
      title="Build your customer database"
      description="Add customers to track their bookings, preferences, and lifetime value. Watch your CRM insights grow with every entry."
      action={{
        label: "Add First Customer",
        href: `/org/${orgSlug}/customers/new`,
      }}
      showTip
      tipText="Customer data powers personalized experiences"
    />
  );
}

export function NoToursEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      illustration="map"
      title="Create your first tour experience"
      description="Design unforgettable tour experiences with pricing, capacity, and scheduling all in one place."
      action={{
        label: "Create Your First Tour",
        href: `/org/${orgSlug}/tours/new`,
      }}
      showTip
      tipText="Tours are the heart of your business"
    />
  );
}

export function NoSchedulesEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      illustration="calendar"
      title="Start taking bookings"
      description="Active tours can be booked immediately. Add tours and publish them to create upcoming tour runs."
      action={{
        label: "Create First Tour",
        href: `/org/${orgSlug}/tours/new`,
      }}
      showTip
      tipText="Publishing a tour makes it bookable"
    />
  );
}

export function NoGuidesEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      illustration="guide"
      title="Add your tour guides"
      description="Bring your team onboard. Assign guides to tours and manage dispatch effortlessly."
      action={{
        label: "Add First Guide",
        href: `/org/${orgSlug}/guides/new`,
      }}
      showTip
      tipText="Great guides create unforgettable experiences"
    />
  );
}

export function NoResultsEmpty({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      illustration="search"
      icon={Search}
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search or filters.`}
    />
  );
}
