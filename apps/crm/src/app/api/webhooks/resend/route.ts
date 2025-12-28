import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db, communicationLogs } from "@tour/database";
import { eq } from "drizzle-orm";
import { webhookLogger } from "@tour/services";
import crypto from "crypto";

/**
 * Resend Webhook Handler
 *
 * Handles Resend webhook events for email tracking.
 *
 * Events handled:
 * - email.sent - Email was sent successfully
 * - email.delivered - Email was delivered to recipient
 * - email.opened - Email was opened by recipient
 * - email.clicked - Link in email was clicked
 * - email.bounced - Email bounced (hard/soft)
 * - email.complained - Recipient marked as spam
 *
 * Webhook setup at: https://resend.com/webhooks
 * Endpoint: https://crm.desertthrill.com/api/webhooks/resend
 */

interface ResendWebhookEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
    | "email.complained";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For click events
    click?: {
      link: string;
      timestamp: string;
      userAgent: string;
      ipAddress: string;
    };
    // For bounce events
    bounce?: {
      message: string;
      type: "hard" | "soft";
    };
  };
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("svix-signature");
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");

  // Resend uses Svix for webhooks - verify signature
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    webhookLogger.error("Missing RESEND_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify the webhook signature using Svix format
  if (!signature || !svixId || !svixTimestamp) {
    webhookLogger.error("Missing Svix headers");
    return NextResponse.json(
      { error: "Missing webhook signature headers" },
      { status: 400 }
    );
  }

  // Svix signature verification
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const secret = process.env.RESEND_WEBHOOK_SECRET.startsWith("whsec_")
    ? Buffer.from(process.env.RESEND_WEBHOOK_SECRET.slice(6), "base64")
    : Buffer.from(process.env.RESEND_WEBHOOK_SECRET, "base64");

  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedContent)
    .digest("base64");

  // Svix sends multiple signatures separated by spaces, check if any match
  const signatures = signature.split(" ").map((s) => s.split(",")[1]);
  const isValid = signatures.some(
    (sig) =>
      sig &&
      crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(sig)
      )
  );

  if (!isValid) {
    webhookLogger.error("Webhook signature verification failed");
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    webhookLogger.error("Invalid JSON in webhook body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log webhook receipt
  webhookLogger.info(
    {
      eventType: event.type,
      emailId: event.data.email_id,
      to: event.data.to,
      subject: event.data.subject,
    },
    "Resend webhook received"
  );

  try {
    const emailId = event.data.email_id;
    const now = new Date();

    // Find the communication log by external ID (Resend email ID)
    const log = await db.query.communicationLogs.findFirst({
      where: eq(communicationLogs.externalId, emailId),
    });

    if (!log) {
      // Email not tracked in our system - might be from direct Resend sends
      webhookLogger.info(
        { emailId, eventType: event.type },
        "Email not found in communication logs - skipping"
      );
      return NextResponse.json({ received: true, tracked: false });
    }

    switch (event.type) {
      case "email.sent":
        await db
          .update(communicationLogs)
          .set({
            status: "sent",
            sentAt: now,
            metadata: {
              ...((log.metadata as Record<string, unknown>) || {}),
              webhookPayload: { type: event.type, timestamp: event.created_at },
            },
          })
          .where(eq(communicationLogs.id, log.id));
        webhookLogger.info({ emailId, logId: log.id }, "Email marked as sent");
        break;

      case "email.delivered":
        await db
          .update(communicationLogs)
          .set({
            status: "delivered",
            deliveredAt: now,
            metadata: {
              ...((log.metadata as Record<string, unknown>) || {}),
              webhookPayload: { type: event.type, timestamp: event.created_at },
            },
          })
          .where(eq(communicationLogs.id, log.id));
        webhookLogger.info({ emailId, logId: log.id }, "Email marked as delivered");
        break;

      case "email.opened":
        // Only update if not already opened (first open)
        if (!log.openedAt) {
          await db
            .update(communicationLogs)
            .set({
              status: "opened",
              openedAt: now,
              metadata: {
                ...((log.metadata as Record<string, unknown>) || {}),
                webhookPayload: { type: event.type, timestamp: event.created_at },
              },
            })
            .where(eq(communicationLogs.id, log.id));
          webhookLogger.info({ emailId, logId: log.id }, "Email marked as opened");
        }
        break;

      case "email.clicked":
        // Track the click and update status
        const existingLinks = (log.metadata as { links?: Array<{ url: string; clicks: number }> })?.links || [];
        const clickedUrl = event.data.click?.link || "";
        const linkIndex = existingLinks.findIndex((l) => l.url === clickedUrl);

        if (linkIndex >= 0 && existingLinks[linkIndex]) {
          existingLinks[linkIndex].clicks += 1;
        } else if (clickedUrl) {
          existingLinks.push({ url: clickedUrl, clicks: 1 });
        }

        await db
          .update(communicationLogs)
          .set({
            status: "clicked",
            clickedAt: log.clickedAt || now, // Keep first click time
            metadata: {
              ...((log.metadata as Record<string, unknown>) || {}),
              links: existingLinks,
              webhookPayload: {
                type: event.type,
                timestamp: event.created_at,
                click: event.data.click,
              },
            },
          })
          .where(eq(communicationLogs.id, log.id));
        webhookLogger.info(
          { emailId, logId: log.id, url: clickedUrl },
          "Email link clicked"
        );
        break;

      case "email.bounced":
        await db
          .update(communicationLogs)
          .set({
            status: "bounced",
            failedAt: now,
            statusDetails: event.data.bounce?.message || "Email bounced",
            metadata: {
              ...((log.metadata as Record<string, unknown>) || {}),
              errorMessage: event.data.bounce?.message,
              webhookPayload: {
                type: event.type,
                timestamp: event.created_at,
                bounceType: event.data.bounce?.type,
              },
            },
          })
          .where(eq(communicationLogs.id, log.id));
        webhookLogger.warn(
          {
            emailId,
            logId: log.id,
            bounceType: event.data.bounce?.type,
            message: event.data.bounce?.message,
          },
          "Email bounced"
        );
        break;

      case "email.complained":
        await db
          .update(communicationLogs)
          .set({
            status: "failed",
            failedAt: now,
            statusDetails: "Marked as spam by recipient",
            metadata: {
              ...((log.metadata as Record<string, unknown>) || {}),
              errorMessage: "Spam complaint",
              webhookPayload: { type: event.type, timestamp: event.created_at },
            },
          })
          .where(eq(communicationLogs.id, log.id));
        webhookLogger.warn({ emailId, logId: log.id }, "Email marked as spam");
        break;

      case "email.delivery_delayed":
        webhookLogger.info(
          { emailId, logId: log.id },
          "Email delivery delayed - will retry"
        );
        break;

      default:
        webhookLogger.info(
          { eventType: event.type, emailId },
          "Unhandled Resend webhook event type"
        );
    }

    return NextResponse.json({ received: true, tracked: true });
  } catch (error) {
    webhookLogger.error(
      {
        eventType: event.type,
        emailId: event.data.email_id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error processing Resend webhook event"
    );

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
