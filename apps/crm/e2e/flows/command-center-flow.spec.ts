import { test, expect } from "@playwright/test";

/**
 * Command Center UI/UX Tests
 *
 * Verifies the guide assignment + dispatch surface:
 * - Core layout renders
 * - Date navigation works
 * - Timeline or empty state renders
 */

const ORG_SLUG = process.env.TEST_ORG_SLUG || "demo-tours";
const BASE_URL = `/org/${ORG_SLUG}/command-center`;

test.describe("Command Center", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test("renders core layout and navigation", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Tour Command Center" })).toBeVisible();
    await expect(
      page.getByText("Manage guide assignments and dispatch for the day")
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Previous day" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next day" })).toBeVisible();
  });

  test("date navigation updates URL", async ({ page }) => {
    await page.getByRole("button", { name: "Next day" }).click();
    await page.waitForURL(/date=\d{4}-\d{2}-\d{2}/);

    await page.getByRole("button", { name: "Previous day" }).click();
    await page.waitForURL(/date=\d{4}-\d{2}-\d{2}/);
  });

  test("timeline or empty state renders", async ({ page }) => {
    const signal = page
      .getByRole("heading", { name: "Unassigned" })
      .or(page.getByText("No Tours Scheduled", { exact: false }))
      .or(page.getByText(/guides\s*assigned/i))
      .or(page.getByText(/No guides available/i));

    await expect(signal.first()).toBeVisible();
  });
});
