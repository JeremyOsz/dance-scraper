import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  webServer: {
    command: "npm run start -- -p 3000",
    port: 3000,
    reuseExistingServer: false
  },
  use: {
    baseURL: "http://localhost:3000"
  }
});
