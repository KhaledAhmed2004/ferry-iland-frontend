import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:5000/api/v1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // flows share DB state (seats, bookings) — run in order
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    // Local: always record a trace so every run can be replayed step by step (npm run e2e:report).
    trace: process.env.CI ? "retain-on-failure" : "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) }
  },

  // "chromium" listed first so UI mode (npm run e2e:ui) shows the real flows by default
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"]
    },
    { name: "setup", testMatch: /auth\.setup\.ts/ }
  ],

  // Starts servers if they aren't already running; reuses them if they are.
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: `${API_URL.replace(/\/api\/v1$/, "")}/api/v1/ports`,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 180_000
    }
  ]
});
