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

interface BookingRefundEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  refundAmount: string;
  currency?: string;
  refundReason: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  rebookUrl?: string;
  logoUrl?: string;
}

export const BookingRefundEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  tourTime = "10:00 AM",
  refundAmount = "150.00",
  currency = "USD",
  refundReason = "customer_request",
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  rebookUrl = "https://example.com/tours",
  logoUrl,
}: BookingRefundEmailProps) => {
  const previewText = `Your refund of ${currency} ${refundAmount} has been processed`;

  const formatReason = (reason: string) => {
    const reasonMap: Record<string, string> = {
      customer_request: "Customer Request",
      booking_cancelled: "Booking Cancelled",
      schedule_cancelled: "Schedule Cancelled",
      duplicate: "Duplicate Booking",
      fraudulent: "Fraudulent Transaction",
      other: "Other",
    };
    return reasonMap[reason] || reason;
  };

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
          <Heading style={heading}>Refund Processed</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Your refund has been successfully processed. The funds will be returned to your original payment method.
          </Text>

          <Section style={refundCard}>
            <Text style={refundAmount_style}>
              {currency} {refundAmount}
            </Text>
            <Text style={refundLabel}>Refund Amount</Text>
            <Hr style={hr} />
            <Text style={bookingReference_style}>
              Booking: <strong>{bookingReference}</strong>
            </Text>
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
              <strong>Reason:</strong> {formatReason(refundReason)}
            </Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What happens next?</Text>
            <Text style={infoText}>
              The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.
            </Text>
            <Text style={infoText}>
              If you paid with a credit card, the refund will appear as a credit on your statement.
            </Text>
            <Text style={infoText}>
              For debit card payments, the funds will be deposited back to your account.
            </Text>
          </Section>

          <Text style={paragraph}>
            We hope to see you on another tour soon! Browse our available tours anytime.
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
            If you have any questions about this refund or need assistance, please don&apos;t hesitate to contact us.
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

export default BookingRefundEmail;

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
  color: "#16a34a",
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

const refundCard = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #86efac",
  textAlign: "center" as const,
};

const refundAmount_style = {
  fontSize: "36px",
  fontWeight: "700",
  color: "#16a34a",
  margin: "0 0 4px",
};

const refundLabel = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 20px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bookingReference_style = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 16px",
  textAlign: "left" as const,
};

const detailRow = {
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#1a1a1a",
  margin: "8px 0",
  textAlign: "left" as const,
};

const infoBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "20px",
  border: "1px solid #e2e8f0",
};

const infoTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 12px",
};

const infoText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#64748b",
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
