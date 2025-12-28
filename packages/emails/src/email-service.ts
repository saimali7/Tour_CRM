import { Resend } from "resend";
import { BookingConfirmationEmail } from "./templates/booking-confirmation";
import { BookingCancellationEmail } from "./templates/booking-cancellation";
import { BookingReminderEmail } from "./templates/booking-reminder";
import { BookingRescheduleEmail } from "./templates/booking-reschedule";
import { BookingRefundEmail } from "./templates/booking-refund";
import { GuideAssignmentEmail } from "./templates/guide-assignment";
import { GuideReminderEmail } from "./templates/guide-reminder";
import { GuideDailyManifestEmail } from "./templates/guide-daily-manifest";
import { PaymentConfirmationEmail } from "./templates/payment-confirmation";
import { PaymentLinkEmail } from "./templates/payment-link";
import * as React from "react";

// Lazy initialize Resend client
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OrganizationEmailConfig {
  name: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  fromEmail?: string;
  replyToEmail?: string;
}

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  totalAmount: string;
  currency: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  viewBookingUrl?: string;
}

export interface CancellationEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  refundAmount?: string;
  currency?: string;
  cancellationReason?: string;
  rebookUrl?: string;
}

export interface ReminderEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  meetingPoint?: string;
  meetingPointDetails?: string;
  specialInstructions?: string;
  viewBookingUrl?: string;
  hoursUntilTour: number;
}

export interface RescheduleEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  oldTourDate: string;
  oldTourTime: string;
  newTourDate: string;
  newTourTime: string;
  participants: number;
  meetingPoint?: string;
  meetingPointDetails?: string;
  viewBookingUrl?: string;
}

export interface GuideAssignmentEmailData {
  guideName: string;
  guideEmail: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  confirmUrl?: string;
  declineUrl?: string;
  manifestUrl?: string;
}

export interface GuideReminderEmailData {
  guideName: string;
  guideEmail: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participantCount: number;
  meetingPoint?: string;
  meetingPointDetails?: string;
  manifestUrl?: string;
}

export interface GuideDailyManifestEmailData {
  guideName: string;
  guideEmail: string;
  date: string;
  tours: Array<{
    tourName: string;
    time: string;
    participantCount: number;
    meetingPoint?: string;
    manifestUrl?: string;
  }>;
}

export interface RefundEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  refundAmount: string;
  currency?: string;
  refundReason: string;
  rebookUrl?: string;
}

export interface ReviewRequestEmailData {
  customerName: string;
  customerEmail: string;
  tourName: string;
  tourDate: string;
  reviewUrl: string;
  isReminder?: boolean;
}

export interface PaymentConfirmationEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  amount: string;
  currency: string;
  viewBookingUrl?: string;
  receiptUrl?: string;
}

export interface PaymentLinkEmailData {
  customerName: string;
  customerEmail: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  amount: string;
  currency: string;
  paymentUrl: string;
  expiresAt?: string;
}

export class EmailService {
  private org: OrganizationEmailConfig;
  private fromEmail: string;
  private replyTo: string;

  constructor(org: OrganizationEmailConfig) {
    this.org = org;
    // Require proper from email - example.com will be rejected by email providers
    if (!org.fromEmail) {
      throw new Error(
        `Organization "${org.name}" must have a configured fromEmail address. ` +
        `Set this in organization settings before sending emails.`
      );
    }
    this.fromEmail = org.fromEmail;
    this.replyTo = org.replyToEmail || org.email || org.fromEmail;
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Booking Confirmed - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(BookingConfirmationEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          participants: data.participants,
          totalAmount: data.totalAmount,
          currency: data.currency,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          viewBookingUrl: data.viewBookingUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(data: CancellationEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Booking Cancelled - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(BookingCancellationEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          refundAmount: data.refundAmount,
          currency: data.currency,
          cancellationReason: data.cancellationReason,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          rebookUrl: data.rebookUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(data: ReminderEmailData): Promise<EmailResult> {
    try {
      const subject =
        data.hoursUntilTour <= 24
          ? `Tomorrow: ${data.tourName} (${data.bookingReference})`
          : `Reminder: ${data.tourName} on ${data.tourDate}`;

      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject,
        react: React.createElement(BookingReminderEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          participants: data.participants,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          specialInstructions: data.specialInstructions,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          viewBookingUrl: data.viewBookingUrl,
          logoUrl: this.org.logoUrl,
          hoursUntilTour: data.hoursUntilTour,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send booking reschedule email
   */
  async sendBookingReschedule(data: RescheduleEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Booking Rescheduled - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(BookingRescheduleEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          oldTourDate: data.oldTourDate,
          oldTourTime: data.oldTourTime,
          newTourDate: data.newTourDate,
          newTourTime: data.newTourTime,
          participants: data.participants,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          viewBookingUrl: data.viewBookingUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send guide assignment email
   */
  async sendGuideAssignment(data: GuideAssignmentEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.guideEmail,
        replyTo: this.replyTo,
        subject: `New Tour Assignment - ${data.tourName}`,
        react: React.createElement(GuideAssignmentEmail, {
          guideName: data.guideName,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          confirmUrl: data.confirmUrl,
          declineUrl: data.declineUrl,
          manifestUrl: data.manifestUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send guide reminder email
   */
  async sendGuideReminder(data: GuideReminderEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.guideEmail,
        replyTo: this.replyTo,
        subject: `Tour Reminder - ${data.tourName}`,
        react: React.createElement(GuideReminderEmail, {
          guideName: data.guideName,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          participantCount: data.participantCount,
          meetingPoint: data.meetingPoint,
          meetingPointDetails: data.meetingPointDetails,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          manifestUrl: data.manifestUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send guide daily manifest email
   */
  async sendGuideDailyManifest(data: GuideDailyManifestEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.guideEmail,
        replyTo: this.replyTo,
        subject: `Your Daily Schedule - ${data.date}`,
        react: React.createElement(GuideDailyManifestEmail, {
          guideName: data.guideName,
          date: data.date,
          tours: data.tours,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send refund confirmation email
   */
  async sendRefundConfirmation(data: RefundEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Refund Processed - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(BookingRefundEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          refundAmount: data.refundAmount,
          currency: data.currency || "USD",
          refundReason: data.refundReason,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          rebookUrl: data.rebookUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(data: PaymentConfirmationEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Payment Received - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(PaymentConfirmationEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          amount: data.amount,
          currency: data.currency,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          viewBookingUrl: data.viewBookingUrl,
          receiptUrl: data.receiptUrl,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send payment link email to customer
   */
  async sendPaymentLinkEmail(data: PaymentLinkEmailData): Promise<EmailResult> {
    try {
      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject: `Complete Your Payment - ${data.tourName} (${data.bookingReference})`,
        react: React.createElement(PaymentLinkEmail, {
          customerName: data.customerName,
          bookingReference: data.bookingReference,
          tourName: data.tourName,
          tourDate: data.tourDate,
          tourTime: data.tourTime,
          participants: data.participants,
          amount: data.amount,
          currency: data.currency,
          paymentUrl: data.paymentUrl,
          expiresAt: data.expiresAt,
          organizationName: this.org.name,
          organizationEmail: this.org.email,
          organizationPhone: this.org.phone,
          logoUrl: this.org.logoUrl,
        }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Send review request email
   */
  async sendReviewRequest(data: ReviewRequestEmailData): Promise<EmailResult> {
    try {
      const subject = data.isReminder
        ? `Quick reminder: Share your ${data.tourName} experience`
        : `How was your ${data.tourName} experience?`;

      const bodyText = data.isReminder
        ? `Hi ${data.customerName},\n\nA few days ago, you experienced ${data.tourName} with us. We noticed you haven't had a chance to leave a review yet.\n\nYour feedback is incredibly valuable - it helps other travelers make informed decisions and helps us continuously improve our tours.\n\nIt only takes a minute!\n\nLeave a Review: ${data.reviewUrl}\n\nThank you for considering leaving a review!\n\n${this.org.name}`
        : `Hi ${data.customerName},\n\nThank you for joining us on ${data.tourName} on ${data.tourDate}!\n\nWe hope you had an amazing experience. Your feedback helps us improve and helps other travelers discover great tours.\n\nWould you mind taking a moment to share your thoughts?\n\nLeave a Review: ${data.reviewUrl}\n\nThank you for your time and for choosing us!\n\n${this.org.name}`;

      const { data: result, error } = await getResendClient().emails.send({
        from: this.fromEmail,
        to: data.customerEmail,
        replyTo: this.replyTo,
        subject,
        text: bodyText,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: result?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

/**
 * Create email service for an organization
 */
export function createEmailService(org: OrganizationEmailConfig): EmailService {
  return new EmailService(org);
}
