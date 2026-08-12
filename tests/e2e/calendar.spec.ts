import { expect, test } from "@playwright/test";

test("loads the primary calendar interface and toggles month view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("desktop-card-agenda")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "London Dance Calendar" })).toBeAttached();
  await page.getByRole("radio", { name: "Month", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Week", exact: true })).toBeVisible();
});

test("hydrates the primary calendar state from its shareable URL", async ({ page }) => {
  await page.goto("/?view=day&time=evening");
  await expect(page.getByRole("radio", { name: "Day", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("checkbox", { name: "Evening" })).toBeChecked();
  await expect(page).toHaveURL(/view=day/);
});

test("opens organiser and physical-location directory pages", async ({ page }) => {
  await page.goto("/studios");
  await expect(page.getByRole("heading", { name: "Organisers & locations" })).toBeVisible();
  await page.getByRole("link", { name: "Locations" }).click();
  await expect(page.getByRole("heading", { name: "London Dance Locations" })).toBeVisible({ timeout: 15_000 });

  const firstLocation = page.getByRole("link", { name: "Open location" }).first();
  await firstLocation.click();
  await expect(page.getByRole("link", { name: "Open map" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Upcoming sessions" })).toBeVisible({ timeout: 15_000 });
});
