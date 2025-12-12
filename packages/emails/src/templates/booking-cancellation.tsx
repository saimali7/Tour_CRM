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

interface BookingCancellationEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  refundAmount?: string;
  currency?: string;
  cancellationReason?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  rebookUrl?: string;
  logoUrl?: string;
}

export const BookingCancellationEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  tourTime = "10:00 AM",
  refundAmount,
  currency = "USD",
  cancellationReason,
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  rebookUrl = "https://example.com/tours",
  logoUrl,
}: BookingCancellationEmailProps) => {
  const previewText = `Your booking for ${tourName} has been cancelled`;

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
          <Heading style={heading}>Booking Cancelled</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your booking has been cancelled. Here are the details:
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
              <strong>Original Date:</strong> {tourDate}
            </Text>
            <Text style={detailRow}>
              <strong>Original Time:</strong> {tourTime}
            </Text>
            {cancellationReason && (
              <Text style={detailRow}>
                <strong>Reason:</strong> {cancellationReason}
              </Text>
            )}
            {refundAmount && (
              <>
                <Hr style={hr} />
                <Text style={refundText}>
                  Refund Amount: {currency} {refundAmount}
                </Text>
                <Text style={detailSmall}>
                  Refunds typically take 5-10 business days to process.
                </Text>
              </>
            )}
          </Section>

          <Text style={paragraph}>
            We&apos;re sorry to see you go! If you&apos;d like to book another tour, we&apos;d love to have you.
          </Text>

          {rebookUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={rebookUrl}>
                Browse Tours
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            If you have any questions about this cancellation, please contact us.
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

export default BookingCancellationEmail;

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
  color: "#dc2626",
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
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #fecaca",
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

const refundText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#16a34a",
  margin: "8px 0",
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
  borderColor: "#fecaca",
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
