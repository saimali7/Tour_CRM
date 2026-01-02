import { z } from "zod";
import { createRouter, protectedProcedure } from "../trpc";
import { db } from "@tour/database";
import { bookings, customers, tours, guides } from "@tour/database/schema";
import { and, eq, ilike, or, sql, desc, gte } from "drizzle-orm";

export type EntityType = "booking" | "customer" | "tour" | "guide";

export interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
}

export const searchRouter = createRouter({
  /**
   * Global search across all entities
   * Searches bookings, customers, tours, schedules, and guides
   */
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      const orgId = ctx.orgContext.organizationId;
      const searchPattern = `%${query.toLowerCase()}%`;
      const perEntityLimit = Math.ceil(limit / 4);

      // Search all entities in parallel
      const [
        bookingResults,
        customerResults,
        tourResults,
        guideResults,
      ] = await Promise.all([
        // Search bookings by reference number or customer name
        db
          .select({
            id: bookings.id,
            referenceNumber: bookings.referenceNumber,
            customerFirstName: customers.firstName,
            customerLastName: customers.lastName,
            status: bookings.status,
          })
          .from(bookings)
          .leftJoin(customers, eq(bookings.customerId, customers.id))
          .where(
            and(
              eq(bookings.organizationId, orgId),
              or(
                ilike(bookings.referenceNumber, searchPattern),
                ilike(customers.firstName, searchPattern),
                ilike(customers.lastName, searchPattern),
                ilike(customers.email, searchPattern)
              )
            )
          )
          .orderBy(desc(bookings.createdAt))
          .limit(perEntityLimit),

        // Search customers by name, email, or phone
        db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
          })
          .from(customers)
          .where(
            and(
              eq(customers.organizationId, orgId),
              or(
                ilike(customers.firstName, searchPattern),
                ilike(customers.lastName, searchPattern),
                ilike(customers.email, searchPattern),
                ilike(sql`COALESCE(${customers.phone}, '')`, searchPattern)
              )
            )
          )
          .orderBy(desc(customers.createdAt))
          .limit(perEntityLimit),

        // Search tours by name or description
        db
          .select({
            id: tours.id,
            name: tours.name,
            shortDescription: tours.shortDescription,
            status: tours.status,
          })
          .from(tours)
          .where(
            and(
              eq(tours.organizationId, orgId),
              or(
                ilike(tours.name, searchPattern),
                ilike(sql`COALESCE(${tours.shortDescription}, '')`, searchPattern),
                ilike(sql`COALESCE(${tours.description}, '')`, searchPattern)
              )
            )
          )
          .orderBy(desc(tours.createdAt))
          .limit(perEntityLimit),

        // Search guides by name or email
        db
          .select({
            id: guides.id,
            firstName: guides.firstName,
            lastName: guides.lastName,
            email: guides.email,
            status: guides.status,
          })
          .from(guides)
          .where(
            and(
              eq(guides.organizationId, orgId),
              or(
                ilike(guides.firstName, searchPattern),
                ilike(guides.lastName, searchPattern),
                ilike(guides.email, searchPattern)
              )
            )
          )
          .orderBy(desc(guides.createdAt))
          .limit(perEntityLimit),
      ]);

      // Transform results into unified format
      const results: SearchResult[] = [];

      // Add booking results
      for (const booking of bookingResults) {
        results.push({
          id: booking.id,
          type: "booking",
          title: `Booking #${booking.referenceNumber}`,
          subtitle: booking.customerFirstName
            ? `${booking.customerFirstName} ${booking.customerLastName} - ${booking.status}`
            : booking.status,
        });
      }

      // Add customer results
      for (const customer of customerResults) {
        results.push({
          id: customer.id,
          type: "customer",
          title: `${customer.firstName} ${customer.lastName}`,
          subtitle: customer.email || customer.phone || undefined,
        });
      }

      // Add tour results
      for (const tour of tourResults) {
        results.push({
          id: tour.id,
          type: "tour",
          title: tour.name,
          subtitle: tour.shortDescription || tour.status,
        });
      }

      // Add guide results
      for (const guide of guideResults) {
        results.push({
          id: guide.id,
          type: "guide",
          title: `${guide.firstName} ${guide.lastName}`,
          subtitle: guide.email,
        });
      }

      return {
        results: results.slice(0, limit),
        counts: {
          bookings: bookingResults.length,
          customers: customerResults.length,
          tours: tourResults.length,
          guides: guideResults.length,
        },
      };
    }),

  /**
   * Get recent items for quick access (no search query)
   * Shows recently created/modified items (bookings, customers, upcoming tour bookings)
   */
  recent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.orgContext.organizationId;
      const perEntityLimit = Math.ceil(input.limit / 3);

      // Get recent bookings, customers, and upcoming tour bookings
      const today = new Date();
      const [recentBookings, recentCustomers, upcomingTourBookings] = await Promise.all([
        db
          .select({
            id: bookings.id,
            referenceNumber: bookings.referenceNumber,
            customerFirstName: customers.firstName,
            customerLastName: customers.lastName,
          })
          .from(bookings)
          .leftJoin(customers, eq(bookings.customerId, customers.id))
          .where(eq(bookings.organizationId, orgId))
          .orderBy(desc(bookings.createdAt))
          .limit(perEntityLimit),

        db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
          })
          .from(customers)
          .where(eq(customers.organizationId, orgId))
          .orderBy(desc(customers.createdAt))
          .limit(perEntityLimit),

        // Get upcoming tour bookings (replacing schedules)
        db
          .select({
            id: bookings.id,
            bookingDate: bookings.bookingDate,
            bookingTime: bookings.bookingTime,
            tourName: tours.name,
          })
          .from(bookings)
          .leftJoin(tours, eq(bookings.tourId, tours.id))
          .where(
            and(
              eq(bookings.organizationId, orgId),
              eq(bookings.status, "confirmed"),
              gte(bookings.bookingDate, today)
            )
          )
          .orderBy(bookings.bookingDate)
          .limit(perEntityLimit),
      ]);

      const results: SearchResult[] = [];

      for (const booking of recentBookings) {
        results.push({
          id: booking.id,
          type: "booking",
          title: `Booking #${booking.referenceNumber}`,
          subtitle: booking.customerFirstName
            ? `${booking.customerFirstName} ${booking.customerLastName}`
            : undefined,
        });
      }

      for (const customer of recentCustomers) {
        results.push({
          id: customer.id,
          type: "customer",
          title: `${customer.firstName} ${customer.lastName}`,
          subtitle: customer.email || customer.phone || undefined,
        });
      }

      // Show upcoming tour bookings
      for (const tourBooking of upcomingTourBookings) {
        if (tourBooking.bookingDate) {
          const dateStr = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(tourBooking.bookingDate);
          results.push({
            id: tourBooking.id,
            type: "booking",
            title: tourBooking.tourName || "Unknown Tour",
            subtitle: `${dateStr}${tourBooking.bookingTime ? ` at ${tourBooking.bookingTime}` : ""}`,
          });
        }
      }

      return { results };
    }),
});
