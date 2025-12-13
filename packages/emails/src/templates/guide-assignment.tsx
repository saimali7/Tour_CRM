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

interface GuideAssignmentEmailProps {
  guideName: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  meetingPoint?: string;
  meetingPointDetails?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  confirmUrl?: string;
  declineUrl?: string;
  manifestUrl?: string;
  logoUrl?: string;
}

export const GuideAssignmentEmail = ({
  guideName = "John",
  tourName = "Amazing City Walking Tour",
  tourDate = "January 15, 2025",
  tourTime = "10:00 AM - 12:00 PM",
  meetingPoint = "Main Square Fountain",
  meetingPointDetails = "Meet participants at the fountain",
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  confirmUrl = "https://example.com/assignments/confirm/123",
  declineUrl = "https://example.com/assignments/decline/123",
  manifestUrl = "https://example.com/manifest/123",
  logoUrl,
}: GuideAssignmentEmailProps) => {
  const previewText = `You've been assigned to lead ${tourName}`;

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
          <Heading style={heading}>New Tour Assignment</Heading>
          <Text style={paragraph}>Hi {guideName},</Text>
          <Text style={paragraph}>
            You've been assigned to lead a tour. Please review the details below
            and confirm your availability.
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

          <Section style={actionButtons}>
            {confirmUrl && (
              <Button style={confirmButton} href={confirmUrl}>
                Confirm Assignment
              </Button>
            )}
            {declineUrl && (
              <Button style={declineButton} href={declineUrl}>
                Decline
              </Button>
            )}
          </Section>

          {manifestUrl && (
            <Section style={buttonContainer}>
              <Link href={manifestUrl} style={link}>
                View Tour Manifest
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={paragraph}>
            Please confirm or decline this assignment as soon as possible.
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

export default GuideAssignmentEmail;

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
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #e2e8f0",
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

const actionButtons = {
  textAlign: "center" as const,
  margin: "24px 40px",
};

const confirmButton = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  marginRight: "12px",
};

const declineButton = {
  backgroundColor: "#dc2626",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
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
