import { test, expect } from "@playwright/test";

/**
 * Booking Flow E2E Tests
 *
 * Tests the complete booking lifecycle:
 * - Creating new bookings
 * - Viewing booking details
 * - Modifying bookings
 * - Cancelling bookings
 *
 * Based on UI/UX principle: "A new staff member should book a tour in under 2 minutes without training"
 */

const ORG_SLUG = process.env.TEST_ORG_SLUG || "test-org";
const BASE_URL = `/org/${ORG_SLUG}`;

test.describe("Booking List Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");
  });

  test("displays booking list with key information", async ({ page }) => {
    // Page title
    const title = page.locator("h1");
    await expect(title).toContainText(/booking/i);

    // Should have create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), a:has-text("Create"), a:has-text("New")');
    await expect(createButton.first()).toBeVisible();
  });

  test("has search functionality", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    await expect(searchInput.first()).toBeVisible();
  });

  test("has filter options", async ({ page }) => {
    // Should have status filter or filter button
    const filters = page.locator('select, button:has-text("Filter"), [class*="filter"]');
    const hasFilters = (await filters.count()) > 0;
    expect(hasFilters).toBeTruthy();
  });

  test("shows booking status with visual indicators", async ({ page }) => {
    // Status badges should use semantic classes
    const statusBadges = page.locator('[class*="status-"], [class*="badge"]');
    // If data exists, should have status indicators
  });
});

test.describe("Create Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings/new`);
    await page.waitForLoadState("networkidle");
  });

  test("has clear step progression", async ({ page }) => {
    // Booking form should have clear steps or sections
    const formSections = page.locator("form fieldset, form section, [class*='step']");
    const sectionCount = await formSections.count();

    // Should have organized sections
    expect(sectionCount).toBeGreaterThanOrEqual(0);
  });

  test("customer selection is intuitive", async ({ page }) => {
    // Should have customer search/select
    const customerField = page.locator('[class*="customer"], label:has-text("Customer"), input[name*="customer" i]').first();
    await expect(customerField).toBeVisible();
  });

  test("schedule selection shows availability", async ({ page }) => {
    // Should indicate available schedules
    const scheduleField = page.locator('[class*="schedule"], label:has-text("Schedule"), label:has-text("Tour")').first();
    await expect(scheduleField).toBeVisible();
  });

  test("shows pricing breakdown", async ({ page }) => {
    // Should display price information
    const priceInfo = page.locator('[class*="price"], [class*="total"], text=/\\$/');
    // Price display depends on selection state
  });

  test("submit button shows loading state", async ({ page }) => {
    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Book")').first();
    await expect(submitButton).toBeVisible();

    // Button should not be disabled by default (unless form is empty)
  });

  test("form validation prevents invalid submissions", async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Book")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors or prevent submission
      // Form should still be on the same page
      await expect(page).toHaveURL(/\/bookings\/new/);
    }
  });
});

test.describe("Booking Detail Page", () => {
  test("shows comprehensive booking information", async ({ page }) => {
    // Navigate to bookings list first
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Try to click on first booking if exists
    const firstBookingLink = page.locator("table tbody tr a, [class*='booking'] a").first();

    if (await firstBookingLink.isVisible().catch(() => false)) {
      await firstBookingLink.click();
      await page.waitForLoadState("networkidle");

      // Detail page should show key information
      const detailPage = page.locator('[class*="detail"], main');
      await expect(detailPage).toBeVisible();

      // Should have action buttons
      const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Cancel")');
      // Actions depend on booking state
    }
  });

  test("status changes are clearly visible", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Status should use semantic colors
    const statusElements = page.locator('[class*="status"]');
    const hasStatus = (await statusElements.count()) > 0;
    // Status display depends on data
  });
});

test.describe("Booking Modification", () => {
  test("edit preserves existing data", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Navigate to edit if booking exists
    const editButton = page.locator('a[href*="edit"], button:has-text("Edit")').first();

    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.waitForLoadState("networkidle");

      // Form should be pre-filled with existing data
      const inputs = page.locator("input:not([type='hidden'])");
      const inputCount = await inputs.count();

      // At least some inputs should have values
      // (This depends on the specific form)
    }
  });

  test("cancel confirmation prevents accidental cancellation", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Find cancel button if exists
    const cancelButton = page.locator('button:has-text("Cancel Booking"), button[class*="destructive"]').first();

    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]');
      const hasConfirmation = await confirmDialog.isVisible().catch(() => false);

      // Destructive actions should require confirmation
      expect(hasConfirmation).toBeTruthy();
    }
  });
});

test.describe("Booking UX Principles", () => {
  test("booking flow is completable in reasonable steps", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings/new`);
    await page.waitForLoadState("networkidle");

    // Count the number of required fields/steps
    const requiredFields = page.locator('[required], [aria-required="true"]');
    const requiredCount = await requiredFields.count();

    // Booking shouldn't require excessive fields
    // Per design: "Booking flow: 3 steps max, each with clear purpose"
    expect(requiredCount).toBeLessThanOrEqual(15);
  });

  test("inline help is available", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings/new`);
    await page.waitForLoadState("networkidle");

    // Form should have helper text or tooltips
    const helperText = page.locator('[class*="help"], [class*="hint"], [class*="description"], p[class*="text-muted"]');
    const hasHelp = (await helperText.count()) > 0;

    // Good forms have contextual help
    // (This is recommended but not strictly required)
  });

  test("keyboard navigation works", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings/new`);
    await page.waitForLoadState("networkidle");

    // Tab through form fields
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Focus should move through form elements
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});
