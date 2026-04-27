import { expect, test } from "@playwright/test";

test("loads calendar page and toggles month view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find dance classes in London — fast" })).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.getByRole("button", { name: "Week", exact: true })).toBeVisible();
});
