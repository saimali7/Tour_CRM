// Export the Inngest client
export { inngest } from "./client";
export type { BookingEvents } from "./client";

// Export all functions
export {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} from "./functions/booking-emails";

// Aggregate all functions for the serve handler
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} from "./functions/booking-emails";

export const inngestFunctions = [
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
];
