import { expect, test } from "@playwright/test";

test.describe("redesigned calendar", () => {
  test("provides the desktop card agenda, filters, views, and event drawer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonicalHref ?? "", page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { level: 1, name: "London Dance Calendar" })).toBeAttached();
    await expect(page.getByRole("complementary", { name: "Filters" })).toBeVisible();
    await expect(page.getByTestId("desktop-card-agenda")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("region", { name: /scroll horizontally for more dates/i })).toBeVisible();
    await expect(page.getByTestId("mobile-agenda")).toBeHidden();
    await expect(page.getByRole("radio", { name: "Week", exact: true })).toHaveAttribute("aria-checked", "true");

    await page.evaluate(() => window.scrollTo(0, 700));
    const headerBox = await page.locator("main > header").boundingBox();
    const sidebarBox = await page.getByRole("complementary", { name: "Filters" }).boundingBox();
    expect(headerBox?.y).toBe(0);
    expect(sidebarBox?.y).toBe(72);
    expect((sidebarBox?.y ?? 0) + (sidebarBox?.height ?? 0)).toBeLessThanOrEqual(1000);

    const venueToggle = page.getByTestId("desktop-card-agenda").locator('button[aria-controls^="desktop-venue-"]').first();
    await venueToggle.click();
    await expect(venueToggle).toHaveAttribute("aria-expanded", "false");
    await venueToggle.click();
    await expect(venueToggle).toHaveAttribute("aria-expanded", "true");

    await page.getByTestId("desktop-card-agenda").getByRole("button", { name: /Open details:/ }).first().click();
    const details = page.getByRole("dialog", { name: /.+/ });
    await expect(details.getByRole("link", { name: "Book now" })).toBeVisible();
    await expect(details.getByRole("button", { name: "Close details" })).toBeVisible();
    await details.getByRole("button", { name: "Close details" }).click();

    await page.getByRole("radio", { name: "Month", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Month", exact: true })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: /^Open / }).first().click();
    await expect(page.getByRole("radio", { name: "Day", exact: true })).toHaveAttribute("aria-checked", "true");

    const pageOverflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(pageOverflows).toBe(false);

    await page.setViewportSize({ width: 900, height: 800 });
    await expect(page.getByRole("complementary", { name: "Filters" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
  });

  test("uses the phone agenda, filter sheet, and event detail sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByTestId("mobile-agenda")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("desktop-card-agenda")).toBeHidden();
    await expect(page.getByTestId("mobile-agenda").getByRole("button", { name: /Show .+, today/ })).toBeVisible();

    const mobileVenueToggle = page.getByTestId("mobile-agenda").locator('button[aria-controls$="-classes"]').first();
    await mobileVenueToggle.click();
    await expect(mobileVenueToggle).toHaveAttribute("aria-expanded", "false");
    await mobileVenueToggle.click();

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Filters" });
    await expect(filters.getByRole("checkbox", { name: "Evening" })).toBeVisible();
    await filters.getByRole("checkbox", { name: "Evening" }).check();
    await filters.getByRole("button", { name: /Show .* classes?/ }).click();

    await page.getByTestId("mobile-agenda").getByRole("button", { name: /Open details:/ }).first().click();
    const details = page.getByRole("dialog", { name: /.+/ });
    await expect(details.getByRole("link", { name: "Book now" })).toBeVisible();
    await expect(details.getByRole("button", { name: /shortlist/i })).toBeVisible();

    const pageOverflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(pageOverflows).toBe(false);
  });
});
