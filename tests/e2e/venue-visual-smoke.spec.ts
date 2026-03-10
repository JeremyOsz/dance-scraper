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
  const venueSelect = page.getByRole("combobox").first();
  await venueSelect.click();
  const option = page.getByRole("option", { name: venue, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await page.waitForTimeout(500);
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
