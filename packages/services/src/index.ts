import type { ServiceContext } from "./types";
import { TourService } from "./tour-service";
import { ScheduleService } from "./schedule-service";
import { BookingService } from "./booking-service";
import { CustomerService } from "./customer-service";
import { GuideService } from "./guide-service";
import { GuideAssignmentService } from "./guide-assignment-service";
import { OrganizationService } from "./organization-service";
import { ActivityLogService } from "./activity-log-service";
import { RefundService } from "./refund-service";
// Phase 2 services
import { CustomerNoteService } from "./customer-note-service";
import { CommunicationService } from "./communication-service";
import { WishlistService } from "./wishlist-service";
import { AbandonedCartService } from "./abandoned-cart-service";
import { AvailabilityAlertService } from "./availability-alert-service";
import { GuideAvailabilityService } from "./guide-availability-service";
import { TourGuideQualificationService } from "./tour-guide-qualification-service";
import { ManifestService } from "./manifest-service";
// Phase 4 services
import { SeasonalPricingService } from "./seasonal-pricing-service";
import { PromoCodeService } from "./promo-code-service";
import { GroupDiscountService } from "./group-discount-service";
import { PricingCalculationService } from "./pricing-calculation-service";
// Phase 5 services
import { AnalyticsService } from "./analytics-service";
import { DashboardService } from "./dashboard-service";
import { CustomerIntelligenceService } from "./customer-intelligence-service";
// High-Impact Features
import { ReviewService } from "./review-service";

export interface Services {
  tour: TourService;
  schedule: ScheduleService;
  booking: BookingService;
  customer: CustomerService;
  guide: GuideService;
  guideAssignment: GuideAssignmentService;
  organization: OrganizationService;
  activityLog: ActivityLogService;
  refund: RefundService;
  manifest: ManifestService;
  // Phase 2 services
  customerNote: CustomerNoteService;
  communication: CommunicationService;
  wishlist: WishlistService;
  abandonedCart: AbandonedCartService;
  availabilityAlert: AvailabilityAlertService;
  guideAvailability: GuideAvailabilityService;
  tourGuideQualification: TourGuideQualificationService;
  // Phase 4 services
  seasonalPricing: SeasonalPricingService;
  promoCode: PromoCodeService;
  groupDiscount: GroupDiscountService;
  pricingCalculation: PricingCalculationService;
  // Phase 5 services
  analytics: AnalyticsService;
  dashboard: DashboardService;
  customerIntelligence: CustomerIntelligenceService;
  // High-Impact Features
  review: ReviewService;
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
    guideAssignment: new GuideAssignmentService(ctx),
    organization: new OrganizationService(ctx),
    activityLog: new ActivityLogService(ctx),
    refund: new RefundService(ctx),
    manifest: new ManifestService(ctx),
    // Phase 2 services
    customerNote: new CustomerNoteService(ctx),
    communication: new CommunicationService(ctx),
    wishlist: new WishlistService(ctx),
    abandonedCart: new AbandonedCartService(ctx),
    availabilityAlert: new AvailabilityAlertService(ctx),
    guideAvailability: new GuideAvailabilityService(ctx),
    tourGuideQualification: new TourGuideQualificationService(ctx),
    // Phase 4 services
    seasonalPricing: new SeasonalPricingService(ctx),
    promoCode: new PromoCodeService(ctx),
    groupDiscount: new GroupDiscountService(ctx),
    pricingCalculation: new PricingCalculationService(ctx),
    // Phase 5 services
    analytics: new AnalyticsService(ctx),
    dashboard: new DashboardService(ctx),
    customerIntelligence: new CustomerIntelligenceService(ctx),
    // High-Impact Features
    review: new ReviewService(ctx),
  };
}

// Export individual services for direct use if needed
export { TourService } from "./tour-service";
export { ScheduleService } from "./schedule-service";
export { BookingService } from "./booking-service";
export { CustomerService } from "./customer-service";
export { GuideService } from "./guide-service";
export { GuideAssignmentService } from "./guide-assignment-service";
export { OrganizationService } from "./organization-service";
export { ActivityLogService } from "./activity-log-service";
export { RefundService } from "./refund-service";
// Phase 2 services
export { CustomerNoteService } from "./customer-note-service";
export { CommunicationService } from "./communication-service";
export { WishlistService } from "./wishlist-service";
export { AbandonedCartService } from "./abandoned-cart-service";
export { AvailabilityAlertService } from "./availability-alert-service";
export { GuideAvailabilityService } from "./guide-availability-service";
export { TourGuideQualificationService } from "./tour-guide-qualification-service";
export { ManifestService } from "./manifest-service";
// Phase 4 services
export { SeasonalPricingService } from "./seasonal-pricing-service";
export { PromoCodeService } from "./promo-code-service";
export { GroupDiscountService } from "./group-discount-service";
export { PricingCalculationService } from "./pricing-calculation-service";
// Phase 5 services
export { AnalyticsService } from "./analytics-service";
export { DashboardService } from "./dashboard-service";
export { CustomerIntelligenceService } from "./customer-intelligence-service";
// High-Impact Features
export { ReviewService } from "./review-service";

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
  GuideAssignmentFilters,
  GuideAssignmentWithRelations,
  CreateGuideAssignmentInput,
} from "./guide-assignment-service";
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
export type {
  WeeklyAvailabilitySlot,
  AvailabilityOverrideInput,
  DateAvailability,
} from "./guide-availability-service";
export type {
  QualificationWithGuide,
  QualificationWithTour,
  CreateQualificationInput,
  UpdateQualificationInput,
  QualifiedGuideWithAvailability,
} from "./tour-guide-qualification-service";
export type {
  ManifestParticipant,
  ManifestBooking,
  ScheduleManifest,
  GuideManifestSummary,
  DateManifestSummary,
} from "./manifest-service";
// Phase 4 types
export type {
  SeasonalPricingFilters,
  SeasonalPricingSortField,
  CreateSeasonalPricingInput,
  UpdateSeasonalPricingInput,
  PriceAdjustment,
} from "./seasonal-pricing-service";
export type {
  PromoCodeFilters,
  PromoCodeSortField,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  PromoCodeValidation,
  PromoCodeUsageStats,
} from "./promo-code-service";
export type {
  GroupDiscountFilters,
  GroupDiscountSortField,
  CreateGroupDiscountInput,
  UpdateGroupDiscountInput,
  GroupDiscountResult,
} from "./group-discount-service";
export type {
  AppliedPricing,
  PriceBreakdown,
} from "./pricing-calculation-service";
// Phase 5 types
export type {
  RevenueStats,
  PeriodRevenueData,
  BookingStats,
  BookingTrendData,
  CapacityUtilization,
  TodaysOperations,
  RecentActivityItem,
} from "./analytics-service";
export type {
  OperationsDashboard,
  Alert,
  BusinessDashboard,
  KeyMetrics,
  TrendData,
} from "./dashboard-service";
export type {
  CustomerSegment,
  ReengagementTriggerType,
  CustomerScore,
  CustomerWithScore,
  CustomerLifetimeValue,
  ReengagementCandidate,
  CustomerStatsReport,
  SegmentDistribution,
} from "./customer-intelligence-service";
// High-Impact Features types
export type {
  ReviewSortField,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilters,
  ReviewWithRelations,
  ReviewStats,
  GuideRatingStats,
} from "./review-service";

// Storage service (separate from org-scoped services, created with createStorageService)
export { StorageService, createStorageService, type UploadResult } from "./storage-service";
