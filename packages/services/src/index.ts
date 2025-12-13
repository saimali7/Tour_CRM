import type { ServiceContext } from "./types";
import { TourService } from "./tour-service";
import { ScheduleService } from "./schedule-service";
import { BookingService } from "./booking-service";
import { CustomerService } from "./customer-service";
import { GuideService } from "./guide-service";
import { OrganizationService } from "./organization-service";
import { ActivityLogService } from "./activity-log-service";
import { RefundService } from "./refund-service";
// Phase 2 services
import { CustomerNoteService } from "./customer-note-service";
import { CommunicationService } from "./communication-service";
import { WishlistService } from "./wishlist-service";
import { AbandonedCartService } from "./abandoned-cart-service";
import { AvailabilityAlertService } from "./availability-alert-service";

export interface Services {
  tour: TourService;
  schedule: ScheduleService;
  booking: BookingService;
  customer: CustomerService;
  guide: GuideService;
  organization: OrganizationService;
  activityLog: ActivityLogService;
  refund: RefundService;
  // Phase 2 services
  customerNote: CustomerNoteService;
  communication: CommunicationService;
  wishlist: WishlistService;
  abandonedCart: AbandonedCartService;
  availabilityAlert: AvailabilityAlertService;
}

/**
 * Create all services with organization context
 *
 * @example
 * ```ts
 * const services = createServices({ organizationId: "org_123" });
 * const tours = await services.tour.getAll();
 * const booking = await services.booking.create({ ... });
 * ```
 */
export function createServices(ctx: ServiceContext): Services {
  return {
    tour: new TourService(ctx),
    schedule: new ScheduleService(ctx),
    booking: new BookingService(ctx),
    customer: new CustomerService(ctx),
    guide: new GuideService(ctx),
    organization: new OrganizationService(ctx),
    activityLog: new ActivityLogService(ctx),
    refund: new RefundService(ctx),
    // Phase 2 services
    customerNote: new CustomerNoteService(ctx),
    communication: new CommunicationService(ctx),
    wishlist: new WishlistService(ctx),
    abandonedCart: new AbandonedCartService(ctx),
    availabilityAlert: new AvailabilityAlertService(ctx),
  };
}

// Export individual services for direct use if needed
export { TourService } from "./tour-service";
export { ScheduleService } from "./schedule-service";
export { BookingService } from "./booking-service";
export { CustomerService } from "./customer-service";
export { GuideService } from "./guide-service";
export { OrganizationService } from "./organization-service";
export { ActivityLogService } from "./activity-log-service";
export { RefundService } from "./refund-service";
// Phase 2 services
export { CustomerNoteService } from "./customer-note-service";
export { CommunicationService } from "./communication-service";
export { WishlistService } from "./wishlist-service";
export { AbandonedCartService } from "./abandoned-cart-service";
export { AvailabilityAlertService } from "./availability-alert-service";

// Export types
export * from "./types";
export type { TourFilters, CreateTourInput, UpdateTourInput } from "./tour-service";
export type {
  ScheduleFilters,
  ScheduleWithRelations,
  CreateScheduleInput,
  UpdateScheduleInput,
  BulkCreateScheduleInput,
  AutoGenerateScheduleInput,
} from "./schedule-service";
export type {
  BookingFilters,
  BookingWithRelations,
  CreateBookingInput,
  UpdateBookingInput,
} from "./booking-service";
export type {
  CustomerFilters,
  CustomerWithStats,
  CreateCustomerInput,
  UpdateCustomerInput,
  GdprExportData,
} from "./customer-service";
export type {
  GuideFilters,
  GuideWithStats,
  CreateGuideInput,
  UpdateGuideInput,
} from "./guide-service";
export type {
  UpdateOrganizationInput,
  UpdateOrganizationSettingsInput,
} from "./organization-service";
export type {
  ActivityLogFilters,
  CreateActivityLogInput,
} from "./activity-log-service";
export type {
  RefundFilters,
  RefundWithBooking,
  CreateRefundInput,
} from "./refund-service";
// Phase 2 types
export type {
  CreateCustomerNoteInput,
  UpdateCustomerNoteInput,
} from "./customer-note-service";
export type {
  CommunicationLogFilters,
  CreateCommunicationLogInput,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  CreateSmsTemplateInput,
  UpdateSmsTemplateInput,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationType,
} from "./communication-service";
export type {
  WishlistWithTour,
  CreateWishlistInput,
  UpdateWishlistInput,
} from "./wishlist-service";
export type {
  AbandonedCartFilters,
  AbandonedCartWithRelations,
  CreateAbandonedCartInput,
  UpdateAbandonedCartInput,
} from "./abandoned-cart-service";
export type {
  AvailabilityAlertFilters,
  AvailabilityAlertWithRelations,
  CreateAvailabilityAlertInput,
} from "./availability-alert-service";

// Storage service (separate from org-scoped services, created with createStorageService)
export { StorageService, createStorageService, type UploadResult } from "./storage-service";
