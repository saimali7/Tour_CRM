// Export the Inngest client
export { inngest } from "./client";
export type { BookingEvents } from "./client";

// Export all functions
export {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} from "./functions/booking-emails";

export {
  processAbandonedCarts,
  handleCartAbandoned,
} from "./functions/cart-recovery";

export {
  sendReviewRequests,
  checkAvailabilityAlerts,
  checkPriceDrops,
} from "./functions/engagement-automations";

export {
  sendGuideAssignmentEmail,
  sendPendingAssignmentReminder,
  sendGuideScheduleReminder,
  sendGuideDailyManifest,
} from "./functions/guide-notifications";

export {
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
} from "./functions/review-requests";

// Aggregate all functions for the serve handler
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} from "./functions/booking-emails";

import {
  processAbandonedCarts,
  handleCartAbandoned,
} from "./functions/cart-recovery";

import {
  sendReviewRequests,
  checkAvailabilityAlerts,
  checkPriceDrops,
} from "./functions/engagement-automations";

import {
  sendGuideAssignmentEmail,
  sendPendingAssignmentReminder,
  sendGuideScheduleReminder,
  sendGuideDailyManifest,
} from "./functions/guide-notifications";

import {
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
} from "./functions/review-requests";

export const inngestFunctions = [
  // Booking emails
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
  // Cart recovery (Phase 2)
  processAbandonedCarts,
  handleCartAbandoned,
  // Engagement automations (Phase 2)
  sendReviewRequests,
  checkAvailabilityAlerts,
  checkPriceDrops,
  // Guide notifications
  sendGuideAssignmentEmail,
  sendPendingAssignmentReminder,
  sendGuideScheduleReminder,
  sendGuideDailyManifest,
  // Review requests
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
];
