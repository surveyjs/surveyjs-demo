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
  // Legacy paths; links to them are out in the world. Temporary (307) on
  // purpose: browsers cache a 308, and `/claims` has just changed meaning.
  async redirects() {
    return [
      { source: "/checkout", destination: "/starter", permanent: false },
      { source: "/records", destination: "/claims", permanent: false },
      { source: "/checkout/configure", destination: "/configure?form=checkout", permanent: false },
      {
        source: "/records/configure",
        destination: "/configure?form=insurance-claim",
        permanent: false,
      },
      {
        source: "/claims/configure",
        destination: "/configure?form=insurance-claim",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
