// Design tokens for the booking detail page
// Ensures consistency across all booking-detail components

export const typography = {
  // Zone 1: Header
  customerName: "text-2xl sm:text-3xl font-bold tracking-tight text-foreground",
  contactPrimary: "text-sm font-medium text-foreground hover:text-primary transition-colors",
  contactSecondary: "text-sm text-muted-foreground hover:text-primary transition-colors",
  reference: "text-xs font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors",

  // Zone 2: Context Bar
  contextItem: "text-sm text-muted-foreground flex items-center gap-1.5",
  contextItemHighlight: "text-sm font-medium text-foreground flex items-center gap-1.5",

  // Zone 3: Alert
  alertTitle: "text-xs font-bold uppercase tracking-wider",
  alertContent: "text-sm font-medium",
  alertDetail: "text-sm",

  // Zone 4: Status Cards
  cardLabel: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
  statusText: "text-base font-semibold",
  balanceLarge: "text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight",
  balancePaid: "text-xl font-bold tabular-nums",

  // Zone 5: Content Sections
  sectionTitle: "text-sm font-semibold uppercase tracking-wide text-foreground",
  bodyText: "text-sm text-foreground",
  metaText: "text-xs text-muted-foreground",
  monoValue: "font-mono tabular-nums",

  // Zone 6: Floating Bar
  floatingName: "font-semibold text-foreground truncate",
  floatingBalance: "text-sm font-bold tabular-nums",
} as const;

export const spacing = {
  // Zone gaps
  zoneGap: "space-y-4",
  sectionGap: "space-y-6",

  // Card padding
  cardPadding: "p-3 sm:p-4",
  cardPaddingLarge: "p-4 sm:p-5",

  // Internal spacing
  itemGap: "gap-2",
  iconGap: "gap-1.5",
  buttonGap: "gap-2",
} as const;

export const colors = {
  // Booking Status
  status: {
    confirmed: {
      text: "text-success",
      bg: "bg-success",
      bgMuted: "bg-success/10",
    },
    pending: {
      text: "text-warning",
      bg: "bg-warning",
      bgMuted: "bg-warning/10",
    },
    cancelled: {
      text: "text-destructive",
      bg: "bg-destructive",
      bgMuted: "bg-destructive/10",
    },
    completed: {
      text: "text-muted-foreground",
      bg: "bg-muted",
      bgMuted: "bg-muted/60",
    },
    no_show: {
      text: "text-muted-foreground",
      bg: "bg-muted/80",
      bgMuted: "bg-muted/60",
    },
  },

  // Balance colors
  balance: {
    due: "text-warning dark:text-warning",
    paid: "text-success dark:text-success",
  },

  // Action button colors
  actions: {
    confirm: "bg-success hover:bg-success text-success-foreground shadow-lg shadow-success/25",
    complete: "bg-info hover:bg-info text-info-foreground shadow-lg shadow-info/25",
    collect: "bg-warning hover:bg-warning text-warning-foreground shadow-lg shadow-warning/25",
    refund: "bg-warning hover:bg-warning text-warning-foreground shadow-lg shadow-warning/25",
    cancel: "bg-destructive hover:bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25",
  },
} as const;

export const animations = {
  // Transitions
  colorTransition: "transition-colors duration-150",
  allTransition: "transition-all duration-200",
  transformTransition: "transition-transform duration-150",

  // Interactive states
  hoverScale: "hover:scale-[1.02]",
  activeScale: "active:scale-[0.98]",

  // Focus
  focusRing: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const;

export const layout = {
  // Card styles
  card: "rounded-xl border border-border bg-card overflow-hidden",
  cardHover: "hover:border-border/80 hover:shadow-sm transition-all",

  // Status card specific
  statusCard: "rounded-lg border border-border bg-card p-3",

  // Floating bar
  floatingBar: "bg-card/95 backdrop-blur-lg border border-border/50 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/30",
} as const;

// Helper function to get status colors
export function getStatusColors(status: string) {
  return colors.status[status as keyof typeof colors.status] || colors.status.pending;
}

// Type exports
export type BookingStatus = keyof typeof colors.status;
export type ActionVariant = keyof typeof colors.actions;
