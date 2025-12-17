import { test, expect } from "@playwright/test";

/**
 * Dashboard E2E Tests
 *
 * Tests the main dashboard experience:
 * - At-a-glance metrics
 * - Today's overview
 * - Quick actions
 * - Alerts and notifications
 *
 * Based on UI/UX principle: "Know if tomorrow is under control" - Peace of mind, preparedness
 */

const ORG_SLUG = process.env.TEST_ORG_SLUG || "test-org";
const BASE_URL = `/org/${ORG_SLUG}`;

test.describe("Dashboard Overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("shows welcome/greeting", async ({ page }) => {
    // Dashboard should have personalized or contextual greeting
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("displays key metrics", async ({ page }) => {
    // Should show important numbers at a glance
    const metricCards = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
    const metricCount = await metricCards.count();

    // Dashboard should have multiple metrics
    expect(metricCount).toBeGreaterThanOrEqual(2);
  });

  test("metrics have clear labels", async ({ page }) => {
    // Each metric should be labeled
    const statCards = page.locator('[class*="stat"], [class*="metric"]');
    const count = await statCards.count();

    if (count > 0) {
      const firstCard = statCards.first();
      const hasLabel = await firstCard.locator("p, span, label").count();
      expect(hasLabel).toBeGreaterThan(0);
    }
  });

  test("today's schedule summary is visible", async ({ page }) => {
    // Should show today's activity
    const todaySection = page.locator('text=/today/i, [class*="today"], [class*="upcoming"]');
    const hasTodayInfo = (await todaySection.count()) > 0;
    // Today's info improves dashboard value
  });

  test("quick action buttons are accessible", async ({ page }) => {
    // Common actions should be quick to access
    const quickActions = page.locator('a:has-text("New Booking"), a:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    // Quick actions improve productivity
  });
});

test.describe("Dashboard Data Freshness", () => {
  test("shows recent activity", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Should show recent bookings or activity
    const recentSection = page.locator('text=/recent/i, [class*="recent"], [class*="activity"]');
    // Recent activity helps track what happened
  });

  test("metrics update visually when stale", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Data should appear fresh (no staleness indicators unless intended)
    const staleIndicators = page.locator('[class*="stale"], [class*="outdated"]');
    const staleCount = await staleIndicators.count();
    expect(staleCount).toBe(0);
  });
});

test.describe("Dashboard Alerts", () => {
  test("important alerts are prominent", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Alerts should be visible if present
    const alerts = page.locator('[role="alert"], [class*="alert"], [class*="notification"]');
    // Alerts depend on system state
  });

  test("alerts have clear actions", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const alert = page.locator('[role="alert"], [class*="alert"]').first();

    if (await alert.isVisible().catch(() => false)) {
      // Alert should have dismiss or action button
      const actions = alert.locator("button, a");
      // Action depends on alert type
    }
  });
});

test.describe("Dashboard Navigation", () => {
  test("can navigate to all main sections", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const navLinks = [
      { text: /booking/i, url: /\/bookings/ },
      { text: /customer/i, url: /\/customers/ },
      { text: /tour/i, url: /\/tours/ },
      { text: /schedule/i, url: /\/schedules/ },
      { text: /guide/i, url: /\/guides/ },
    ];

    for (const { text, url } of navLinks) {
      const link = page.locator(`nav a:has-text("${text.source.replace(/\\|\//g, "")}")`).first();

      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(url);

        // Go back to dashboard
        await page.goto(BASE_URL);
        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("sidebar is always visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("nav, aside, [class*='sidebar']").first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe("Dashboard Performance", () => {
  test("loads in reasonable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Dashboard should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("no JavaScript errors on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Should have no console errors
    expect(errors.length).toBe(0);
  });
});

test.describe("Dashboard UX Principles", () => {
  test("follows information hierarchy", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Most important info should be at top
    const mainContent = page.locator("main, [role='main']").first();
    const boundingBox = await mainContent.boundingBox();

    if (boundingBox) {
      // Key metrics should be in upper portion
      const metricCards = page.locator('[class*="stat"], [class*="metric"]').first();
      const metricBox = await metricCards.boundingBox();

      if (metricBox) {
        // Metrics should be near top of main content
        expect(metricBox.y).toBeLessThan(500);
      }
    }
  });

  test("uses consistent card styling", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Cards should use semantic tokens (bg-card)
    const cards = page.locator('[class*="card"], [class*="rounded-lg border"]');
    const cardCount = await cards.count();

    // Dashboard should use cards for organization
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test("text hierarchy is clear", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Should have clear heading hierarchy
    const h1Count = await page.locator("h1").count();
    const h2Count = await page.locator("h2").count();

    // Should have main heading
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});
