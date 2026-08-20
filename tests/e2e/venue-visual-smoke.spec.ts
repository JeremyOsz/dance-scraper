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
  const filters = page.getByRole("complementary", { name: "Filters" });
  await expect(filters.getByText(/\d+ visible classes?/)).toBeVisible({ timeout: 10000 });
  await filters.getByRole("button", { name: "Clear all" }).click();
  await filters.getByRole("group", { name: "Studios / organisers" }).getByRole("checkbox", { name: venue, exact: true }).check();
  await expect.poll(() => new URL(page.url()).searchParams.get("venue")).toBe(venue);
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
