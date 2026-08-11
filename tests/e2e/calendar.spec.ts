import { expect, test } from "@playwright/test";

test("loads calendar page and toggles month view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Floor Is Yours..." })).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toBeVisible();
});

test("opens the dedicated Courses view and returns to Calendar", async ({ page }) => {
  await page.goto("/?mode=courses&view=week");
  await expect(page.getByRole("heading", { name: "Find dance courses" })).toBeVisible();
  await expect(page).toHaveURL(/mode=courses/);

  await page.getByRole("button", { name: "Calendar view" }).click();
  await expect(page.getByRole("heading", { name: "Find dance classes" })).toBeVisible();
  await expect(page).toHaveURL(/mode=calendar/);
});

test("opens organiser and physical-location directory pages", async ({ page }) => {
  await page.goto("/studios");
  await expect(page.getByRole("heading", { name: "Organisers & locations" })).toBeVisible();
  await page.getByRole("link", { name: "Locations" }).click();
  await expect(page.getByRole("heading", { name: "London Dance Locations" })).toBeVisible();

  const firstLocation = page.getByRole("link", { name: "Open location" }).first();
  await firstLocation.click();
  await expect(page.getByRole("link", { name: "Open map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Upcoming sessions" })).toBeVisible();
});
