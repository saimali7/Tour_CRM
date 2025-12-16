import { eq, and, desc, asc, count, or, ilike, gte, lte } from "drizzle-orm";
import {
  communicationLogs,
  emailTemplates,
  smsTemplates,
  communicationAutomations,
  notificationPreferences,
  type CommunicationLog,
  type EmailTemplate,
  type SmsTemplate,
  type CommunicationAutomation,
  type NotificationPreference,
  type CommunicationType,
  type CommunicationStatus,
  type EmailTemplateType,
  type SmsTemplateType,
} from "@tour/database";
import { BaseService } from "./base-service";
import {
  type PaginationOptions,
  type PaginatedResult,
  type SortOptions,
  NotFoundError,
} from "./types";

// ============================================
// Communication Log Types
// ============================================

export interface CommunicationLogFilters {
  customerId?: string;
  bookingId?: string;
  tourId?: string;
  type?: CommunicationType;
  status?: CommunicationStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type CommunicationLogSortField = "createdAt";

export interface CreateCommunicationLogInput {
  customerId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  bookingId?: string;
  tourId?: string;
  scheduleId?: string;
  type: CommunicationType;
  templateId?: string;
  templateName?: string;
  subject?: string;
  content: string;
  contentPlain?: string;
  status?: CommunicationStatus;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Email Template Types
// ============================================

export interface CreateEmailTemplateInput {
  name: string;
  type: EmailTemplateType;
  description?: string;
  subject: string;
  contentHtml: string;
  contentPlain?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  description?: string;
  subject?: string;
  contentHtml?: string;
  contentPlain?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

// ============================================
// SMS Template Types
// ============================================

export interface CreateSmsTemplateInput {
  name: string;
  type: SmsTemplateType;
  description?: string;
  content: string;
  availableVariables?: string[];
  isActive?: boolean;
}

export interface UpdateSmsTemplateInput {
  name?: string;
  description?: string;
  content?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

// ============================================
// Automation Types
// ============================================

export type AutomationType = CommunicationAutomation["automationType"];

export interface CreateAutomationInput {
  automationType: AutomationType;
  channel?: "email" | "sms" | "both";
  isActive?: boolean;
  delayMinutes?: number;
  delayHours?: number;
  delayDays?: number;
  timingType?: "before" | "after" | "immediate";
  emailTemplateId?: string;
  smsTemplateId?: string;
  includeDiscount?: boolean;
  discountCode?: string;
  discountPercentage?: number;
}

export interface UpdateAutomationInput extends Partial<Omit<CreateAutomationInput, "automationType">> {}

// ============================================
// Service
// ============================================

export class CommunicationService extends BaseService {
  // ============================================
  // Communication Logs
  // ============================================

  async getLogs(
    filters: CommunicationLogFilters = {},
    pagination: PaginationOptions = {},
    sort: SortOptions<CommunicationLogSortField> = { field: "createdAt", direction: "desc" }
  ): Promise<PaginatedResult<CommunicationLog>> {
    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(communicationLogs.organizationId, this.organizationId)];

    if (filters.customerId) {
      conditions.push(eq(communicationLogs.customerId, filters.customerId));
    }
    if (filters.bookingId) {
      conditions.push(eq(communicationLogs.bookingId, filters.bookingId));
    }
    if (filters.tourId) {
      conditions.push(eq(communicationLogs.tourId, filters.tourId));
    }
    if (filters.type) {
      conditions.push(eq(communicationLogs.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(communicationLogs.status, filters.status));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(communicationLogs.recipientEmail, `%${filters.search}%`),
          ilike(communicationLogs.recipientName, `%${filters.search}%`),
          ilike(communicationLogs.subject, `%${filters.search}%`)
        )!
      );
    }
    if (filters.dateFrom) {
      conditions.push(gte(communicationLogs.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(communicationLogs.createdAt, filters.dateTo));
    }

    const orderBy =
      sort.direction === "asc"
        ? asc(communicationLogs[sort.field])
        : desc(communicationLogs[sort.field]);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(communicationLogs)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(communicationLogs)
        .where(and(...conditions)),
    ]);

    return {
      data,
      ...this.paginationMeta(countResult[0]?.total ?? 0, page, limit),
    };
  }

  async getLogById(id: string): Promise<CommunicationLog> {
    const log = await this.db.query.communicationLogs.findFirst({
      where: and(
        eq(communicationLogs.id, id),
        eq(communicationLogs.organizationId, this.organizationId)
      ),
    });

    if (!log) {
      throw new NotFoundError("CommunicationLog", id);
    }

    return log;
  }

  async createLog(input: CreateCommunicationLogInput): Promise<CommunicationLog> {
    const [log] = await this.db
      .insert(communicationLogs)
      .values({
        organizationId: this.organizationId,
        ...input,
        status: input.status ?? "pending",
      })
      .returning();

    if (!log) {
      throw new Error("Failed to create communication log");
    }

    return log;
  }

  async updateLogStatus(
    id: string,
    status: CommunicationStatus,
    details?: {
      externalId?: string;
      statusDetails?: string;
      sentAt?: Date;
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      failedAt?: Date;
    }
  ): Promise<CommunicationLog> {
    const [log] = await this.db
      .update(communicationLogs)
      .set({
        status,
        ...details,
      })
      .where(
        and(
          eq(communicationLogs.id, id),
          eq(communicationLogs.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!log) {
      throw new NotFoundError("CommunicationLog", id);
    }

    return log;
  }

  async getCustomerCommunications(customerId: string, limit = 50): Promise<CommunicationLog[]> {
    return this.db
      .select()
      .from(communicationLogs)
      .where(
        and(
          eq(communicationLogs.organizationId, this.organizationId),
          eq(communicationLogs.customerId, customerId)
        )
      )
      .orderBy(desc(communicationLogs.createdAt))
      .limit(limit);
  }

  async getLogStats(): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalFailed: number;
    byType: Record<string, number>;
    last30Days: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [stats, byTypeResult, last30DaysResult] = await Promise.all([
      this.db
        .select({
          status: communicationLogs.status,
          count: count(),
        })
        .from(communicationLogs)
        .where(eq(communicationLogs.organizationId, this.organizationId))
        .groupBy(communicationLogs.status),
      this.db
        .select({
          type: communicationLogs.type,
          count: count(),
        })
        .from(communicationLogs)
        .where(eq(communicationLogs.organizationId, this.organizationId))
        .groupBy(communicationLogs.type),
      this.db
        .select({ count: count() })
        .from(communicationLogs)
        .where(
          and(
            eq(communicationLogs.organizationId, this.organizationId),
            gte(communicationLogs.createdAt, thirtyDaysAgo)
          )
        ),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of stats) {
      statusCounts[row.status] = row.count;
    }

    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row.type] = row.count;
    }

    return {
      totalSent: (statusCounts.sent ?? 0) + (statusCounts.delivered ?? 0) + (statusCounts.opened ?? 0) + (statusCounts.clicked ?? 0),
      totalDelivered: (statusCounts.delivered ?? 0) + (statusCounts.opened ?? 0) + (statusCounts.clicked ?? 0),
      totalOpened: (statusCounts.opened ?? 0) + (statusCounts.clicked ?? 0),
      totalFailed: statusCounts.failed ?? 0,
      byType,
      last30Days: last30DaysResult[0]?.count ?? 0,
    };
  }

  // ============================================
  // Email Templates
  // ============================================

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return this.db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.organizationId, this.organizationId))
      .orderBy(asc(emailTemplates.type));
  }

  async getEmailTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.db.query.emailTemplates.findFirst({
      where: and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.organizationId, this.organizationId)
      ),
    });

    if (!template) {
      throw new NotFoundError("EmailTemplate", id);
    }

    return template;
  }

  async getEmailTemplateByType(type: EmailTemplateType): Promise<EmailTemplate | null> {
    const template = await this.db.query.emailTemplates.findFirst({
      where: and(
        eq(emailTemplates.organizationId, this.organizationId),
        eq(emailTemplates.type, type)
      ),
    });

    return template || null;
  }

  async createEmailTemplate(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const [template] = await this.db
      .insert(emailTemplates)
      .values({
        organizationId: this.organizationId,
        ...input,
      })
      .returning();

    if (!template) {
      throw new Error("Failed to create email template");
    }

    return template;
  }

  async updateEmailTemplate(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    const [template] = await this.db
      .update(emailTemplates)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!template) {
      throw new NotFoundError("EmailTemplate", id);
    }

    return template;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    const template = await this.getEmailTemplateById(id);

    if (template.isDefault) {
      throw new Error("Cannot delete system default template");
    }

    await this.db
      .delete(emailTemplates)
      .where(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.organizationId, this.organizationId)
        )
      );
  }

  // ============================================
  // SMS Templates
  // ============================================

  async getSmsTemplates(): Promise<SmsTemplate[]> {
    return this.db
      .select()
      .from(smsTemplates)
      .where(eq(smsTemplates.organizationId, this.organizationId))
      .orderBy(asc(smsTemplates.type));
  }

  async getSmsTemplateById(id: string): Promise<SmsTemplate> {
    const template = await this.db.query.smsTemplates.findFirst({
      where: and(
        eq(smsTemplates.id, id),
        eq(smsTemplates.organizationId, this.organizationId)
      ),
    });

    if (!template) {
      throw new NotFoundError("SmsTemplate", id);
    }

    return template;
  }

  async getSmsTemplateByType(type: SmsTemplateType): Promise<SmsTemplate | null> {
    const template = await this.db.query.smsTemplates.findFirst({
      where: and(
        eq(smsTemplates.organizationId, this.organizationId),
        eq(smsTemplates.type, type)
      ),
    });

    return template || null;
  }

  async createSmsTemplate(input: CreateSmsTemplateInput): Promise<SmsTemplate> {
    const [template] = await this.db
      .insert(smsTemplates)
      .values({
        organizationId: this.organizationId,
        ...input,
      })
      .returning();

    if (!template) {
      throw new Error("Failed to create SMS template");
    }

    return template;
  }

  async updateSmsTemplate(id: string, input: UpdateSmsTemplateInput): Promise<SmsTemplate> {
    const [template] = await this.db
      .update(smsTemplates)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(smsTemplates.id, id),
          eq(smsTemplates.organizationId, this.organizationId)
        )
      )
      .returning();

    if (!template) {
      throw new NotFoundError("SmsTemplate", id);
    }

    return template;
  }

  async deleteSmsTemplate(id: string): Promise<void> {
    const template = await this.getSmsTemplateById(id);

    if (template.isDefault) {
      throw new Error("Cannot delete system default template");
    }

    await this.db
      .delete(smsTemplates)
      .where(
        and(
          eq(smsTemplates.id, id),
          eq(smsTemplates.organizationId, this.organizationId)
        )
      );
  }

  // ============================================
  // Automations
  // ============================================

  async getAutomations(): Promise<CommunicationAutomation[]> {
    return this.db
      .select()
      .from(communicationAutomations)
      .where(eq(communicationAutomations.organizationId, this.organizationId))
      .orderBy(asc(communicationAutomations.automationType));
  }

  async getAutomationByType(type: AutomationType): Promise<CommunicationAutomation | null> {
    const automation = await this.db.query.communicationAutomations.findFirst({
      where: and(
        eq(communicationAutomations.organizationId, this.organizationId),
        eq(communicationAutomations.automationType, type)
      ),
    });

    return automation || null;
  }

  async createOrUpdateAutomation(input: CreateAutomationInput): Promise<CommunicationAutomation> {
    const existing = await this.getAutomationByType(input.automationType);

    if (existing) {
      const [automation] = await this.db
        .update(communicationAutomations)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communicationAutomations.id, existing.id),
            eq(communicationAutomations.organizationId, this.organizationId)
          )
        )
        .returning();

      return automation!;
    }

    const [automation] = await this.db
      .insert(communicationAutomations)
      .values({
        organizationId: this.organizationId,
        ...input,
      })
      .returning();

    if (!automation) {
      throw new Error("Failed to create automation");
    }

    return automation;
  }

  async toggleAutomation(type: AutomationType, isActive: boolean): Promise<CommunicationAutomation> {
    const automation = await this.getAutomationByType(type);

    if (!automation) {
      return this.createOrUpdateAutomation({ automationType: type, isActive });
    }

    const [updated] = await this.db
      .update(communicationAutomations)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(communicationAutomations.id, automation.id),
          eq(communicationAutomations.organizationId, this.organizationId)
        )
      )
      .returning();

    return updated!;
  }

  // ============================================
  // Notification Preferences
  // ============================================

  async getNotificationPreferences(customerId: string): Promise<NotificationPreference | null> {
    const prefs = await this.db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.organizationId, this.organizationId),
        eq(notificationPreferences.customerId, customerId)
      ),
    });

    return prefs || null;
  }

  async updateNotificationPreferences(
    customerId: string,
    preferences: Partial<Omit<NotificationPreference, "id" | "organizationId" | "customerId" | "createdAt" | "updatedAt">>
  ): Promise<NotificationPreference> {
    const existing = await this.getNotificationPreferences(customerId);

    if (existing) {
      const [updated] = await this.db
        .update(notificationPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notificationPreferences.id, existing.id),
            eq(notificationPreferences.organizationId, this.organizationId)
          )
        )
        .returning();

      return updated!;
    }

    const [created] = await this.db
      .insert(notificationPreferences)
      .values({
        organizationId: this.organizationId,
        customerId,
        ...preferences,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create notification preferences");
    }

    return created;
  }

  async unsubscribeEmail(customerId: string): Promise<NotificationPreference> {
    return this.updateNotificationPreferences(customerId, {
      emailUnsubscribedAt: new Date(),
      emailMarketing: false,
      emailAbandonedCart: false,
      emailWishlistDigest: false,
      emailPriceAlerts: false,
      emailAvailabilityAlerts: false,
    });
  }

  async unsubscribeSms(customerId: string): Promise<NotificationPreference> {
    return this.updateNotificationPreferences(customerId, {
      smsUnsubscribedAt: new Date(),
      smsMarketing: false,
    });
  }

  // ============================================
  // Helper: Template Variable Substitution
  // ============================================

  substituteVariables(template: string, variables: Record<string, string | number | undefined>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
    }
    return result;
  }

  // ============================================
  // Default Template Variables
  // ============================================

  getDefaultTemplateVariables(): string[] {
    return [
      "customer.firstName",
      "customer.lastName",
      "customer.email",
      "booking.reference",
      "booking.total",
      "booking.participants",
      "tour.name",
      "tour.description",
      "schedule.date",
      "schedule.time",
      "schedule.meetingPoint",
      "organization.name",
      "links.manageBooking",
      "links.addToCalendar",
      "links.cancelBooking",
    ];
  }
}
