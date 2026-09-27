import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Every canonical and og:url is built from NEXT_PUBLIC_SITE_URL, and without it
// they all say http://localhost:3000. Loud rather than fatal: `npm run e2e:ci`,
// `npm run verify` and CI run production builds with no site URL on purpose.
// Once per process tree: Next.js loads this file again in its build workers,
// which inherit the flag.
if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_SITE_URL &&
  !process.env.SJS_SITE_URL_REPORTED
) {
  process.env.SJS_SITE_URL_REPORTED = "1";
  console.error(
    [
      "",
      "NEXT_PUBLIC_SITE_URL is not set.",
      "  Every canonical link and og:url on this deployment will point at http://localhost:3000.",
      "  Set it to this host, with no trailing slash, and rebuild: it is inlined at build time.",
      "  See .env.example for each edition's production host.",
      "",
    ].join("\n"),
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  // Every client gets page metadata in the <head>, not streamed after the body.
  // Only /configure (and /analytics in the full edition) render per request,
  // their metadata is cheap, and "view source" should show the real tags.
  htmlLimitedBots: /.*/,
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
  // purpose: browsers cache a 308, and the Documents page has changed before.
  // `/claims` was the CMS-1500 claim, archived in `src/archive/insurance-claim`;
  // `/work-orders` has its place now.
  async redirects() {
    return [
      { source: "/checkout", destination: "/starter", permanent: false },
      { source: "/records", destination: "/work-orders", permanent: false },
      { source: "/claims", destination: "/work-orders", permanent: false },
      { source: "/checkout/configure", destination: "/configure?form=checkout", permanent: false },
      {
        source: "/records/configure",
        destination: "/configure?form=work-order",
        permanent: false,
      },
      {
        source: "/claims/configure",
        destination: "/configure?form=work-order",
        permanent: false,
      },
      // The explainers' index, folded into the root index; and a page retired
      // because the site's use-cases page links that application directly.
      { source: "/how", destination: "/", permanent: false },
      { source: "/mysurveys", destination: "/", permanent: false },
      { source: "/mysurveys/how", destination: "/", permanent: false },
      // The host pages lost their `/embedded` prefix when the admin shell they
      // stood outside of was removed; the explainers moved with them.
      { source: "/embedded/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
