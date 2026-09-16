import { rmSync } from "node:fs";

/**
 * The run's database, with its WAL siblings, removed once the suite is done.
 * `SJS_E2E_DB` is set by `playwright.config.ts`.
 *
 * Playwright runs this before it stops the web server, and on Windows the
 * server's open handle refuses the delete. What is left is removed again as
 * the runner exits, by which time the server is gone.
 */
function remove(file: string): boolean {
  let removed = true;
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      rmSync(`${file}${suffix}`, { force: true });
    } catch {
      removed = false;
    }
  }
  return removed;
}

export default function removeE2eDatabase(): void {
  const file = process.env.SJS_E2E_DB;
  if (!file || remove(file)) return;
  process.once("exit", () => remove(file));
}
