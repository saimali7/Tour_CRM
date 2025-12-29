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

interface TeamInviteEmailProps {
  inviteeName?: string;
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  organizationEmail?: string;
  logoUrl?: string;
}

export const TeamInviteEmail = ({
  inviteeName = "Team Member",
  inviterName = "Admin",
  organizationName = "Tour Company",
  role = "support",
  acceptUrl = "https://example.com/accept-invite",
  organizationEmail = "info@tourcompany.com",
  logoUrl,
}: TeamInviteEmailProps) => {
  const previewText = `You've been invited to join ${organizationName}`;

  const roleDisplayNames: Record<string, string> = {
    owner: "Owner",
    admin: "Administrator",
    manager: "Manager",
    support: "Support Staff",
    guide: "Tour Guide",
  };

  const roleDescription: Record<string, string> = {
    owner: "Full access to all features and settings",
    admin: "Manage team, bookings, and organization settings",
    manager: "Manage bookings, tours, and view reports",
    support: "View and manage bookings and customer inquiries",
    guide: "View assigned tours and schedules",
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          {logoUrl && (
            <Section style={logoSection}>
              <Img
                src={logoUrl}
                width="120"
                height="40"
                alt={organizationName}
                style={logo}
              />
            </Section>
          )}

          {/* Header */}
          <Heading style={heading}>You're Invited!</Heading>

          {/* Main Content */}
          <Text style={paragraph}>Hi{inviteeName ? ` ${inviteeName}` : ""},</Text>

          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to join{" "}
            <strong>{organizationName}</strong> on Tour CRM.
          </Text>

          {/* Role Info Box */}
          <Section style={roleBox}>
            <Text style={roleTitle}>Your Role</Text>
            <Text style={roleName}>{roleDisplayNames[role] || role}</Text>
            <Text style={roleDesc}>
              {roleDescription[role] || "Access to the platform"}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={paragraph}>
            By accepting this invitation, you'll be able to sign in and access{" "}
            {organizationName}'s dashboard.
          </Text>

          <Hr style={hr} />

          {/* What to Expect */}
          <Text style={sectionTitle}>What you can do:</Text>
          <Text style={listItem}>• Manage tour bookings and schedules</Text>
          <Text style={listItem}>• View customer information</Text>
          <Text style={listItem}>• Access team collaboration tools</Text>
          <Text style={listItem}>• Track tour performance and analytics</Text>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footerText}>
            If you didn't expect this invitation, you can safely ignore this
            email.
          </Text>

          <Text style={footerText}>
            Questions?{" "}
            <Link href={`mailto:${organizationEmail}`} style={link}>
              Contact us
            </Link>
          </Text>

          <Text style={footerSignature}>
            — The {organizationName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamInviteEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "560px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logo = {
  margin: "0 auto",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "28px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const roleBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #e2e8f0",
};

const roleTitle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const roleName = {
  color: "#0f172a",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const roleDesc = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0f766e",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "24px 0",
};

const sectionTitle = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const listItem = {
  color: "#525f7f",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
};

const footerText = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
};

const footerSignature = {
  color: "#525f7f",
  fontSize: "14px",
  fontWeight: "500",
  margin: "24px 0 0",
};

const link = {
  color: "#0f766e",
  textDecoration: "underline",
};
