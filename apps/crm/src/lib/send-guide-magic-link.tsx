import { createServices, logger, ServiceError } from "@tour/services";
import { generateGuideMagicLink } from "./guide-auth";

// Dynamic email sending using fetch to avoid build-time dependency
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string,
  fromEmail?: string
): Promise<{ id?: string; error?: { message: string } }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new ServiceError("RESEND_API_KEY environment variable must be set", "CONFIG_MISSING", 503);
    }

    const senderEmail = fromEmail || "onboarding@resend.dev";

    // Use fetch API to call Resend directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${senderEmail}>`,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: { message: data.message || "Email send failed" } };
    }

    return { id: data.id };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : "Unknown error" } };
  }
}

/**
 * Generate HTML email template for guide magic link
 */
function generateMagicLinkEmailHtml(
  guideName: string,
  magicLink: string,
  organizationName: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h1 style="font-size: 24px; margin: 0 0 24px 0; color: #1a1a1a;">Welcome to the Guide Portal</h1>

      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px 0; color: #3c4149;">
        Hi ${guideName},
      </p>

      <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px 0; color: #3c4149;">
        Click the button below to access your guide portal for ${organizationName}:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">
          Access Guide Portal
        </a>
      </div>

      <p style="font-size: 14px; line-height: 20px; margin: 0 0 16px 0; color: #64748b;">
        Or copy and paste this link into your browser:
      </p>

      <p style="font-size: 14px; line-height: 20px; margin: 0 0 32px 0;">
        <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
      </p>

      <p style="font-size: 14px; line-height: 20px; margin: 0 0 16px 0; color: #64748b;">
        This link will expire in 7 days.
      </p>

      <p style="font-size: 14px; line-height: 20px; margin: 0; color: #64748b;">
        If you didn't request this link, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export interface SendGuideMagicLinkResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a magic link to a guide via email
 */
export async function sendGuideMagicLink(
  guideId: string,
  organizationId: string,
  guideEmail: string,
  guideName: string,
  organizationName: string,
  baseUrl?: string
): Promise<SendGuideMagicLinkResult> {
  try {
    // Use environment variable or fallback for development
    const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new ServiceError("NEXT_PUBLIC_APP_URL environment variable must be set or baseUrl must be provided", "CONFIG_MISSING", 503);
    }

    // Generate the magic link
    const magicLink = await generateGuideMagicLink(guideId, organizationId, appUrl);

    // Get organization sender email from General Settings
    const services = createServices({ organizationId });
    const organization = await services.organization.get();

    // Send email using Resend API
    const { id, error } = await sendEmail(
      guideEmail,
      "Your Guide Portal Access Link",
      generateMagicLinkEmailHtml(guideName, magicLink, organizationName),
      organizationName,
      organization.fromEmail ?? undefined
    );

    if (error) {
      logger.error({ err: error, guideId, guideEmail }, "Failed to send guide magic link email");
      return { success: false, error: error.message };
    }

    return { success: true, messageId: id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err, guideId, guideEmail }, "Failed to send guide magic link");
    return { success: false, error: errorMessage };
  }
}

/**
 * Example usage in a tRPC mutation or API route:
 *
 * sendMagicLinkToGuide: adminProcedure
 *   .input(z.object({ guideId: z.string() }))
 *   .mutation(async ({ ctx, input }) => {
 *     const guide = await db.query.guides.findFirst({
 *       where: and(
 *         eq(guides.id, input.guideId),
 *         eq(guides.organizationId, ctx.orgContext.organizationId)
 *       ),
 *     });
 *
 *     if (!guide) {
 *       throw new TRPCError({ code: "NOT_FOUND", message: "Guide not found" });
 *     }
 *
 *     const magicLink = await sendGuideMagicLink(
 *       guide.id,
 *       ctx.orgContext.organizationId,
 *       guide.email
 *     );
 *
 *     return { success: true, magicLink };
 *   }),
 */
