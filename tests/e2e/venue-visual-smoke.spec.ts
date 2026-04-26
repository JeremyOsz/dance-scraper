import { expect, test } from "@playwright/test";

const noisyLabels = [
  "Menu",
  "Home",
  "Privacy policy",
  "Terms & conditions",
  "STAY INFORMED",
  "IT'S YOUR MOVE",
  "About",
  "Visit",
  "News",
  "Staff"
];

async function selectVenue(page: import("@playwright/test").Page, venue: string) {
  await expect(page.getByText(/Showing \d+ classes/)).toBeVisible({ timeout: 10000 });
  const clearFilters = page.getByRole("button", { name: "Clear filters" });
  if (await clearFilters.isEnabled()) {
    await clearFilters.click();
  }
  await page.getByRole("button", { name: venue, exact: true }).click();
  await expect(page.getByText(/Showing \d+ classes/)).toBeVisible();
}

test("venue pages avoid obvious nav/footer pollution", async ({ page }) => {
  await page.goto("/");

  const venues = ["Rambert", "Siobhan Davies Studios", "TripSpace", "Chisenhale Dance Space"];

  for (const venue of venues) {
    await selectVenue(page, venue);

    for (const noisy of noisyLabels) {
      await expect(page.getByText(noisy, { exact: true })).toHaveCount(0);
    }

    const safeName = venue.toLowerCase().replace(/\s+/g, "-");
    await page.screenshot({ path: `test-results/screenshots/${safeName}.png`, fullPage: true });
  }
});
