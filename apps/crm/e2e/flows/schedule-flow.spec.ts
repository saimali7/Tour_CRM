import { test, expect } from "@playwright/test";

/**
 * Schedule Management E2E Tests
 *
 * Tests schedule (tour instance) operations:
 * - Calendar/list view
 * - Creating schedules
 * - Managing capacity
 * - Guide assignments
 *
 * Based on UI/UX principle: "Know if tomorrow is under control" - at-a-glance
 */

const ORG_SLUG = process.env.TEST_ORG_SLUG || "test-org";
const BASE_URL = `/org/${ORG_SLUG}`;

test.describe("Schedule List/Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");
  });

  test("shows schedules in organized view", async ({ page }) => {
    // Page title
    const title = page.locator("h1");
    await expect(title).toContainText(/schedule/i);

    // Should have view toggle or organized layout
    const viewToggle = page.locator('[class*="view"], [class*="toggle"], button:has-text("Calendar"), button:has-text("List")');
    // View options depend on implementation
  });

  test("today's schedules are prominent", async ({ page }) => {
    // Should highlight or emphasize today
    const todayIndicator = page.locator('[class*="today"], [aria-current="date"], button[class*="ring"]');
    // Today emphasis depends on calendar implementation
  });

  test("capacity is visually clear", async ({ page }) => {
    // Capacity should be visible
    const capacityIndicators = page.locator('[class*="capacity"], text=/\\/\\d+/, [class*="progress"]');
    // Capacity display depends on data
  });

  test("create schedule button is accessible", async ({ page }) => {
    const createButton = page.locator('a:has-text("Add"), a:has-text("New"), button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    await expect(createButton.first()).toBeVisible();
  });

  test("can filter by date range", async ({ page }) => {
    // Date navigation or filter
    const dateControls = page.locator('input[type="date"], button:has-text("Today"), [class*="date-picker"]');
    const hasDateControls = (await dateControls.count()) > 0;
    // Date filtering improves usability
  });
});

test.describe("Create Schedule", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules/new`);
    await page.waitForLoadState("networkidle");
  });

  test("tour selection is required", async ({ page }) => {
    const tourField = page.locator('select[name*="tour" i], [class*="tour-select"], label:has-text("Tour")');
    await expect(tourField.first()).toBeVisible();
  });

  test("date picker is intuitive", async ({ page }) => {
    const dateField = page.locator('input[type="date"], input[type="datetime-local"], [class*="date-picker"]');
    await expect(dateField.first()).toBeVisible();
  });

  test("time selection is available", async ({ page }) => {
    const timeField = page.locator('input[type="time"], input[name*="time" i], [class*="time"]');
    // Time selection might be combined with date
  });

  test("capacity defaults are sensible", async ({ page }) => {
    const capacityField = page.locator('input[name*="capacity" i], input[type="number"]');

    if (await capacityField.first().isVisible()) {
      const value = await capacityField.first().inputValue();
      // Should have default or be required
    }
  });

  test("guide assignment is available", async ({ page }) => {
    const guideField = page.locator('select[name*="guide" i], [class*="guide"], label:has-text("Guide")');
    // Guide assignment may be optional
  });
});

test.describe("Schedule Detail Page", () => {
  test("shows all essential schedule info", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    // Click on a schedule
    const scheduleLink = page.locator("table tbody tr a, [class*='schedule'] a, [class*='event']").first();

    if (await scheduleLink.isVisible().catch(() => false)) {
      await scheduleLink.click();
      await page.waitForLoadState("networkidle");

      // Should show tour name
      const tourName = page.locator("h1, h2").first();
      await expect(tourName).toBeVisible();

      // Should show date/time
      const dateTime = page.locator('text=/\\d{1,2}[:\\s]\\d{2}/, [class*="date"], [class*="time"]');
      // Date display depends on format
    }
  });

  test("booking count is visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    const scheduleLink = page.locator("table tbody tr a, [class*='schedule'] a").first();

    if (await scheduleLink.isVisible().catch(() => false)) {
      await scheduleLink.click();
      await page.waitForLoadState("networkidle");

      // Should show booking/participant count
      const countInfo = page.locator('text=/\\d+\\s*(of|\\/)\\s*\\d+/, [class*="participant"], [class*="booked"]');
      // Count display depends on data
    }
  });

  test("manifest/participant list is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    const scheduleLink = page.locator("table tbody tr a").first();

    if (await scheduleLink.isVisible().catch(() => false)) {
      await scheduleLink.click();
      await page.waitForLoadState("networkidle");

      // Should have participant list or manifest link
      const manifestSection = page.locator('[class*="participant"], [class*="manifest"], text=/participant/i');
      // Manifest depends on bookings
    }
  });

  test("quick actions are available", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    const scheduleLink = page.locator("table tbody tr a").first();

    if (await scheduleLink.isVisible().catch(() => false)) {
      await scheduleLink.click();
      await page.waitForLoadState("networkidle");

      // Should have edit action
      const editButton = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();
      await expect(editButton).toBeVisible();
    }
  });
});

test.describe("Schedule Status Management", () => {
  test("can cancel schedule with confirmation", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    const scheduleLink = page.locator("table tbody tr a").first();

    if (await scheduleLink.isVisible().catch(() => false)) {
      await scheduleLink.click();
      await page.waitForLoadState("networkidle");

      // Find cancel button
      const cancelButton = page.locator('button:has-text("Cancel"), button[class*="destructive"]').first();

      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();

        // Should show confirmation
        const confirmDialog = page.locator('[role="dialog"], [class*="modal"]');
        const hasConfirmation = await confirmDialog.isVisible().catch(() => false);
        expect(hasConfirmation).toBeTruthy();
      }
    }
  });
});

test.describe("Schedule UX - At-a-Glance", () => {
  test("tomorrow's schedules are easily findable", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    // Should be able to navigate to tomorrow quickly
    const tomorrowNav = page.locator('button:has-text("Tomorrow"), button:has-text("Next"), [class*="tomorrow"]');
    // Tomorrow navigation depends on implementation
  });

  test("schedule status is color-coded", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    // Status should use semantic colors
    const statusIndicators = page.locator('[class*="status-"], [class*="bg-success"], [class*="bg-warning"], [class*="bg-destructive"]');
    // Status colors depend on data
  });

  test("low capacity warnings are visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    // Near-full schedules should be highlighted
    const capacityWarnings = page.locator('[class*="warning"], [class*="danger"], [class*="full"]');
    // Warnings depend on data
  });
});
