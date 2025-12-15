import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BookingConfirmationEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  totalAmount: string;
  currency: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  viewBookingUrl?: string;
  paymentUrl?: string;
  paymentStatus?: "pending" | "partial" | "paid" | "refunded" | "failed";
  logoUrl?: string;
}

export const BookingConfirmationEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  tourTime = "10:00 AM",
  participants = 2,
  totalAmount = "99.00",
  currency = "USD",
  meetingPoint = "Main Square Fountain",
  meetingPointDetails = "Look for our guide with the orange umbrella",
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  viewBookingUrl = "https://example.com/booking/123",
  paymentUrl,
  paymentStatus = "pending",
  logoUrl,
}: BookingConfirmationEmailProps) => {
  const previewText = `Your booking for ${tourName} is confirmed!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {logoUrl && (
            <Img
              src={logoUrl}
              width="120"
              height="40"
              alt={organizationName}
              style={logo}
            />
          )}
          <Heading style={heading}>Booking Confirmed!</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your booking has been confirmed. Here are your booking details:
          </Text>

          <Section style={bookingCard}>
            <Text style={bookingReference_style}>
              Reference: <strong>{bookingReference}</strong>
            </Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <strong>Tour:</strong> {tourName}
            </Text>
            <Text style={detailRow}>
              <strong>Date:</strong> {tourDate}
            </Text>
            <Text style={detailRow}>
              <strong>Time:</strong> {tourTime}
            </Text>
            <Text style={detailRow}>
              <strong>Participants:</strong> {participants}
            </Text>
            <Text style={detailRow}>
              <strong>Total:</strong> {currency} {totalAmount}
            </Text>
            {meetingPoint && (
              <>
                <Hr style={hr} />
                <Text style={detailRow}>
                  <strong>Meeting Point:</strong> {meetingPoint}
                </Text>
                {meetingPointDetails && (
                  <Text style={detailSmall}>{meetingPointDetails}</Text>
                )}
              </>
            )}
          </Section>

          {viewBookingUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={viewBookingUrl}>
                View Booking Details
              </Button>
            </Section>
          )}

          {/* Payment Button - Show if payment is pending or partial */}
          {paymentUrl && (paymentStatus === "pending" || paymentStatus === "partial") && (
            <>
              <Section style={paymentNotice}>
                <Text style={paymentNoticeText}>
                  <strong>Payment Required</strong>
                </Text>
                <Text style={paymentNoticeSubtext}>
                  {paymentStatus === "partial"
                    ? "You have a remaining balance on this booking."
                    : "Please complete your payment to confirm your booking."}
                </Text>
              </Section>
              <Section style={buttonContainer}>
                <Button style={paymentButton} href={paymentUrl}>
                  Pay Now
                </Button>
              </Section>
            </>
          )}

          {/* Payment Confirmed Notice */}
          {paymentStatus === "paid" && (
            <Section style={paidNotice}>
              <Text style={paidNoticeText}>
                ✓ Payment Confirmed
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            If you have any questions, please don&apos;t hesitate to contact us.
          </Text>

          <Section style={footer}>
            <Text style={footerText}>
              <strong>{organizationName}</strong>
            </Text>
            {organizationEmail && (
              <Text style={footerText}>
                Email:{" "}
                <Link href={`mailto:${organizationEmail}`} style={link}>
                  {organizationEmail}
                </Link>
              </Text>
            )}
            {organizationPhone && (
              <Text style={footerText}>Phone: {organizationPhone}</Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logo = {
  margin: "0 auto 20px",
  display: "block" as const,
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#1a1a1a",
  padding: "17px 0 0",
  textAlign: "center" as const,
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
  padding: "0 40px",
};

const bookingCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #e2e8f0",
};

const bookingReference_style = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 16px",
};

const detailRow = {
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#1a1a1a",
  margin: "8px 0",
};

const detailSmall = {
  fontSize: "13px",
  lineHeight: "1.4",
  color: "#64748b",
  margin: "4px 0 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "16px 0",
};

const footer = {
  marginTop: "32px",
  padding: "0 40px",
};

const footerText = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#64748b",
  margin: "4px 0",
};

const link = {
  color: "#2563eb",
  textDecoration: "none",
};

const paymentNotice = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  margin: "24px 40px 16px",
  padding: "16px 24px",
  border: "1px solid #fbbf24",
};

const paymentNoticeText = {
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#92400e",
  margin: "0 0 4px",
};

const paymentNoticeSubtext = {
  fontSize: "13px",
  lineHeight: "1.4",
  color: "#78350f",
  margin: "0",
};

const paymentButton = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const paidNotice = {
  backgroundColor: "#d1fae5",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "12px 24px",
  border: "1px solid #10b981",
};

const paidNoticeText = {
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#065f46",
  margin: "0",
  textAlign: "center" as const,
  fontWeight: "600",
};
