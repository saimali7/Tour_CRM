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
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500",
      bgMuted: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    pending: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500",
      bgMuted: "bg-amber-50 dark:bg-amber-950/40",
    },
    cancelled: {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-500",
      bgMuted: "bg-red-50 dark:bg-red-950/40",
    },
    completed: {
      text: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-500",
      bgMuted: "bg-slate-50 dark:bg-slate-800/40",
    },
    no_show: {
      text: "text-slate-500",
      bg: "bg-slate-400",
      bgMuted: "bg-slate-100 dark:bg-slate-800/40",
    },
  },

  // Balance colors
  balance: {
    due: "text-amber-600 dark:text-amber-400",
    paid: "text-emerald-600 dark:text-emerald-400",
  },

  // Action button colors
  actions: {
    confirm: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25",
    complete: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25",
    collect: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25",
    refund: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25",
    cancel: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25",
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
