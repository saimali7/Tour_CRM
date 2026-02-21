import { redirect } from "next/navigation";
import { createServices, logger } from "@tour/services";
import { requireOrganization } from "@/lib/organization";

interface PageProps {
  params: Promise<{
    slug: string;
    token: string;
  }>;
}

function readScheduleFromMetadata(metadata: unknown): { date: string | null; time: string | null } {
  if (!metadata || typeof metadata !== "object") {
    return { date: null, time: null };
  }

  const source = metadata as {
    bookingDate?: unknown;
    bookingTime?: unknown;
  };

  const bookingDate =
    typeof source.bookingDate === "string" && source.bookingDate.trim().length > 0
      ? source.bookingDate.trim()
      : null;
  const bookingTime =
    typeof source.bookingTime === "string" && source.bookingTime.trim().length > 0
      ? source.bookingTime.trim()
      : null;

  return {
    date: bookingDate,
    time: bookingTime,
  };
}

export default async function RecoverCartPage({ params }: PageProps) {
  const { slug, token } = await params;
  const org = await requireOrganization(slug);
  const services = createServices({ organizationId: org.id });

  const recoveryToken = token.trim();
  if (!recoveryToken) {
    redirect(`/org/${slug}`);
  }

  const cart = await services.abandonedCart.getByRecoveryToken(recoveryToken);
  if (!cart) {
    redirect(`/org/${slug}/booking?recovery=invalid`);
  }

  if (cart.status !== "active") {
    redirect(`/org/${slug}/booking?recovery=${encodeURIComponent(cart.status)}`);
  }

  if (cart.expiresAt && new Date(cart.expiresAt) < new Date()) {
    try {
      await services.abandonedCart.updateStatus(cart.id, "expired");
    } catch (error) {
      logger.warn(
        { err: error, cartId: cart.id, organizationId: org.id },
        "Failed to mark recovered cart as expired"
      );
    }
    redirect(`/org/${slug}/booking?recovery=expired`);
  }

  const schedule = readScheduleFromMetadata(cart.metadata);
  if (!schedule.date || !schedule.time) {
    redirect(`/org/${slug}/tours/${cart.tour.slug}`);
  }

  redirect(
    `/org/${slug}/tours/${cart.tour.slug}/book` +
      `?date=${encodeURIComponent(schedule.date)}` +
      `&time=${encodeURIComponent(schedule.time)}` +
      `&cart=${encodeURIComponent(recoveryToken)}`
  );
}
