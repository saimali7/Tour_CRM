import { eq } from "drizzle-orm";
import {
  organizations,
  type Organization,
  type OrganizationSettings,
  type OrganizationStatus,
  type OrganizationPlan,
  type SetupProgress,
} from "@tour/database";
import { BaseService } from "./base-service";
import { NotFoundError } from "./types";

const DEFAULT_SETUP_PROGRESS: SetupProgress = {
  basicInfo: false,
  businessProfile: false,
  stripeConnect: false,
  firstTour: false,
  firstBooking: false,
  completedAt: {},
};

export interface UpdateOrganizationInput {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  logoUrl?: string;
  primaryColor?: string;
  settings?: Partial<OrganizationSettings>;
}

export interface UpdateOrganizationSettingsInput extends Partial<OrganizationSettings> {}

export class OrganizationService extends BaseService {
  async get(): Promise<Organization> {
    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, this.organizationId),
    });

    if (!org) {
      throw new NotFoundError("Organization", this.organizationId);
    }

    return org;
  }

  async update(input: UpdateOrganizationInput): Promise<Organization> {
    const org = await this.get();

    const settings = input.settings
      ? { ...org.settings, ...input.settings }
      : undefined;

    const [updated] = await this.db
      .update(organizations)
      .set({
        name: input.name,
        email: input.email,
        phone: input.phone,
        website: input.website,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        timezone: input.timezone,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        settings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, this.organizationId))
      .returning();

    if (!updated) {
      throw new NotFoundError("Organization", this.organizationId);
    }

    return updated;
  }

  async updateSettings(
    input: UpdateOrganizationSettingsInput
  ): Promise<Organization> {
    const org = await this.get();

    const newSettings: OrganizationSettings = {
      ...org.settings,
      ...input,
    };

    const [updated] = await this.db
      .update(organizations)
      .set({
        settings: newSettings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, this.organizationId))
      .returning();

    if (!updated) {
      throw new NotFoundError("Organization", this.organizationId);
    }

    return updated;
  }

  async getSettings(): Promise<OrganizationSettings> {
    const org = await this.get();
    return org.settings || {};
  }

  async updateBranding(
    logoUrl?: string,
    primaryColor?: string
  ): Promise<Organization> {
    const [updated] = await this.db
      .update(organizations)
      .set({
        logoUrl,
        primaryColor,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, this.organizationId))
      .returning();

    if (!updated) {
      throw new NotFoundError("Organization", this.organizationId);
    }

    return updated;
  }

  async updateStripeConnect(
    stripeConnectAccountId: string,
    stripeConnectOnboarded: boolean
  ): Promise<Organization> {
    const [updated] = await this.db
      .update(organizations)
      .set({
        stripeConnectAccountId,
        stripeConnectOnboarded,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, this.organizationId))
      .returning();

    if (!updated) {
      throw new NotFoundError("Organization", this.organizationId);
    }

    return updated;
  }

  async hasFeature(feature: string): Promise<boolean> {
    const org = await this.get();
    return org.features?.includes(feature) || false;
  }

  async getPlan(): Promise<OrganizationPlan> {
    const org = await this.get();
    return org.plan;
  }

  async canUseWebApp(): Promise<boolean> {
    const org = await this.get();
    return org.plan !== "free";
  }

  async hasStripeConnect(): Promise<boolean> {
    const org = await this.get();
    return !!org.stripeConnectAccountId && !!org.stripeConnectOnboarded;
  }

  async getTimezone(): Promise<string> {
    const org = await this.get();
    return org.timezone;
  }

  async getDefaultCurrency(): Promise<string> {
    const org = await this.get();
    return org.settings?.defaultCurrency || "USD";
  }

  async getStatus(): Promise<OrganizationStatus> {
    const org = await this.get();
    return org.status;
  }

  async isActive(): Promise<boolean> {
    const org = await this.get();
    return org.status === "active";
  }

  // =============================================================================
  // Setup Progress Tracking
  // =============================================================================

  async getSetupProgress(): Promise<SetupProgress> {
    const org = await this.get();
    return org.settings?.setupProgress || DEFAULT_SETUP_PROGRESS;
  }

  async updateSetupProgress(
    step: keyof Omit<SetupProgress, "completedAt">,
    completed: boolean
  ): Promise<SetupProgress> {
    const org = await this.get();
    const currentProgress = org.settings?.setupProgress || { ...DEFAULT_SETUP_PROGRESS };

    const updatedProgress: SetupProgress = {
      ...currentProgress,
      [step]: completed,
      completedAt: {
        ...currentProgress.completedAt,
        [step]: completed ? new Date().toISOString() : undefined,
      },
    };

    const newSettings: OrganizationSettings = {
      ...org.settings,
      setupProgress: updatedProgress,
    };

    await this.db
      .update(organizations)
      .set({
        settings: newSettings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, this.organizationId));

    return updatedProgress;
  }

  async markSetupComplete(
    step: keyof Omit<SetupProgress, "completedAt">
  ): Promise<void> {
    await this.updateSetupProgress(step, true);
  }

  async getSetupCompletion(): Promise<{
    completed: number;
    total: number;
    percentage: number;
    steps: Array<{ name: string; completed: boolean; completedAt?: string }>;
  }> {
    const progress = await this.getSetupProgress();

    const steps = [
      {
        name: "basicInfo",
        label: "Basic Information",
        completed: progress.basicInfo,
        completedAt: progress.completedAt?.basicInfo,
      },
      {
        name: "businessProfile",
        label: "Business Profile",
        completed: progress.businessProfile,
        completedAt: progress.completedAt?.businessProfile,
      },
      {
        name: "stripeConnect",
        label: "Payment Setup",
        completed: progress.stripeConnect,
        completedAt: progress.completedAt?.stripeConnect,
      },
      {
        name: "firstTour",
        label: "First Tour",
        completed: progress.firstTour,
        completedAt: progress.completedAt?.firstTour,
      },
      {
        name: "firstBooking",
        label: "First Booking",
        completed: progress.firstBooking,
        completedAt: progress.completedAt?.firstBooking,
      },
    ];

    const completed = steps.filter((s) => s.completed).length;
    const total = steps.length;

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      steps,
    };
  }

  async isSetupComplete(): Promise<boolean> {
    const progress = await this.getSetupProgress();
    // Core setup steps (not milestones) must be complete
    return progress.basicInfo && progress.businessProfile;
  }

  async checkAndUpdateBusinessProfile(): Promise<void> {
    const org = await this.get();

    // Check if business profile is filled (at least address + city or phone + website)
    const hasLocation = !!(org.address && org.city);
    const hasContact = !!(org.phone || org.website);

    if (hasLocation && hasContact) {
      const progress = await this.getSetupProgress();
      if (!progress.businessProfile) {
        await this.markSetupComplete("businessProfile");
      }
    }
  }
}
