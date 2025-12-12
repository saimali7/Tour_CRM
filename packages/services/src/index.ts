import type { ServiceContext } from "./types";
import { TourService } from "./tour-service";
import { ScheduleService } from "./schedule-service";
import { BookingService } from "./booking-service";
import { CustomerService } from "./customer-service";
import { GuideService } from "./guide-service";
import { OrganizationService } from "./organization-service";
import { ActivityLogService } from "./activity-log-service";
import { RefundService } from "./refund-service";

export interface Services {
  tour: TourService;
  schedule: ScheduleService;
  booking: BookingService;
  customer: CustomerService;
  guide: GuideService;
  organization: OrganizationService;
  activityLog: ActivityLogService;
  refund: RefundService;
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

// Storage service (separate from org-scoped services, created with createStorageService)
export { StorageService, createStorageService, type UploadResult } from "./storage-service";
