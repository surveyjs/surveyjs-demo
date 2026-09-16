import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// The same database rule as the base config, which has already run these two
// lines by the time this one is read; repeated so this file says it too.
process.env.SJS_E2E_DB ??= path.join(os.tmpdir(), `sjs-demo-e2e-${randomUUID()}.db`);
process.env.DATABASE_PATH = process.env.SJS_E2E_DB;

/**
 * The same suite against `next dev`.
 *
 * React strips most of its warnings from a production build, so the default
 * config — which serves `next build && next start` — never sees them. This one
 * does, which is where problems like a misplaced `flushSync` call surface.
 *
 * Ports, reports and artifact folders are separate so both runs can live side
 * by side in CI without overwriting each other.
 */
const PORT = 3100;

export default defineConfig({
  ...base,
  globalSetup: "./e2e/warm-dev-routes.ts",
  outputDir: "test-results-dev",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report-dev" }],
    ["junit", { outputFile: "test-results-dev/e2e-junit-results.xml" }],
  ],
  use: {
    ...base.use,
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Every value is set: `process.env` is only typed as possibly undefined.
    env: { ...process.env } as Record<string, string>,
  },
});
