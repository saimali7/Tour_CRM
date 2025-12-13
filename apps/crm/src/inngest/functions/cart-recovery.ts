import { inngest } from "../client";
import { createServices } from "@tour/services";

/**
 * Process abandoned carts and send recovery emails
 * This function runs on a schedule (via cron) to process carts at different stages
 */
export const processAbandonedCarts = inngest.createFunction(
  {
    id: "process-abandoned-carts",
    name: "Process Abandoned Carts",
    retries: 2,
  },
  { event: "automation/process-abandoned-carts" },
  async ({ event, step }) => {
    const { organizationId } = event.data;
    const services = createServices({ organizationId });

    // Check if cart recovery automation is enabled
    const automation1 = await step.run("check-automation-1", async () => {
      return services.communication.getAutomationByType("abandoned_cart_1");
    });

    const automation2 = await step.run("check-automation-2", async () => {
      return services.communication.getAutomationByType("abandoned_cart_2");
    });

    const automation3 = await step.run("check-automation-3", async () => {
      return services.communication.getAutomationByType("abandoned_cart_3");
    });

    const results = {
      email1Sent: 0,
      email2Sent: 0,
      email3Sent: 0,
    };

    // Process Email 1 (15 minutes after abandonment)
    if (automation1?.isActive) {
      const cartsForEmail1 = await step.run("get-carts-for-email-1", async () => {
        return services.abandonedCart.getCartsForEmail1();
      });

      for (const cart of cartsForEmail1) {
        await step.run(`send-email-1-${cart.id}`, async () => {
          // Get template
          const template = await services.communication.getEmailTemplateByType("abandoned_cart_1");
          if (!template) return;

          // Get tour details
          const tour = cart.tourId
            ? await services.tour.getById(cart.tourId)
            : null;

          // Substitute variables
          const content = services.communication.substituteVariables(template.contentHtml, {
            customer_name: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || "Valued Customer",
            customer_first_name: cart.firstName || "there",
            tour_name: tour?.name || "your selected tour",
            recovery_link: `${process.env.NEXT_PUBLIC_WEB_URL || ""}/recover/${cart.recoveryToken}`,
            cart_total: cart.total ? `$${cart.total}` : "",
          });

          const subject = services.communication.substituteVariables(template.subject, {
            tour_name: tour?.name || "your tour",
          });

          // Log the communication
          await services.communication.createLog({
            customerId: cart.customerId || undefined,
            recipientEmail: cart.email,
            recipientName: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || undefined,
            tourId: cart.tourId,
            type: "email",
            templateId: template.id,
            templateName: template.name,
            subject,
            content,
            status: "pending",
            metadata: { trigger: "abandoned_cart_1", cartId: cart.id },
          });

          // Update cart
          await services.abandonedCart.incrementEmailsSent(cart.id);
        });
        results.email1Sent++;
      }
    }

    // Process Email 2 (24 hours after abandonment)
    if (automation2?.isActive) {
      const cartsForEmail2 = await step.run("get-carts-for-email-2", async () => {
        return services.abandonedCart.getCartsForEmail2();
      });

      for (const cart of cartsForEmail2) {
        await step.run(`send-email-2-${cart.id}`, async () => {
          const template = await services.communication.getEmailTemplateByType("abandoned_cart_2");
          if (!template) return;

          const tour = cart.tourId
            ? await services.tour.getById(cart.tourId)
            : null;

          const content = services.communication.substituteVariables(template.contentHtml, {
            customer_name: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || "Valued Customer",
            customer_first_name: cart.firstName || "there",
            tour_name: tour?.name || "your selected tour",
            recovery_link: `${process.env.NEXT_PUBLIC_WEB_URL || ""}/recover/${cart.recoveryToken}`,
            cart_total: cart.total ? `$${cart.total}` : "",
            discount_code: automation2.discountCode || "",
            discount_percentage: automation2.discountPercentage?.toString() || "",
          });

          const subject = services.communication.substituteVariables(template.subject, {
            tour_name: tour?.name || "your tour",
          });

          await services.communication.createLog({
            customerId: cart.customerId || undefined,
            recipientEmail: cart.email,
            recipientName: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || undefined,
            tourId: cart.tourId,
            type: "email",
            templateId: template.id,
            templateName: template.name,
            subject,
            content,
            status: "pending",
            metadata: { trigger: "abandoned_cart_2", cartId: cart.id },
          });

          await services.abandonedCart.incrementEmailsSent(cart.id);
        });
        results.email2Sent++;
      }
    }

    // Process Email 3 (72 hours after abandonment)
    if (automation3?.isActive) {
      const cartsForEmail3 = await step.run("get-carts-for-email-3", async () => {
        return services.abandonedCart.getCartsForEmail3();
      });

      for (const cart of cartsForEmail3) {
        await step.run(`send-email-3-${cart.id}`, async () => {
          const template = await services.communication.getEmailTemplateByType("abandoned_cart_3");
          if (!template) return;

          const tour = cart.tourId
            ? await services.tour.getById(cart.tourId)
            : null;

          const content = services.communication.substituteVariables(template.contentHtml, {
            customer_name: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || "Valued Customer",
            customer_first_name: cart.firstName || "there",
            tour_name: tour?.name || "your selected tour",
            recovery_link: `${process.env.NEXT_PUBLIC_WEB_URL || ""}/recover/${cart.recoveryToken}`,
            cart_total: cart.total ? `$${cart.total}` : "",
            discount_code: automation3.discountCode || "",
            discount_percentage: automation3.discountPercentage?.toString() || "",
          });

          const subject = services.communication.substituteVariables(template.subject, {
            tour_name: tour?.name || "your tour",
          });

          await services.communication.createLog({
            customerId: cart.customerId || undefined,
            recipientEmail: cart.email,
            recipientName: `${cart.firstName || ""} ${cart.lastName || ""}`.trim() || undefined,
            tourId: cart.tourId,
            type: "email",
            templateId: template.id,
            templateName: template.name,
            subject,
            content,
            status: "pending",
            metadata: { trigger: "abandoned_cart_3", cartId: cart.id },
          });

          await services.abandonedCart.incrementEmailsSent(cart.id);
        });
        results.email3Sent++;
      }
    }

    // Expire old carts
    await step.run("expire-old-carts", async () => {
      return services.abandonedCart.expireOldCarts();
    });

    return results;
  }
);

/**
 * Handle cart abandonment event - triggered when a cart is detected as abandoned
 */
export const handleCartAbandoned = inngest.createFunction(
  {
    id: "handle-cart-abandoned",
    name: "Handle Cart Abandoned",
    retries: 2,
  },
  { event: "cart/abandoned" },
  async ({ event, step }) => {
    const { data } = event;
    const services = createServices({ organizationId: data.organizationId });

    // Wait 15 minutes before sending the first email
    await step.sleep("wait-for-recovery", "15m");

    // Check if cart is still abandoned (not recovered)
    const cart = await step.run("check-cart-status", async () => {
      return services.abandonedCart.getByRecoveryToken(data.recoveryToken);
    });

    if (!cart || cart.status !== "active") {
      return { skipped: true, reason: "Cart already recovered or expired" };
    }

    // Get automation settings
    const automation = await step.run("get-automation", async () => {
      return services.communication.getAutomationByType("abandoned_cart_1");
    });

    if (!automation?.isActive) {
      return { skipped: true, reason: "Automation disabled" };
    }

    // Get email template
    const template = await step.run("get-template", async () => {
      return services.communication.getEmailTemplateByType("abandoned_cart_1");
    });

    if (!template) {
      return { skipped: true, reason: "No template configured" };
    }

    // Send the first recovery email
    await step.run("send-recovery-email", async () => {
      const content = services.communication.substituteVariables(template.contentHtml, {
        customer_name: data.customerName || "Valued Customer",
        customer_first_name: data.customerName?.split(" ")[0] || "there",
        tour_name: data.tourName,
        tour_date: data.tourDate || "",
        recovery_link: `${process.env.NEXT_PUBLIC_WEB_URL || ""}/recover/${data.recoveryToken}`,
        cart_total: data.cartTotal || "",
      });

      const subject = services.communication.substituteVariables(template.subject, {
        tour_name: data.tourName,
      });

      await services.communication.createLog({
        recipientEmail: data.email,
        recipientName: data.customerName,
        type: "email",
        templateId: template.id,
        templateName: template.name,
        subject,
        content,
        status: "pending",
        metadata: { trigger: "abandoned_cart_1", cartId: data.cartId },
      });

      await services.abandonedCart.incrementEmailsSent(data.cartId);
    });

    return { success: true, emailSent: "abandoned_cart_1" };
  }
);
