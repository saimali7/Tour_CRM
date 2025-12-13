import { generateGuideMagicLink } from "./guide-auth";

/**
 * Utility function to send a magic link to a guide
 * This should be integrated with your email service (e.g., Resend)
 * For now, it just generates the link and logs it
 *
 * In production, you would:
 * 1. Generate the magic link
 * 2. Send it via email using your email service
 * 3. Optionally log the action for audit purposes
 */
export async function sendGuideMagicLink(
  guideId: string,
  organizationId: string,
  guideEmail: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
): Promise<string> {
  // Generate the magic link
  const magicLink = await generateGuideMagicLink(guideId, organizationId, baseUrl);

  // TODO: Send email using Resend or your email service
  // Example:
  // await resend.emails.send({
  //   from: 'noreply@yourcompany.com',
  //   to: guideEmail,
  //   subject: 'Your Guide Portal Access Link',
  //   html: `
  //     <h2>Welcome to the Guide Portal</h2>
  //     <p>Click the link below to access your guide portal:</p>
  //     <a href="${magicLink}">Access Guide Portal</a>
  //     <p>This link will expire in 7 days.</p>
  //   `,
  // });

  // For development, log the magic link
  console.log(`Magic link for guide ${guideId}:`, magicLink);

  return magicLink;
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
