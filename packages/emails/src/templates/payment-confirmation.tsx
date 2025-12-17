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

interface PaymentConfirmationEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  amount: string;
  currency: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  viewBookingUrl?: string;
  receiptUrl?: string;
  logoUrl?: string;
}

export const PaymentConfirmationEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  amount = "99.00",
  currency = "USD",
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  viewBookingUrl = "https://example.com/booking/123",
  receiptUrl,
  logoUrl,
}: PaymentConfirmationEmailProps) => {
  const previewText = `Payment received for ${tourName} - Thank you!`;

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

          <Section style={successBadge}>
            <Text style={successIcon}>✓</Text>
          </Section>

          <Heading style={heading}>Payment Received!</Heading>

          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Thank you for your payment. Your booking for {tourName} is now fully confirmed.
          </Text>

          <Section style={paymentCard}>
            <Text style={paymentAmount}>
              {currency} {amount}
            </Text>
            <Text style={paymentLabel}>Payment Confirmed</Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <strong>Booking Reference:</strong> {bookingReference}
            </Text>
            <Text style={detailRow}>
              <strong>Tour:</strong> {tourName}
            </Text>
            <Text style={detailRow}>
              <strong>Date:</strong> {tourDate}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            {viewBookingUrl && (
              <Button style={button} href={viewBookingUrl}>
                View Booking Details
              </Button>
            )}
          </Section>

          {receiptUrl && (
            <Section style={receiptSection}>
              <Text style={receiptText}>
                Need a receipt?{" "}
                <Link href={receiptUrl} style={link}>
                  View your Stripe receipt
                </Link>
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            We look forward to seeing you on the tour! If you have any questions, please don&apos;t hesitate to contact us.
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

export default PaymentConfirmationEmail;

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

const successBadge = {
  textAlign: "center" as const,
  margin: "20px 0 0",
};

const successIcon = {
  backgroundColor: "#10b981",
  color: "#ffffff",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  display: "inline-block",
  lineHeight: "48px",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 auto",
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

const paymentCard = {
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #10b981",
  textAlign: "center" as const,
};

const paymentAmount = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#059669",
  margin: "0 0 4px",
};

const paymentLabel = {
  fontSize: "14px",
  color: "#065f46",
  margin: "0 0 16px",
  fontWeight: "500",
};

const detailRow = {
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#1a1a1a",
  margin: "8px 0",
  textAlign: "left" as const,
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

const receiptSection = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const receiptText = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0",
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
