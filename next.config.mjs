import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  // The SurveyJS commercial license key, read by src/lib/surveyjs-license.ts.
  //
  // SURVEYJS_KEY has no NEXT_PUBLIC_ prefix, so Next.js does not expose it to
  // the browser on its own — this block is what forwards it. Keep the two in
  // step if either is renamed. The value is inlined into the server and the
  // client bundles alike; when it is "" no license is applied.
  env: {
    SURVEYJS_KEY: process.env.SURVEYJS_KEY ?? "",
  },
};

export default nextConfig;
