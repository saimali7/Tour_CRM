import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, organizations, eq } from "@tour/database";
import { createServices, ServiceError, ValidationError } from "@tour/services";

interface ContactRequestBody {
  organizationId?: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Guest";
  const lastName = parts.slice(1).join(" ") || "Guest";
  return { firstName, lastName };
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactRequestBody = await request.json();
    const organizationId = body.organizationId?.trim() || "";

    const headersList = await headers();
    const orgSlug = headersList.get("x-org-slug");

    if (!orgSlug && !organizationId) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 400 }
      );
    }

    const org = await db.query.organizations.findFirst(
      orgSlug
        ? {
            where: eq(organizations.slug, orgSlug),
          }
        : {
            where: eq(organizations.id, organizationId),
          }
    );

    if (!org || org.status !== "active") {
      return NextResponse.json(
        { message: "Organization not found or inactive" },
        { status: 400 }
      );
    }

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || undefined;
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { message: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { message: "Message is too long" },
        { status: 400 }
      );
    }

    const services = createServices({ organizationId: org.id });
    const { firstName, lastName } = splitName(name);

    const customer = await services.customer.getOrCreate({
      email,
      firstName,
      lastName,
      phone,
      source: "website",
      sourceDetails: "contact_form",
    });

    const log = await services.communication.createLog({
      customerId: customer.id,
      recipientEmail: org.email || undefined,
      recipientName: org.name,
      type: "email",
      subject: `Contact Form: ${subject}`,
      content: message,
      contentPlain: message,
      status: "pending",
      metadata: {
        trigger: "contact_form",
        variables: {
          name,
          email,
          phone: phone || "",
          subject,
          orgSlug,
        },
      },
    });

    return NextResponse.json({
      message: "Message sent successfully",
      submissionId: log.id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: 400 }
      );
    }

    if (error instanceof ServiceError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Contact form submission error:", error);
    return NextResponse.json(
      { message: "Failed to send message" },
      { status: 500 }
    );
  }
}
