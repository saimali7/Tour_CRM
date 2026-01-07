/**
 * Smart Hopper Module
 *
 * An intelligent hopper for grouping and managing unassigned bookings.
 */

export { SmartHopper } from "./smart-hopper"
export { BookingGroupCard } from "./booking-group-card"
export { BookingRow } from "./booking-row"
export {
  groupBookings,
  sortGroups,
  filterGroups,
  getUniqueTours,
  formatTimeRange,
} from "./grouping"
export type {
  BookingGroup,
  PickupZoneSummary,
  SortOption,
  TypeFilter,
  TimeFilter,
  HopperFilters,
  ViewMode,
} from "./types"
