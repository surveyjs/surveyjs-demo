import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * One database per run, shared by the server and the test process, so a spec can
 * read with SQL what the browser stored, and a developer's `.data/demo.db` is
 * never opened. This file is evaluated by the main process first and every
 * worker inherits its environment, so all of them open the same file; a
 * `DATABASE_PATH` from the shell is overridden, not kept. WAL makes the
 * processes safe together. A dev server left running is still reused, and
 * brings its own database.
 */
process.env.SJS_E2E_DB ??= path.join(os.tmpdir(), `sjs-demo-e2e-${randomUUID()}.db`);
process.env.DATABASE_PATH = process.env.SJS_E2E_DB;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  globalTeardown: "./e2e/remove-e2e-db.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/e2e-junit-results.xml" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // The command builds before it serves, and the full edition's build alone can
    // outlast Playwright's default 60 seconds.
    timeout: 180_000,
    // Every value is set: `process.env` is only typed as possibly undefined.
    env: { ...process.env } as Record<string, string>,
  },
});
