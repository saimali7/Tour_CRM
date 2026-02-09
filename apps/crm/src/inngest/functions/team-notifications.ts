import { inngest } from "../client";
import { createEmailService, type OrganizationEmailConfig } from "@tour/emails";
import { createServices, logger } from "@tour/services";
import { z } from "zod";

// Validation schema for team/member-invited event
const teamMemberInvitedSchema = z.object({
  organizationId: z.string(),
  membershipId: z.string(),
  inviteeEmail: z.string().email(),
  inviteeName: z.string().optional(),
  inviterName: z.string(),
  role: z.string(),
});

/**
 * Send team invite email when a member is invited
 */
export const sendTeamInviteEmail = inngest.createFunction(
  {
    id: "send-team-invite-email",
    name: "Send Team Invite Email",
    retries: 3,
  },
  { event: "team/member-invited" },
  async ({ event, step }) => {
    // Validate event data
    const parseResult = teamMemberInvitedSchema.safeParse(event.data);
    if (!parseResult.success) {
      logger.error(
        { error: parseResult.error, eventData: event.data },
        "Invalid team/member-invited event data"
      );
      throw new Error(`Invalid event data for team/member-invited: ${parseResult.error.message}`);
    }

    const data = parseResult.data;
    logger.info(
      { eventId: event.id, membershipId: data.membershipId, inviteeEmail: data.inviteeEmail },
      "Processing team/member-invited email"
    );

    // Get organization details for email branding
    const org = await step.run("get-organization", async () => {
      const services = createServices({ organizationId: data.organizationId });
      return services.organization.get();
    });

    // Prepare org email config
    const orgConfig: OrganizationEmailConfig = {
      name: org.name,
      email: org.email,
      fromEmail: org.fromEmail ?? undefined,
      phone: org.phone ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
    };

    // Build accept URL - links to sign in page with org context
    // After signing in/up, the user will be redirected to the org dashboard
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/sign-in?redirect=/org/${org.slug}`;

    // Send the email
    const result = await step.run("send-email", async () => {
      const emailService = createEmailService(orgConfig);
      return emailService.sendTeamInvite({
        inviteeEmail: data.inviteeEmail,
        inviteeName: data.inviteeName,
        inviterName: data.inviterName,
        role: data.role,
        acceptUrl,
      });
    });

    if (!result.success) {
      logger.error(
        { error: result.error, inviteeEmail: data.inviteeEmail },
        "Failed to send team invite email"
      );
      throw new Error(`Failed to send team invite email: ${result.error}`);
    }

    logger.info(
      { messageId: result.messageId, inviteeEmail: data.inviteeEmail },
      "Team invite email sent successfully"
    );

    return {
      success: true,
      messageId: result.messageId,
      inviteeEmail: data.inviteeEmail,
    };
  }
);
