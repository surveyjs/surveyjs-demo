import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  // The SurveyJS commercial license key, read by src/lib/surveyjs-license.ts.
  //
  // Not a typo: the name has no NEXT_PUBLIC_ prefix, so Next.js does not expose
  // it to the browser on its own — this block is what forwards it. Keep the two
  // in step if either is renamed. The license only applies on the client, where
  // Survey Creator, PDF Generator and Dashboard run; this edition ships none of
  // them, leaves the key unset, and the value here is simply "".
  env: {
    NEXTJS_PUBLIC_SLK: process.env.NEXTJS_PUBLIC_SLK ?? "",
  },
};

export default nextConfig;
