import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import {
  customers,
  bookings,
  communicationLogs,
  type Customer,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError } from "./types";
import { logger } from "./lib/logger";

const customerIntelligenceLogger = logger.child({ service: "customer-intelligence" });

// ============================================
// Types
// ============================================

export type CustomerSegment = "vip" | "loyal" | "promising" | "at_risk" | "dormant";

export type ReengagementTriggerType =
  | "at_risk_60_days"
  | "dormant_120_days"
  | "post_tour_review"
  | "post_tour_rebook"
  | "birthday"
  | "anniversary";

export interface CustomerScore {
  customerId: string;
  score: number; // 0-100
  lifetimeValueScore: number; // 0-30
  frequencyScore: number; // 0-25
  recencyScore: number; // 0-20
  engagementScore: number; // 0-15
  referralScore: number; // 0-10
  segment: CustomerSegment;
  calculatedAt: Date;
}

export interface CustomerWithScore extends Customer {
  score: number;
  segment: CustomerSegment;
  totalSpent: string;
  totalBookings: number;
  lastBookingAt: Date | null;
  daysSinceLastBooking: number | null;
}

export interface CustomerLifetimeValue {
  customerId: string;
  historicalCLV: string; // Total spent to date
  predictedCLV: string; // Predicted next 12 months
  averageOrderValue: string;
  bookingFrequency: number; // Bookings per year
  totalBookings: number;
  firstBookingAt: Date | null;
  lastBookingAt: Date | null;
  customerTenureDays: number | null;
}

export interface ReengagementCandidate {
  customerId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  triggerType: ReengagementTriggerType;
  daysSinceLastBooking: number;
  totalBookings: number;
  totalSpent: string;
  segment: CustomerSegment;
  lastBookingAt: Date | null;
}

export interface CustomerStatsReport {
  dateRange: { from: Date; to: Date };
  newCustomers: number;
  repeatCustomers: number;
  repeatRate: string; // Percentage
  averageCLV: string;
  acquisitionBySource: Record<string, number>;
  geographicDistribution: Array<{ country: string; count: number }>;
  segmentDistribution: Record<CustomerSegment, number>;
}

export interface SegmentDistribution {
  vip: number;
  loyal: number;
  promising: number;
  at_risk: number;
  dormant: number;
}

// ============================================
// Service
// ============================================

export class CustomerIntelligenceService extends BaseService {
  // ============================================
  // Customer Scoring (0-100)
  // ============================================

  /**
   * Calculate customer score based on weighted factors:
   * - Lifetime Value (30%): Total spend compared to org average
   * - Booking Frequency (25%): Bookings per year
   * - Recency (20%): Days since last booking
   * - Engagement (15%): Email opens/communications
   * - Referrals (10%): Friends referred (if tracked in metadata)
   */
  async calculateCustomerScore(customerId: string): Promise<CustomerScore> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", customerId);
    }

    // Get customer booking stats
    const bookingStats = await this.db
      .select({
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        totalBookings: count(),
        firstBookingAt: sql<Date | null>`MIN(${bookings.createdAt})`,
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, customerId),
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const stats = bookingStats[0];
    const totalSpent = parseFloat(stats?.totalSpent ?? "0");
    const totalBookings = stats?.totalBookings ?? 0;
    const firstBookingAt = stats?.firstBookingAt;
    const lastBookingAt = stats?.lastBookingAt;

    // Get organization average spend for comparison
    const orgAverageResult = await this.db
      .select({
        avgSpent: sql<string>`COALESCE(AVG(customer_total), 0)::TEXT`,
      })
      .from(
        sql`(
          SELECT
            ${bookings.customerId},
            SUM(CAST(${bookings.total} AS DECIMAL)) as customer_total
          FROM ${bookings}
          WHERE ${bookings.organizationId} = ${this.organizationId}
            AND ${bookings.status} != 'cancelled'
          GROUP BY ${bookings.customerId}
        ) as customer_totals`
      );

    const orgAverage = parseFloat(orgAverageResult[0]?.avgSpent ?? "0");

    // 1. Lifetime Value Score (0-30 points)
    let lifetimeValueScore = 0;
    if (orgAverage > 0) {
      const valueRatio = totalSpent / orgAverage;
      // Cap at 3x average = 30 points
      lifetimeValueScore = Math.min(30, (valueRatio / 3) * 30);
    }

    // 2. Booking Frequency Score (0-25 points)
    let frequencyScore = 0;
    if (firstBookingAt && totalBookings > 0) {
      const daysSinceFirst =
        (Date.now() - new Date(firstBookingAt).getTime()) / (1000 * 60 * 60 * 24);
      const yearsSinceFirst = Math.max(1 / 12, daysSinceFirst / 365); // Minimum 1 month
      const bookingsPerYear = totalBookings / yearsSinceFirst;
      // 12+ bookings per year = 25 points
      frequencyScore = Math.min(25, (bookingsPerYear / 12) * 25);
    }

    // 3. Recency Score (0-20 points)
    let recencyScore = 0;
    if (lastBookingAt) {
      const daysSinceLast =
        (Date.now() - new Date(lastBookingAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast <= 30) {
        recencyScore = 20; // Booked in last 30 days
      } else if (daysSinceLast <= 90) {
        recencyScore = 15; // Last 3 months
      } else if (daysSinceLast <= 180) {
        recencyScore = 10; // Last 6 months
      } else if (daysSinceLast <= 365) {
        recencyScore = 5; // Last year
      }
      // > 365 days = 0 points
    }

    // 4. Engagement Score (0-15 points)
    const communicationStats = await this.db
      .select({
        totalSent: count(),
        totalOpened: sql<number>`COUNT(*) FILTER (WHERE ${communicationLogs.status} IN ('opened', 'clicked'))`,
      })
      .from(communicationLogs)
      .where(
        and(
          eq(communicationLogs.customerId, customerId),
          eq(communicationLogs.organizationId, this.organizationId),
          eq(communicationLogs.type, "email")
        )
      );

    const commStats = communicationStats[0];
    const totalSent = commStats?.totalSent ?? 0;
    const totalOpened = Number(commStats?.totalOpened ?? 0);
    let engagementScore = 0;
    if (totalSent > 0) {
      const openRate = totalOpened / totalSent;
      // 50%+ open rate = 15 points
      engagementScore = Math.min(15, (openRate / 0.5) * 15);
    }

    // 5. Referral Score (0-10 points)
    // Check metadata for referral tracking
    const referralsCount = (customer.metadata as { referralsCount?: number })?.referralsCount ?? 0;
    // 5+ referrals = 10 points
    const referralScore = Math.min(10, (referralsCount / 5) * 10);

    // Calculate total score
    const score = Math.round(
      lifetimeValueScore + frequencyScore + recencyScore + engagementScore + referralScore
    );

    // Determine segment
    const segment = this.determineSegment(score);

    return {
      customerId,
      score,
      lifetimeValueScore: Math.round(lifetimeValueScore),
      frequencyScore: Math.round(frequencyScore),
      recencyScore: Math.round(recencyScore),
      engagementScore: Math.round(engagementScore),
      referralScore: Math.round(referralScore),
      segment,
      calculatedAt: new Date(),
    };
  }

  /**
   * Batch calculate scores for all customers (for nightly job)
   */
  async calculateAllScores(): Promise<CustomerScore[]> {
    const allCustomers = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.organizationId, this.organizationId));

    const scores = await Promise.all(
      allCustomers.map((customer) =>
        this.calculateCustomerScore(customer.id).catch((error) => {
          customerIntelligenceLogger.error(
            { err: error, customerId: customer.id },
            "Failed to calculate score"
          );
          return null;
        })
      )
    );

    return scores.filter((s): s is CustomerScore => s !== null);
  }

  /**
   * Get customer with their current score
   */
  async getCustomerWithScore(customerId: string): Promise<CustomerWithScore> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", customerId);
    }

    const scoreData = await this.calculateCustomerScore(customerId);

    const bookingStats = await this.db
      .select({
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        totalBookings: count(),
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, customerId),
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const stats = bookingStats[0];
    const lastBookingAt = stats?.lastBookingAt ?? null;
    const daysSinceLastBooking = lastBookingAt
      ? Math.floor((Date.now() - new Date(lastBookingAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...customer,
      score: scoreData.score,
      segment: scoreData.segment,
      totalSpent: stats?.totalSpent ?? "0",
      totalBookings: stats?.totalBookings ?? 0,
      lastBookingAt,
      daysSinceLastBooking,
    };
  }

  // ============================================
  // Customer Segments
  // ============================================

  /**
   * Determine segment based on score
   */
  private determineSegment(score: number): CustomerSegment {
    if (score >= 80) return "vip";
    if (score >= 60) return "loyal";
    if (score >= 40) return "promising";
    if (score >= 20) return "at_risk";
    return "dormant";
  }

  /**
   * Assign segment to a customer based on their score
   */
  async assignSegment(customerId: string, score: number): Promise<CustomerSegment> {
    return this.determineSegment(score);
  }

  /**
   * Get distribution of customers across segments
   */
  async getSegmentDistribution(): Promise<SegmentDistribution> {
    // Calculate scores for all customers
    const scores = await this.calculateAllScores();

    const distribution: SegmentDistribution = {
      vip: 0,
      loyal: 0,
      promising: 0,
      at_risk: 0,
      dormant: 0,
    };

    for (const scoreData of scores) {
      distribution[scoreData.segment]++;
    }

    return distribution;
  }

  /**
   * Get customers by segment
   */
  async getCustomersBySegment(segment: CustomerSegment): Promise<CustomerWithScore[]> {
    const allCustomers = await this.db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, this.organizationId));

    const customersWithScores = await Promise.all(
      allCustomers.map((customer) =>
        this.getCustomerWithScore(customer.id).catch((error) => {
          customerIntelligenceLogger.error(
            { err: error, customerId: customer.id },
            "Failed to get customer score"
          );
          return null;
        })
      )
    );

    // Filter to segment and remove nulls, then sort by score descending
    return customersWithScores
      .filter((c): c is CustomerWithScore => c !== null && c.segment === segment)
      .sort((a, b) => b.score - a.score);
  }

  // ============================================
  // Customer Lifetime Value (CLV)
  // ============================================

  /**
   * Calculate historical CLV (total spent to date)
   */
  async calculateCLV(customerId: string): Promise<CustomerLifetimeValue> {
    const customer = await this.db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.organizationId, this.organizationId)
      ),
    });

    if (!customer) {
      throw new NotFoundError("Customer", customerId);
    }

    const bookingStats = await this.db
      .select({
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        totalBookings: count(),
        firstBookingAt: sql<Date | null>`MIN(${bookings.createdAt})`,
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, customerId),
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const stats = bookingStats[0];
    const totalSpent = parseFloat(stats?.totalSpent ?? "0");
    const totalBookings = stats?.totalBookings ?? 0;
    const firstBookingAt = stats?.firstBookingAt;
    const lastBookingAt = stats?.lastBookingAt;

    const averageOrderValue = totalBookings > 0 ? (totalSpent / totalBookings).toFixed(2) : "0";

    // Calculate customer tenure in days
    const customerTenureDays = firstBookingAt
      ? Math.floor((Date.now() - new Date(firstBookingAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate booking frequency (bookings per year)
    let bookingFrequency = 0;
    if (firstBookingAt && totalBookings > 0) {
      const daysSinceFirst =
        (Date.now() - new Date(firstBookingAt).getTime()) / (1000 * 60 * 60 * 24);
      const yearsSinceFirst = Math.max(1 / 12, daysSinceFirst / 365);
      bookingFrequency = parseFloat((totalBookings / yearsSinceFirst).toFixed(2));
    }

    return {
      customerId,
      historicalCLV: stats?.totalSpent ?? "0",
      predictedCLV: "0", // Will be calculated in predictCLV
      averageOrderValue,
      bookingFrequency,
      totalBookings,
      firstBookingAt: firstBookingAt ?? null,
      lastBookingAt: lastBookingAt ?? null,
      customerTenureDays,
    };
  }

  /**
   * Predict 12-month CLV based on historical patterns
   * Simple model: AOV * predicted bookings (based on frequency)
   */
  async predictCLV(customerId: string): Promise<string> {
    const clvData = await this.calculateCLV(customerId);

    if (clvData.totalBookings === 0) {
      return "0";
    }

    // Predict bookings in next 12 months based on historical frequency
    const predictedBookings = clvData.bookingFrequency;

    // Apply a decay factor if customer is at risk or dormant
    const scoreData = await this.calculateCustomerScore(customerId);
    let decayFactor = 1;
    if (scoreData.segment === "at_risk") {
      decayFactor = 0.5; // Reduce prediction by 50%
    } else if (scoreData.segment === "dormant") {
      decayFactor = 0.1; // Reduce prediction by 90%
    }

    const averageOrderValue = parseFloat(clvData.averageOrderValue);
    const predictedCLV = averageOrderValue * predictedBookings * decayFactor;

    return predictedCLV.toFixed(2);
  }

  /**
   * Get average CLV grouped by acquisition source
   */
  async getCLVBySource(): Promise<Record<string, { averageCLV: string; customerCount: number }>> {
    const result = await this.db
      .select({
        source: customers.source,
        averageCLV: sql<string>`COALESCE(AVG(customer_total), 0)::TEXT`,
        customerCount: count(),
      })
      .from(customers)
      .leftJoin(
        sql`LATERAL (
          SELECT SUM(CAST(${bookings.total} AS DECIMAL)) as customer_total
          FROM ${bookings}
          WHERE ${bookings.customerId} = ${customers.id}
            AND ${bookings.organizationId} = ${this.organizationId}
            AND ${bookings.status} != 'cancelled'
        ) as booking_totals`,
        sql`true`
      )
      .where(eq(customers.organizationId, this.organizationId))
      .groupBy(customers.source);

    const clvBySource: Record<string, { averageCLV: string; customerCount: number }> = {};
    for (const row of result) {
      if (row.source) {
        clvBySource[row.source] = {
          averageCLV: row.averageCLV,
          customerCount: row.customerCount,
        };
      }
    }

    return clvBySource;
  }

  /**
   * Get top customers ranked by CLV
   */
  async getTopCustomersByCLV(limit = 10): Promise<CustomerLifetimeValue[]> {
    const result = await this.db
      .select({
        customerId: customers.id,
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        totalBookings: count(),
        firstBookingAt: sql<Date | null>`MIN(${bookings.createdAt})`,
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(customers)
      .leftJoin(
        bookings,
        and(
          eq(bookings.customerId, customers.id),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .where(eq(customers.organizationId, this.organizationId))
      .groupBy(customers.id)
      .orderBy(desc(sql`SUM(CAST(${bookings.total} AS DECIMAL))`))
      .limit(limit);

    const topCustomers: CustomerLifetimeValue[] = [];

    for (const row of result) {
      const totalSpent = parseFloat(row.totalSpent);
      const totalBookings = row.totalBookings;
      const averageOrderValue = totalBookings > 0 ? (totalSpent / totalBookings).toFixed(2) : "0";

      let bookingFrequency = 0;
      if (row.firstBookingAt && totalBookings > 0) {
        const daysSinceFirst =
          (Date.now() - new Date(row.firstBookingAt).getTime()) / (1000 * 60 * 60 * 24);
        const yearsSinceFirst = Math.max(1 / 12, daysSinceFirst / 365);
        bookingFrequency = parseFloat((totalBookings / yearsSinceFirst).toFixed(2));
      }

      const customerTenureDays = row.firstBookingAt
        ? Math.floor((Date.now() - new Date(row.firstBookingAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      topCustomers.push({
        customerId: row.customerId,
        historicalCLV: row.totalSpent,
        predictedCLV: "0", // Can be calculated separately if needed
        averageOrderValue,
        bookingFrequency,
        totalBookings,
        firstBookingAt: row.firstBookingAt ?? null,
        lastBookingAt: row.lastBookingAt ?? null,
        customerTenureDays,
      });
    }

    return topCustomers;
  }

  // ============================================
  // Re-engagement Triggers
  // ============================================

  /**
   * Get customers who haven't booked in 60+ days (at risk)
   */
  async getAtRiskCustomers(): Promise<ReengagementCandidate[]> {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    return this.getCustomersForReengagement(60, 119, "at_risk_60_days");
  }

  /**
   * Get customers who haven't booked in 120+ days (dormant)
   */
  async getDormantCustomers(): Promise<ReengagementCandidate[]> {
    return this.getCustomersForReengagement(120, null, "dormant_120_days");
  }

  /**
   * Helper to get customers for re-engagement
   */
  private async getCustomersForReengagement(
    minDays: number,
    maxDays: number | null,
    triggerType: ReengagementTriggerType
  ): Promise<ReengagementCandidate[]> {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - minDays);

    const maxDate = maxDays ? new Date() : null;
    if (maxDate && maxDays) {
      maxDate.setDate(maxDate.getDate() - maxDays);
    }

    // Get all customers with their last booking date
    const customerBookings = await this.db
      .select({
        customerId: customers.id,
        email: customers.email,
        firstName: customers.firstName,
        lastName: customers.lastName,
        totalSpent: sql<string>`COALESCE(SUM(CAST(${bookings.total} AS DECIMAL)), 0)::TEXT`,
        totalBookings: count(),
        lastBookingAt: sql<Date | null>`MAX(${bookings.createdAt})`,
      })
      .from(customers)
      .leftJoin(
        bookings,
        and(
          eq(bookings.customerId, customers.id),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .where(eq(customers.organizationId, this.organizationId))
      .groupBy(customers.id, customers.email, customers.firstName, customers.lastName);

    // Filter customers that fall in the date range
    const eligibleCustomers = customerBookings.filter((row) => {
      if (!row.lastBookingAt) return false;
      const lastBookingDate = new Date(row.lastBookingAt);
      const daysSinceLast = Math.floor(
        (Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLast >= minDays && (!maxDays || daysSinceLast <= maxDays);
    });

    // Calculate scores in parallel
    const candidatesWithScores = await Promise.all(
      eligibleCustomers.map(async (row) => {
        const lastBookingDate = new Date(row.lastBookingAt!);
        const daysSinceLast = Math.floor(
          (Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        try {
          const scoreData = await this.calculateCustomerScore(row.customerId);
          return {
            customerId: row.customerId,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            triggerType,
            daysSinceLastBooking: daysSinceLast,
            totalBookings: row.totalBookings,
            totalSpent: row.totalSpent,
            segment: scoreData.segment,
            lastBookingAt: row.lastBookingAt,
          } as ReengagementCandidate;
        } catch (error) {
          customerIntelligenceLogger.error(
            { err: error, customerId: row.customerId },
            "Failed to calculate score for reengagement candidate"
          );
          return null;
        }
      })
    );

    return candidatesWithScores.filter((c): c is ReengagementCandidate => c !== null);
  }

  /**
   * Get all customers needing re-engagement with their trigger types
   */
  async getReengagementCandidates(): Promise<ReengagementCandidate[]> {
    const [atRisk, dormant] = await Promise.all([
      this.getAtRiskCustomers(),
      this.getDormantCustomers(),
    ]);

    return [...atRisk, ...dormant];
  }

  // ============================================
  // Customer Report Data
  // ============================================

  /**
   * Get comprehensive customer statistics for a date range
   */
  async getCustomerStats(dateRange: { from: Date; to: Date }): Promise<CustomerStatsReport> {
    const { from, to } = dateRange;

    // Get new customers (first booking in period)
    const newCustomersResult = await this.db
      .select({
        count: count(),
      })
      .from(customers)
      .innerJoin(
        sql`LATERAL (
          SELECT MIN(${bookings.createdAt}) as first_booking
          FROM ${bookings}
          WHERE ${bookings.customerId} = ${customers.id}
            AND ${bookings.organizationId} = ${this.organizationId}
            AND ${bookings.status} != 'cancelled'
        ) as first_bookings`,
        sql`true`
      )
      .where(
        and(
          eq(customers.organizationId, this.organizationId),
          gte(sql`first_bookings.first_booking`, from),
          lte(sql`first_bookings.first_booking`, to)
        )
      );

    const newCustomers = newCustomersResult[0]?.count ?? 0;

    // Get repeat customers (customers with 2+ bookings in period)
    const repeatCustomersResult = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${bookings.customerId})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          sql`${bookings.status} != 'cancelled'`
        )
      )
      .groupBy(bookings.customerId)
      .having(sql`COUNT(*) > 1`);

    const repeatCustomers = repeatCustomersResult.length;

    // Calculate repeat rate
    const totalCustomersInPeriod = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${bookings.customerId})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          gte(bookings.createdAt, from),
          lte(bookings.createdAt, to),
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const totalCustomers = Number(totalCustomersInPeriod[0]?.count ?? 0);
    const repeatRate = totalCustomers > 0
      ? ((repeatCustomers / totalCustomers) * 100).toFixed(2)
      : "0";

    // Get average CLV
    const avgCLVResult = await this.db
      .select({
        avgCLV: sql<string>`COALESCE(AVG(customer_total), 0)::TEXT`,
      })
      .from(
        sql`(
          SELECT
            ${bookings.customerId},
            SUM(CAST(${bookings.total} AS DECIMAL)) as customer_total
          FROM ${bookings}
          WHERE ${bookings.organizationId} = ${this.organizationId}
            AND ${bookings.status} != 'cancelled'
          GROUP BY ${bookings.customerId}
        ) as customer_totals`
      );

    const averageCLV = avgCLVResult[0]?.avgCLV ?? "0";

    // Get acquisition by source
    const acquisitionBySourceResult = await this.db
      .select({
        source: customers.source,
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, this.organizationId),
          gte(customers.createdAt, from),
          lte(customers.createdAt, to)
        )
      )
      .groupBy(customers.source);

    const acquisitionBySource: Record<string, number> = {};
    for (const row of acquisitionBySourceResult) {
      if (row.source) {
        acquisitionBySource[row.source] = row.count;
      }
    }

    // Get geographic distribution
    const geoDistResult = await this.db
      .select({
        country: customers.country,
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, this.organizationId),
          sql`${customers.country} IS NOT NULL`
        )
      )
      .groupBy(customers.country)
      .orderBy(desc(count()))
      .limit(10);

    const geographicDistribution = geoDistResult
      .filter((r) => r.country)
      .map((r) => ({ country: r.country!, count: r.count }));

    // Get segment distribution
    const segmentDistribution = await this.getSegmentDistribution();

    return {
      dateRange: { from, to },
      newCustomers,
      repeatCustomers,
      repeatRate,
      averageCLV,
      acquisitionBySource,
      geographicDistribution,
      segmentDistribution,
    };
  }
}
