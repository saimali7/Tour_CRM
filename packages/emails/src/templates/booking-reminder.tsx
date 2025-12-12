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

interface BookingReminderEmailProps {
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participants: number;
  meetingPoint?: string;
  meetingPointDetails?: string;
  specialInstructions?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  viewBookingUrl?: string;
  logoUrl?: string;
  hoursUntilTour: number;
}

export const BookingReminderEmail = ({
  customerName = "John",
  bookingReference = "BK-001234",
  tourName = "Amazing City Walking Tour",
  tourDate = "Tomorrow",
  tourTime = "10:00 AM",
  participants = 2,
  meetingPoint = "Main Square Fountain",
  meetingPointDetails = "Look for our guide with the orange umbrella",
  specialInstructions,
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  viewBookingUrl = "https://example.com/booking/123",
  logoUrl,
  hoursUntilTour = 24,
}: BookingReminderEmailProps) => {
  const previewText = `Reminder: Your ${tourName} is ${hoursUntilTour <= 24 ? "tomorrow" : `in ${Math.round(hoursUntilTour / 24)} days`}!`;

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
          <Heading style={heading}>
            {hoursUntilTour <= 24 ? "Your Tour is Tomorrow!" : "Tour Reminder"}
          </Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            This is a friendly reminder about your upcoming tour. We can&apos;t wait to see you!
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
            {meetingPoint && (
              <>
                <Hr style={hr} />
                <Text style={meetingPointTitle}>Meeting Point</Text>
                <Text style={meetingPointText}>{meetingPoint}</Text>
                {meetingPointDetails && (
                  <Text style={detailSmall}>{meetingPointDetails}</Text>
                )}
              </>
            )}
          </Section>

          {specialInstructions && (
            <Section style={instructionsCard}>
              <Text style={instructionsTitle}>Special Instructions</Text>
              <Text style={instructionsText}>{specialInstructions}</Text>
            </Section>
          )}

          <Section style={tipsSection}>
            <Text style={tipsTitle}>Tips for Your Tour</Text>
            <Text style={tipItem}>Wear comfortable walking shoes</Text>
            <Text style={tipItem}>Bring water and sun protection</Text>
            <Text style={tipItem}>Arrive 10 minutes early</Text>
            <Text style={tipItem}>Bring a valid ID</Text>
          </Section>

          {viewBookingUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={viewBookingUrl}>
                View Booking Details
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            If you need to make any changes or have questions, please contact us as soon as possible.
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

export default BookingReminderEmail;

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
  color: "#f59e0b",
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
  backgroundColor: "#fffbeb",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #fde68a",
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

const meetingPointTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 8px",
};

const meetingPointText = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 4px",
};

const instructionsCard = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  margin: "16px 40px",
  padding: "16px",
  border: "1px solid #bfdbfe",
};

const instructionsTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e40af",
  margin: "0 0 8px",
};

const instructionsText = {
  fontSize: "14px",
  color: "#1e40af",
  margin: "0",
};

const tipsSection = {
  margin: "24px 40px",
  padding: "16px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  border: "1px solid #bbf7d0",
};

const tipsTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#166534",
  margin: "0 0 12px",
};

const tipItem = {
  fontSize: "14px",
  color: "#166534",
  margin: "4px 0",
  paddingLeft: "16px",
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
  borderColor: "#fde68a",
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
