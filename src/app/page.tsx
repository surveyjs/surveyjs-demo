import { rootMetadata } from "@/lib/metadata";

const FIRST_PAGE = "/leads";

/** The root is the link people share, so it previews as the whole demo, not as Leads. */
export const metadata = rootMetadata;

/**
 * Forwards to the first page with a meta refresh rather than `redirect()`.
 *
 * A 307 would be followed by every link preview, which would then show the Leads
 * page's title and description for the host root. A 200 carrying the root's own
 * tags, with a zero-second refresh (React hoists the `<meta>` into the head),
 * previews as the demo and still lands a browser on `/leads` before it paints.
 * Outside the `(shell)` group, so no admin chrome flashes first.
 */
export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${FIRST_PAGE}`} />
      <p className="p-6 text-sm">
        <a href={FIRST_PAGE} className="underline">
          Continue to the demo
        </a>
      </p>
    </>
  );
}
