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
});

export type AppRouter = typeof appRouter;
