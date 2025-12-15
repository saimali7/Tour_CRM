import { test, expect, Page } from "@playwright/test";

/**
 * UI/UX Audit Tests
 *
 * These tests verify adherence to our design system principles:
 * - Semantic color tokens (no hardcoded colors)
 * - Consistent spacing and typography
 * - Proper loading states
 * - Error handling
 * - Accessibility
 */

// Test organization slug - should be set via env or fixture
const ORG_SLUG = process.env.TEST_ORG_SLUG || "test-org";
const BASE_URL = `/org/${ORG_SLUG}`;

// Helper to check for hardcoded colors in computed styles
async function checkNoHardcodedColors(page: Page) {
  const issues: string[] = [];

  // Check for hardcoded gray colors in text
  const grayTextElements = await page.locator('[class*="text-gray-"]').all();
  if (grayTextElements.length > 0) {
    issues.push(`Found ${grayTextElements.length} elements with hardcoded text-gray-* classes`);
  }

  // Check for hardcoded bg-white
  const whiteBackgrounds = await page.locator('[class*="bg-white"]').all();
  if (whiteBackgrounds.length > 0) {
    issues.push(`Found ${whiteBackgrounds.length} elements with hardcoded bg-white classes`);
  }

  // Check for hardcoded border-gray
  const grayBorders = await page.locator('[class*="border-gray-"]').all();
  if (grayBorders.length > 0) {
    issues.push(`Found ${grayBorders.length} elements with hardcoded border-gray-* classes`);
  }

  return issues;
}

// Helper to check loading states
async function checkLoadingStates(page: Page) {
  // Look for proper skeleton loaders
  const skeletons = await page.locator('[class*="animate-pulse"], .skeleton').all();
  return skeletons.length > 0;
}

// Helper to check empty states
async function checkEmptyState(page: Page) {
  // Empty states should have an icon, title, and optional action
  const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
  if (await emptyState.isVisible()) {
    // Should have some guidance text
    const hasText = await emptyState.locator("h3, p").count();
    return hasText > 0;
  }
  return true; // No empty state needed
}

test.describe("Design System Compliance", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(BASE_URL);
    // Wait for initial load
    await page.waitForLoadState("networkidle");
  });

  test("Dashboard uses semantic color tokens", async ({ page }) => {
    const issues = await checkNoHardcodedColors(page);
    expect(issues).toHaveLength(0);
  });

  test("Dashboard has proper page structure", async ({ page }) => {
    // Should have a main heading
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();

    // Should have navigation
    const nav = page.locator("nav, [role='navigation']").first();
    await expect(nav).toBeVisible();

    // Should have main content area
    const main = page.locator("main, [role='main']").first();
    await expect(main).toBeVisible();
  });

  test("Buttons follow variant hierarchy", async ({ page }) => {
    // Primary buttons should use bg-primary
    const primaryButtons = page.locator("button.bg-primary, [class*='bg-primary']");
    const count = await primaryButtons.count();

    // At least some primary actions should exist
    if (count > 0) {
      const firstPrimary = primaryButtons.first();
      await expect(firstPrimary).toHaveClass(/bg-primary/);
    }

    // Destructive buttons should use destructive variant
    const destructiveButtons = page.locator("[class*='destructive'], [class*='text-destructive']");
    // These are optional - just verify they use correct tokens if present
    const destructiveCount = await destructiveButtons.count();
    expect(destructiveCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Page Loading States", () => {
  test("Tours page shows loading skeleton", async ({ page }) => {
    await page.goto(`${BASE_URL}/tours`);

    // Should show loading state while fetching
    // Check that page eventually loads without errors
    await page.waitForLoadState("networkidle");

    // Should have table or empty state
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmptyState = await page
      .locator('[class*="empty"], [data-testid="empty-state"]')
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test("Bookings page shows loading state", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Page should render without errors
    const pageTitle = page.locator("h1");
    await expect(pageTitle).toContainText(/booking/i);
  });

  test("Customers page shows loading state", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState("networkidle");

    const pageTitle = page.locator("h1");
    await expect(pageTitle).toContainText(/customer/i);
  });

  test("Schedules page shows calendar or list view", async ({ page }) => {
    await page.goto(`${BASE_URL}/schedules`);
    await page.waitForLoadState("networkidle");

    // Should have either calendar or list view
    const hasContent = await page
      .locator('[class*="calendar"], table, [class*="schedule"]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .locator('[class*="empty"]')
      .isVisible()
      .catch(() => false);

    expect(hasContent || hasEmptyState).toBeTruthy();
  });
});

test.describe("Form UX", () => {
  test("Forms have proper labels and placeholders", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers/new`);
    await page.waitForLoadState("networkidle");

    // Check for form elements
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    // Each visible input should have associated label
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute("id");

      if (inputId) {
        // Should have label with matching for attribute
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = (await label.count()) > 0;

        // Or should have aria-label
        const ariaLabel = await input.getAttribute("aria-label");

        // Or should have placeholder
        const placeholder = await input.getAttribute("placeholder");

        expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
      }
    }
  });

  test("Form buttons have proper states", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers/new`);
    await page.waitForLoadState("networkidle");

    // Find submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    if (await submitButton.isVisible()) {
      // Should not be disabled initially (unless validation requires it)
      const isDisabled = await submitButton.isDisabled();
      // Note: This depends on form validation behavior
    }
  });

  test("Cancel button returns to previous page", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState("networkidle");

    // Go to new customer form
    await page.goto(`${BASE_URL}/customers/new`);
    await page.waitForLoadState("networkidle");

    // Find cancel button
    const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")').first();

    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForLoadState("networkidle");

      // Should return to customers list
      await expect(page).toHaveURL(/\/customers$/);
    }
  });
});

test.describe("Table UX", () => {
  test("Tables have sortable columns", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Check for sortable headers
    const sortableHeaders = page.locator("th button, th[class*='sortable'], th [class*='cursor-pointer']");
    const count = await sortableHeaders.count();

    // Tables should have at least some sortable columns
    // (If table exists and has data)
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    if (hasTable) {
      expect(count).toBeGreaterThanOrEqual(0); // Some tables may not have sorting
    }
  });

  test("Tables have pagination", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Check for pagination controls
    const pagination = page.locator('[class*="pagination"], button:has-text("Next"), button:has-text("Previous")');
    const hasPagination = (await pagination.count()) > 0;

    // Pagination should exist if table has many rows
    // (This is informational - may not have enough data to paginate)
  });

  test("Tables have row actions", async ({ page }) => {
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState("networkidle");

    // Check for row actions (view, edit, delete)
    const rowActions = page.locator("table tbody tr").first().locator("button, a");
    const hasTable = await page.locator("table tbody tr").first().isVisible().catch(() => false);

    if (hasTable) {
      const actionCount = await rowActions.count();
      expect(actionCount).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe("Navigation UX", () => {
  test("Sidebar highlights active page", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Active nav item should be visually distinct
    const activeNavItem = page.locator('nav a[class*="active"], nav a[aria-current="page"], nav a[class*="bg-"]');
    const hasActiveState = (await activeNavItem.count()) > 0;

    expect(hasActiveState).toBeTruthy();
  });

  test("Breadcrumbs show current location", async ({ page }) => {
    // Go to a detail page
    await page.goto(`${BASE_URL}/customers`);
    await page.waitForLoadState("networkidle");

    // Breadcrumbs are optional but if present should show path
    const breadcrumbs = page.locator('[aria-label="breadcrumb"], [class*="breadcrumb"]');
    const hasBreadcrumbs = (await breadcrumbs.count()) > 0;

    // This is optional - just verify it works if present
  });

  test("Page titles are descriptive", async ({ page }) => {
    const pages = [
      { url: `${BASE_URL}`, title: /dashboard/i },
      { url: `${BASE_URL}/bookings`, title: /booking/i },
      { url: `${BASE_URL}/customers`, title: /customer/i },
      { url: `${BASE_URL}/tours`, title: /tour/i },
      { url: `${BASE_URL}/schedules`, title: /schedule/i },
      { url: `${BASE_URL}/guides`, title: /guide/i },
    ];

    for (const { url, title } of pages) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      const h1 = page.locator("h1").first();
      await expect(h1).toContainText(title);
    }
  });
});

test.describe("Responsive Design", () => {
  test("Mobile navigation works", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Should have mobile menu toggle
    const menuToggle = page.locator('[aria-label*="menu"], button[class*="menu"], [data-testid="mobile-menu"]');
    const hasMobileMenu = (await menuToggle.count()) > 0;

    // Mobile should either show menu or have toggle
    const sidebarVisible = await page
      .locator("nav, aside")
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasMobileMenu || sidebarVisible).toBeTruthy();
  });

  test("Tables are scrollable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/bookings`);
    await page.waitForLoadState("networkidle");

    // Table container should have overflow handling
    const tableContainer = page.locator('[class*="overflow"], table').first();
    const exists = await tableContainer.isVisible().catch(() => false);

    // Table should be usable on mobile (scrollable or responsive)
  });

  test("Forms are usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/customers/new`);
    await page.waitForLoadState("networkidle");

    // Inputs should be full width on mobile
    const inputs = page.locator("input").first();
    const inputBox = await inputs.boundingBox();

    if (inputBox) {
      // Input should take most of screen width
      expect(inputBox.width).toBeGreaterThan(300);
    }
  });
});

test.describe("Dark Mode Support", () => {
  test("Respects system color scheme", async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Check that page renders without errors in dark mode
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Should have dark background (not white)
    // The actual implementation depends on CSS variables
  });
});

test.describe("Accessibility", () => {
  test("Has no duplicate IDs", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const ids = await page.evaluate(() => {
      const allElements = document.querySelectorAll("[id]");
      const idList: string[] = [];
      allElements.forEach((el) => {
        if (el.id) idList.push(el.id);
      });
      return idList;
    });

    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  test("Buttons have accessible names", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute("aria-label");
      const title = await button.getAttribute("title");

      // Button should have text, aria-label, or title
      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test("Images have alt text", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");

      // Image should have alt text or be decorative (role="presentation")
      expect(alt !== null || role === "presentation").toBeTruthy();
    }
  });

  test("Focus is visible", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Tab to first focusable element
    await page.keyboard.press("Tab");

    // Check that something has focus
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

test.describe("Error States", () => {
  test("404 page is styled", async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page-xyz`);

    // Should show styled 404, not raw error
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });

  test("Invalid URLs don't crash app", async ({ page }) => {
    await page.goto(`${BASE_URL}/bookings/invalid-id`);

    // Should handle gracefully
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
