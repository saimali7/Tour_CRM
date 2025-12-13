import { createRouter } from "../trpc";
import { tourRouter } from "./tour";
import { scheduleRouter } from "./schedule";
import { bookingRouter } from "./booking";
import { customerRouter } from "./customer";
import { guideRouter } from "./guide";
import { organizationRouter } from "./organization";
import { onboardingRouter } from "./onboarding";
import { teamRouter } from "./team";
import { activityLogRouter } from "./activity-log";
import { refundRouter } from "./refund";
import { manifestRouter } from "./manifest";
// Phase 2 routers
import { customerNoteRouter } from "./customer-note";
import { communicationRouter } from "./communication";
import { guideAvailabilityRouter } from "./guide-availability";
import { tourGuideQualificationRouter } from "./tour-guide-qualification";
import { guideAssignmentRouter } from "./guide-assignment";
import { guidePortalRouter } from "./guide-portal";
// Phase 4 routers
import { seasonalPricingRouter } from "./seasonal-pricing";
import { promoCodeRouter } from "./promo-code";
import { groupDiscountRouter } from "./group-discount";
import { pricingCalculationRouter } from "./pricing-calculation";
// Phase 5 routers
import { analyticsRouter } from "./analytics";
import { dashboardRouter } from "./dashboard";
import { customerIntelligenceRouter } from "./customer-intelligence";
import { reportsRouter } from "./reports";

export const appRouter = createRouter({
  tour: tourRouter,
  schedule: scheduleRouter,
  booking: bookingRouter,
  customer: customerRouter,
  guide: guideRouter,
  organization: organizationRouter,
  onboarding: onboardingRouter,
  team: teamRouter,
  activityLog: activityLogRouter,
  refund: refundRouter,
  manifest: manifestRouter,
  // Phase 2 routers
  customerNote: customerNoteRouter,
  communication: communicationRouter,
  guideAvailability: guideAvailabilityRouter,
  tourGuideQualification: tourGuideQualificationRouter,
  guideAssignment: guideAssignmentRouter,
  // Guide Portal
  guidePortal: guidePortalRouter,
  // Phase 4 routers
  seasonalPricing: seasonalPricingRouter,
  promoCode: promoCodeRouter,
  groupDiscount: groupDiscountRouter,
  pricingCalculation: pricingCalculationRouter,
  // Phase 5 routers
  analytics: analyticsRouter,
  dashboard: dashboardRouter,
  customerIntelligence: customerIntelligenceRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
