import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface TourManifestItem {
  tourName: string;
  time: string;
  participantCount: number;
  meetingPoint?: string;
  manifestUrl?: string;
}

interface GuideDailyManifestEmailProps {
  guideName: string;
  date: string;
  tours: TourManifestItem[];
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  logoUrl?: string;
}

export const GuideDailyManifestEmail = ({
  guideName = "John",
  date = "Today, January 15, 2025",
  tours = [
    {
      tourName: "Morning City Tour",
      time: "9:00 AM - 11:00 AM",
      participantCount: 8,
      meetingPoint: "Main Square",
      manifestUrl: "https://example.com/manifest/1",
    },
    {
      tourName: "Afternoon Food Tour",
      time: "2:00 PM - 4:00 PM",
      participantCount: 12,
      meetingPoint: "Central Market",
      manifestUrl: "https://example.com/manifest/2",
    },
  ],
  organizationName = "Tour Company",
  organizationEmail = "info@tourcompany.com",
  organizationPhone = "+1 234 567 890",
  logoUrl,
}: GuideDailyManifestEmailProps) => {
  const previewText = `Your tour schedule for ${date}`;
  const totalParticipants = tours.reduce(
    (sum, tour) => sum + tour.participantCount,
    0
  );

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
          <Heading style={heading}>Your Daily Schedule</Heading>
          <Text style={paragraph}>Hi {guideName},</Text>
          <Text style={paragraph}>
            Here's your tour schedule for {date.toLowerCase()}. You have {tours.length}{" "}
            {tours.length === 1 ? "tour" : "tours"} with a total of{" "}
            {totalParticipants} {totalParticipants === 1 ? "participant" : "participants"}.
          </Text>

          <Section style={scheduleSection}>
            {tours.map((tour, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Hr style={hr} />}
                <Section style={tourItem}>
                  <Row>
                    <Column>
                      <Text style={tourNumber}>Tour {index + 1}</Text>
                    </Column>
                  </Row>
                  <Text style={tourName}>{tour.tourName}</Text>
                  <Text style={tourTime}>{tour.time}</Text>
                  <Row style={tourDetails}>
                    <Column style={detailColumn}>
                      <Text style={detailLabel}>Participants</Text>
                      <Text style={detailValue}>{tour.participantCount}</Text>
                    </Column>
                    {tour.meetingPoint && (
                      <Column style={detailColumn}>
                        <Text style={detailLabel}>Meeting Point</Text>
                        <Text style={detailValue}>{tour.meetingPoint}</Text>
                      </Column>
                    )}
                  </Row>
                  {tour.manifestUrl && (
                    <Section style={manifestLinkContainer}>
                      <Link href={tour.manifestUrl} style={manifestLink}>
                        View Manifest →
                      </Link>
                    </Section>
                  )}
                </Section>
              </React.Fragment>
            ))}
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            Have a great day, and safe travels!
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

export default GuideDailyManifestEmail;

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

const scheduleSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "1px solid #e2e8f0",
};

const tourItem = {
  marginBottom: "8px",
};

const tourNumber = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const tourName = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 4px",
};

const tourTime = {
  fontSize: "14px",
  color: "#2563eb",
  fontWeight: "500",
  margin: "0 0 12px",
};

const tourDetails = {
  marginTop: "12px",
};

const detailColumn = {
  paddingRight: "16px",
};

const detailLabel = {
  fontSize: "12px",
  color: "#64748b",
  margin: "0 0 4px",
};

const detailValue = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1a1a1a",
  margin: "0",
};

const manifestLinkContainer = {
  marginTop: "12px",
};

const manifestLink = {
  fontSize: "14px",
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: "500",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
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
