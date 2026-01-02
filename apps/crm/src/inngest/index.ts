// Export the Inngest client
export { inngest } from "./client";
export type { BookingEvents } from "./client";

// Export all functions
export {
  sendBookingCreatedEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingRescheduleEmail,
  sendBookingReminderEmail,
  sendRefundProcessedEmail,
  dailyBookingReminderCheck,
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
  sendDispatchNotifications,
} from "./functions/dispatch-notifications";

export {
  dailyDispatchOptimization,
} from "./functions/daily-optimization";

export {
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
} from "./functions/review-requests";

export {
  sendPaymentSucceededEmail,
  sendPaymentFailedEmail,
} from "./functions/payment-emails";

export {
  sendTeamInviteEmail,
} from "./functions/team-notifications";

// Aggregate all functions for the serve handler
import {
  sendBookingCreatedEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingRescheduleEmail,
  sendBookingReminderEmail,
  sendRefundProcessedEmail,
  dailyBookingReminderCheck,
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
  sendDispatchNotifications,
} from "./functions/dispatch-notifications";

import {
  dailyDispatchOptimization,
} from "./functions/daily-optimization";

import {
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
} from "./functions/review-requests";

import {
  sendPaymentSucceededEmail,
  sendPaymentFailedEmail,
} from "./functions/payment-emails";

import {
  sendTeamInviteEmail,
} from "./functions/team-notifications";

export const inngestFunctions = [
  // Booking emails
  sendBookingCreatedEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingRescheduleEmail,
  sendBookingReminderEmail,
  sendRefundProcessedEmail,
  dailyBookingReminderCheck,
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
  // Dispatch notifications (Command Center)
  sendDispatchNotifications,
  // Daily optimization (Command Center - runs at 4 AM)
  dailyDispatchOptimization,
  // Review requests
  sendReviewRequestEmail,
  sendReviewReminderEmail,
  dailyReviewRequestCheck,
  // Payment emails
  sendPaymentSucceededEmail,
  sendPaymentFailedEmail,
  // Team notifications
  sendTeamInviteEmail,
];
