import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  webServer: {
    command: `npm run start -- -p ${port}`,
    port,
    reuseExistingServer: false
  },
  use: {
    baseURL: `http://localhost:${port}`
  }
});
