// Email Service
export {
  EmailService,
  createEmailService,
  type EmailResult,
  type OrganizationEmailConfig,
  type BookingEmailData,
  type CancellationEmailData,
  type ReminderEmailData,
  type RescheduleEmailData,
  type RefundEmailData,
  type TeamInviteEmailData,
} from "./email-service";

// Email Templates (for preview/testing)
export { BookingConfirmationEmail } from "./templates/booking-confirmation";
export { BookingCancellationEmail } from "./templates/booking-cancellation";
export { BookingReminderEmail } from "./templates/booking-reminder";
export { BookingRescheduleEmail } from "./templates/booking-reschedule";
export { BookingRefundEmail } from "./templates/booking-refund";
export { TeamInviteEmail } from "./templates/team-invite";
