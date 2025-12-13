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

interface GuideReminderEmailProps {
  guideName: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  participantCount: number;
  meetingPoint?: string;
  meetingPointDetails?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  manifestUrl?: string;
  logoUrl?: string;
}

export const GuideReminderEmail = ({
  guideName = "John",
  tourName = "Amazing City Walking Tour",
  tourDate = "Tomorrow",
  tourTime = "10:00 AM - 12:00 PM",
  participantCount = 8,
  meetingPoint = "Main Square Fountain",
  meetingPointDetails = "Meet participants at the fountain",
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  manifestUrl = "https://example.com/manifest/123",
  logoUrl,
}: GuideReminderEmailProps) => {
  const previewText = `Reminder: ${tourName} - ${tourDate}`;

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
          <Heading style={heading}>Tour Reminder</Heading>
          <Text style={paragraph}>Hi {guideName},</Text>
          <Text style={paragraph}>
            This is a reminder about your upcoming tour {tourDate.toLowerCase()}.
          </Text>

          <Section style={tourCard}>
            <Text style={tourTitle}>{tourName}</Text>
            <Hr style={hr} />
            <Text style={detailRow}>
              <strong>Date:</strong> {tourDate}
            </Text>
            <Text style={detailRow}>
              <strong>Time:</strong> {tourTime}
            </Text>
            <Text style={detailRow}>
              <strong>Participants:</strong> {participantCount} {participantCount === 1 ? 'person' : 'people'}
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

          {manifestUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={manifestUrl}>
                View Full Manifest
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            If you have any questions or need to make changes, please contact us
            immediately.
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

export default GuideReminderEmail;

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

const tourCard = {
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #fed7aa",
};

const tourTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
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
  borderColor: "#fed7aa",
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
