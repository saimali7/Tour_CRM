import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db, eq } from "@tour/database";
import { users } from "@tour/database/schema";
import { webhookLogger } from "@tour/services";

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    webhookLogger.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    webhookLogger.error({ err }, "Error verifying Clerk webhook");
    return new Response("Error verifying webhook", { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  webhookLogger.info({ eventType }, "Clerk webhook event received");

  try {
    switch (eventType) {
      case "user.created":
        await handleUserCreated(evt.data);
        break;

      case "user.updated":
        await handleUserUpdated(evt.data);
        break;

      case "user.deleted":
        await handleUserDeleted(evt.data);
        break;

      default:
        webhookLogger.info({ eventType }, "Unhandled Clerk webhook event type");
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    webhookLogger.error({ eventType, error }, "Error processing Clerk webhook");
    return new Response("Error processing webhook", { status: 500 });
  }
}

/**
 * Handle user.created event from Clerk
 * Creates a new user in our database
 */
async function handleUserCreated(data: WebhookEvent["data"]) {
  if (!("id" in data)) return;

  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data as {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    phone_numbers?: Array<{ phone_number: string }>;
  };

  const primaryEmail = email_addresses?.[0]?.email_address;

  if (!primaryEmail) {
    webhookLogger.error({ clerkUserId: id }, "User created without email address");
    return;
  }

  // Upsert user - handles duplicate webhooks and race conditions
  const result = await db
    .insert(users)
    .values({
      clerkId: id,
      email: primaryEmail,
      firstName: first_name,
      lastName: last_name,
      avatarUrl: image_url,
      phone: phone_numbers?.[0]?.phone_number,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: primaryEmail,
        firstName: first_name,
        lastName: last_name,
        avatarUrl: image_url,
        phone: phone_numbers?.[0]?.phone_number,
        updatedAt: new Date(),
      },
    })
    .returning();

  const newUser = result[0];
  if (newUser) {
    webhookLogger.info({ userId: newUser.id, clerkUserId: id }, "Upserted user from Clerk");
  }
}

/**
 * Handle user.updated event from Clerk
 * Updates the user in our database
 */
async function handleUserUpdated(data: WebhookEvent["data"]) {
  if (!("id" in data)) return;

  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data as {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    phone_numbers?: Array<{ phone_number: string }>;
  };

  const primaryEmail = email_addresses?.[0]?.email_address;

  // Find the user in our database
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, id),
  });

  if (!existingUser) {
    // User doesn't exist in our database yet, create them
    if (primaryEmail) {
      await handleUserCreated(data);
    }
    return;
  }

  // Update the user
  const updateResult = await db
    .update(users)
    .set({
      email: primaryEmail || existingUser.email,
      firstName: first_name,
      lastName: last_name,
      avatarUrl: image_url,
      phone: phone_numbers?.[0]?.phone_number,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkId, id))
    .returning();

  const updatedUser = updateResult[0];
  if (updatedUser) {
    webhookLogger.info({ userId: updatedUser.id, clerkUserId: id }, "Updated user from Clerk");
  }
}

/**
 * Handle user.deleted event from Clerk
 * Deletes the user from our database
 */
async function handleUserDeleted(data: WebhookEvent["data"]) {
  if (!("id" in data)) return;

  const { id } = data as { id: string };

  // Find the user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, id),
  });

  if (!existingUser) {
    webhookLogger.info({ clerkUserId: id }, "User not found in database (already deleted?)");
    return;
  }

  // Delete the user (cascade will handle organization memberships)
  await db.delete(users).where(eq(users.clerkId, id));

  webhookLogger.info({ clerkUserId: id }, "Deleted user from Clerk");
}
