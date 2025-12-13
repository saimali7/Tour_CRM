import { Resend } from "resend";
import { BookingConfirmationEmail } from "./templates/booking-confirmation";
import { BookingCancellationEmail } from "./templates/booking-cancellation";
import { BookingReminderEmail } from "./templates/booking-reminder";
import { GuideAssignmentEmail } from "./templates/guide-assignment";
import { GuideReminderEmail } from "./templates/guide-reminder";
import { GuideDailyManifestEmail } from "./templates/guide-daily-manifest";
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

export class EmailService {
  private org: OrganizationEmailConfig;
  private fromEmail: string;
  private replyTo: string;

  constructor(org: OrganizationEmailConfig) {
    this.org = org;
    this.fromEmail = org.fromEmail || `${org.name} <noreply@updates.example.com>`;
    this.replyTo = org.replyToEmail || org.email || "support@example.com";
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
}

/**
 * Create email service for an organization
 */
export function createEmailService(org: OrganizationEmailConfig): EmailService {
  return new EmailService(org);
}
