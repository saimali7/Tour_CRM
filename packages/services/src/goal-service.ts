import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";
import {
  goals,
  bookings,
  customers,
  type Goal,
  type GoalMetricType,
  type GoalPeriodType,
  type GoalStatus,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError, ServiceError } from "./types";

// Types
export interface CreateGoalInput {
  name: string;
  description?: string;
  metricType: GoalMetricType;
  targetValue: string;
  periodType: GoalPeriodType;
  periodStart: Date;
  periodEnd: Date;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  targetValue?: string;
  status?: GoalStatus;
}

export interface GoalWithProgress extends Goal {
  progress: number; // 0-100 percentage
  remaining: string; // Target - Current
  daysRemaining: number;
  isOnTrack: boolean;
  projectedValue: string;
}

export interface GoalFilters {
  status?: GoalStatus;
  metricType?: GoalMetricType;
  periodType?: GoalPeriodType;
}

export class GoalService extends BaseService {
  /**
   * Create a new goal
   */
  async create(input: CreateGoalInput, createdBy: string): Promise<Goal> {
    const result = await this.db
      .insert(goals)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        description: input.description,
        metricType: input.metricType,
        targetValue: input.targetValue,
        periodType: input.periodType,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        createdBy,
      })
      .returning();

    if (!result[0]) {
      throw new ServiceError("Failed to create goal", "CREATE_FAILED", 500);
    }

    return result[0];
  }

  /**
   * Get goal by ID
   */
  async getById(id: string): Promise<Goal> {
    const goal = await this.db.query.goals.findFirst({
      where: and(
        eq(goals.id, id),
        eq(goals.organizationId, this.organizationId)
      ),
    });

    if (!goal) {
      throw new NotFoundError("Goal", id);
    }

    return goal;
  }

  /**
   * Update a goal
   */
  async update(id: string, input: UpdateGoalInput): Promise<Goal> {
    await this.getById(id);

    const result = await this.db
      .update(goals)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goals.id, id),
          eq(goals.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!result[0]) {
      throw new ServiceError("Failed to update goal", "UPDATE_FAILED", 500);
    }

    return result[0];
  }

  /**
   * Delete a goal
   */
  async delete(id: string): Promise<void> {
    await this.getById(id);

    await this.db
      .delete(goals)
      .where(
        and(
          eq(goals.id, id),
          eq(goals.organizationId, this.organizationId)
        )
      );
  }

  /**
   * List goals with optional filters
   */
  async list(filters?: GoalFilters): Promise<Goal[]> {
    const query = this.db.query.goals.findMany({
      where: eq(goals.organizationId, this.organizationId),
      orderBy: [desc(goals.createdAt)],
    });

    const results = await query;

    // Apply filters in memory for now (could optimize with dynamic query building)
    let filtered = results;
    if (filters?.status) {
      filtered = filtered.filter((g) => g.status === filters.status);
    }
    if (filters?.metricType) {
      filtered = filtered.filter((g) => g.metricType === filters.metricType);
    }
    if (filters?.periodType) {
      filtered = filtered.filter((g) => g.periodType === filters.periodType);
    }

    return filtered;
  }

  /**
   * Get active goals with calculated progress
   * Optimized to calculate progress in parallel using Promise.all
   */
  async getActiveGoals(): Promise<GoalWithProgress[]> {
    const activeGoals = await this.db.query.goals.findMany({
      where: and(
        eq(goals.organizationId, this.organizationId),
        eq(goals.status, "active")
      ),
      orderBy: [desc(goals.periodEnd)],
    });

    // Calculate progress for all goals in parallel to avoid N+1 queries
    const goalsWithProgress = await Promise.all(
      activeGoals.map((goal) => this.calculateProgress(goal))
    );

    return goalsWithProgress;
  }

  /**
   * Calculate progress for a single goal
   */
  async calculateProgress(goal: Goal): Promise<GoalWithProgress> {
    const currentValue = await this.calculateCurrentValue(goal);
    const targetValue = parseFloat(goal.targetValue);

    const progress = targetValue > 0
      ? Math.min(100, (parseFloat(currentValue) / targetValue) * 100)
      : 0;

    const remaining = (targetValue - parseFloat(currentValue)).toFixed(2);

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil(
      (new Date(goal.periodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const totalDays = Math.ceil(
      (new Date(goal.periodEnd).getTime() - new Date(goal.periodStart).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = totalDays - daysRemaining;

    // Project end value based on current pace
    const dailyPace = daysElapsed > 0 ? parseFloat(currentValue) / daysElapsed : 0;
    const projectedValue = (dailyPace * totalDays).toFixed(2);

    // Determine if on track (projected to meet target)
    const isOnTrack = parseFloat(projectedValue) >= targetValue;

    // Update current value in database
    await this.db
      .update(goals)
      .set({
        currentValue,
        lastCalculatedAt: now,
      })
      .where(eq(goals.id, goal.id));

    return {
      ...goal,
      currentValue,
      progress: Math.round(progress * 10) / 10,
      remaining,
      daysRemaining,
      isOnTrack,
      projectedValue,
    };
  }

  /**
   * Calculate current value for a goal based on its metric type
   */
  private async calculateCurrentValue(goal: Goal): Promise<string> {
    const periodStart = new Date(goal.periodStart);
    const periodEnd = new Date(goal.periodEnd);
    const now = new Date();
    const effectiveEnd = now < periodEnd ? now : periodEnd;

    switch (goal.metricType) {
      case "revenue":
        return this.calculateRevenueValue(periodStart, effectiveEnd);
      case "bookings":
        return this.calculateBookingsValue(periodStart, effectiveEnd);
      case "capacity_utilization":
        return this.calculateCapacityUtilization(periodStart, effectiveEnd);
      case "new_customers":
        return this.calculateNewCustomers(periodStart, effectiveEnd);
      default:
        return "0";
    }
  }

  private async calculateRevenueValue(from: Date, to: Date): Promise<string> {
    const result = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${bookings.total}::numeric), 0)::text`,
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

    return result[0]?.total ?? "0";
  }

  private async calculateBookingsValue(from: Date, to: Date): Promise<string> {
    const result = await this.db
      .select({
        count: count(),
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

    return String(result[0]?.count ?? 0);
  }

  /**
   * Calculate capacity utilization based on bookings vs tour maxParticipants
   * Since schedules table has been removed, we estimate based on bookings
   */
  private async calculateCapacityUtilization(from: Date, to: Date): Promise<string> {
    const fromStr = from.toISOString().split("T")[0]!;
    const toStr = to.toISOString().split("T")[0]!;

    // Get bookings with tour capacity for the date range
    const result = await this.db
      .select({
        totalParticipants: sql<number>`COALESCE(SUM(${bookings.totalParticipants}), 0)`,
        bookingCount: count(),
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.organizationId, this.organizationId),
          sql`${bookings.bookingDate}::text >= ${fromStr}`,
          sql`${bookings.bookingDate}::text <= ${toStr}`,
          sql`${bookings.status} != 'cancelled'`
        )
      );

    const totalParticipants = Number(result[0]?.totalParticipants ?? 0);
    const bookingCount = Number(result[0]?.bookingCount ?? 0);

    // Without schedules, we can't calculate true capacity utilization
    // Return participant count as a proxy metric
    // In a real implementation, this would need to be based on tour availability
    return bookingCount > 0 ? totalParticipants.toFixed(2) : "0";
  }

  private async calculateNewCustomers(from: Date, to: Date): Promise<string> {
    const result = await this.db
      .select({
        count: count(),
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, this.organizationId),
          gte(customers.createdAt, from),
          lte(customers.createdAt, to)
        )
      );

    return String(result[0]?.count ?? 0);
  }

  /**
   * Get detailed progress for a single goal
   */
  async getProgress(id: string): Promise<GoalWithProgress> {
    const goal = await this.getById(id);
    return this.calculateProgress(goal);
  }

  /**
   * Update goal status based on period end and progress
   * Optimized to calculate values in parallel and batch updates by status
   */
  async updateGoalStatuses(): Promise<void> {
    const now = new Date();

    // Get active goals where period has ended
    const expiredGoals = await this.db.query.goals.findMany({
      where: and(
        eq(goals.organizationId, this.organizationId),
        eq(goals.status, "active"),
        lte(goals.periodEnd, now)
      ),
    });

    if (expiredGoals.length === 0) {
      return;
    }

    // Calculate current values for all goals in parallel
    const goalResults = await Promise.all(
      expiredGoals.map(async (goal) => {
        const currentValue = await this.calculateCurrentValue(goal);
        const targetValue = parseFloat(goal.targetValue);
        const achieved = parseFloat(currentValue) >= targetValue;
        return { goal, currentValue, achieved };
      })
    );

    // Group goals by status for batch updates
    const completedGoals = goalResults.filter((r) => r.achieved);
    const missedGoals = goalResults.filter((r) => !r.achieved);

    // Batch update completed goals
    if (completedGoals.length > 0) {
      await Promise.all(
        completedGoals.map((r) =>
          this.db
            .update(goals)
            .set({
              status: "completed",
              currentValue: r.currentValue,
              lastCalculatedAt: now,
              updatedAt: now,
            })
            .where(eq(goals.id, r.goal.id))
        )
      );
    }

    // Batch update missed goals
    if (missedGoals.length > 0) {
      await Promise.all(
        missedGoals.map((r) =>
          this.db
            .update(goals)
            .set({
              status: "missed",
              currentValue: r.currentValue,
              lastCalculatedAt: now,
              updatedAt: now,
            })
            .where(eq(goals.id, r.goal.id))
        )
      );
    }
  }

  /**
   * Get goal summary statistics
   */
  async getSummary(): Promise<{
    totalActive: number;
    onTrack: number;
    offTrack: number;
    completed: number;
    missed: number;
  }> {
    const allGoals = await this.list();
    const activeGoals = await this.getActiveGoals();

    const onTrack = activeGoals.filter((g) => g.isOnTrack).length;
    const offTrack = activeGoals.length - onTrack;
    const completed = allGoals.filter((g) => g.status === "completed").length;
    const missed = allGoals.filter((g) => g.status === "missed").length;

    return {
      totalActive: activeGoals.length,
      onTrack,
      offTrack,
      completed,
      missed,
    };
  }
}
