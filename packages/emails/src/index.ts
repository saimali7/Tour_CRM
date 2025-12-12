// Email Service
export {
  EmailService,
  createEmailService,
  type EmailResult,
  type OrganizationEmailConfig,
  type BookingEmailData,
  type CancellationEmailData,
  type ReminderEmailData,
} from "./email-service";

// Email Templates (for preview/testing)
export { BookingConfirmationEmail } from "./templates/booking-confirmation";
export { BookingCancellationEmail } from "./templates/booking-cancellation";
export { BookingReminderEmail } from "./templates/booking-reminder";
