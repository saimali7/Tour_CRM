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

interface PaymentLinkEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  amount: string;
  currency: string;
  paymentUrl: string;
  expiresAt?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  logoUrl?: string;
}

export const PaymentLinkEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  tourTime = "10:00 AM",
  participants = 2,
  amount = "99.00",
  currency = "AED",
  paymentUrl = "https://checkout.stripe.com/...",
  expiresAt,
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  logoUrl,
}: PaymentLinkEmailProps) => {
  const previewText = `Complete your payment for ${tourName}`;

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

          <Heading style={heading}>Complete Your Payment</Heading>

          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your booking for {tourName} is reserved and awaiting payment. Please complete your payment to confirm your spot.
          </Text>

          <Section style={bookingCard}>
            <Text style={bookingReferenceStyle}>
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
            <Hr style={hr} />
            <Text style={totalRow}>
              <strong>Amount Due:</strong>{" "}
              <span style={amount_style}>
                {currency} {amount}
              </span>
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={paymentButton} href={paymentUrl}>
              Pay Now - {currency} {amount}
            </Button>
          </Section>

          {expiresAt && (
            <Section style={expiryNotice}>
              <Text style={expiryText}>
                This payment link expires on {expiresAt}. Please complete your payment before then to secure your booking.
              </Text>
            </Section>
          )}

          <Section style={securityNote}>
            <Text style={securityText}>
              <strong>Secure Payment</strong> - Your payment is processed securely through Stripe. We never store your card details.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            If you have any questions about your booking or need assistance with payment, please don&apos;t hesitate to contact us.
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

export default PaymentLinkEmail;

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

const bookingReferenceStyle = {
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

const totalRow = {
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#1a1a1a",
  margin: "8px 0",
};

const amount_style = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#059669",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const paymentButton = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const expiryNotice = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  margin: "24px 40px 16px",
  padding: "12px 16px",
  border: "1px solid #fbbf24",
};

const expiryText = {
  fontSize: "13px",
  lineHeight: "1.4",
  color: "#92400e",
  margin: "0",
  textAlign: "center" as const,
};

const securityNote = {
  margin: "16px 40px",
  textAlign: "center" as const,
};

const securityText = {
  fontSize: "12px",
  lineHeight: "1.4",
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
