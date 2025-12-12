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
});

export type AppRouter = typeof appRouter;
