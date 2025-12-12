import { Resend } from "resend";
import { BookingConfirmationEmail } from "./templates/booking-confirmation";
import { BookingCancellationEmail } from "./templates/booking-cancellation";
import { BookingReminderEmail } from "./templates/booking-reminder";
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
}

/**
 * Create email service for an organization
 */
export function createEmailService(org: OrganizationEmailConfig): EmailService {
  return new EmailService(org);
}
