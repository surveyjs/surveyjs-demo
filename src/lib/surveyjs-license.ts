/**
 * Applies the SurveyJS license key, when there is one.
 *
 * Import it for its side effect (`import "@/lib/surveyjs-license"`) from any
 * module that renders SurveyJS; the key is applied once per JavaScript runtime,
 * however many modules import this file. `slk` comes from `survey-core`, so this
 * file is MIT-clean and identical in both editions.
 *
 * The key is `SURVEYJS_KEY` in `.env`. It is inlined at build time by the
 * `env` block in `next.config.mjs`, on the server and in the browser alike.
 * Unset or blank, nothing is applied, and the commercial products still run
 * and mark their output.
 */
import { slk } from "survey-core";

const licenseKey = process.env.SURVEYJS_KEY?.trim();

if (licenseKey) {
  slk(licenseKey);
}
