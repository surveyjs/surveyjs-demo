import Link from "next/link";
import { LayersIcon } from "lucide-react";
import { DEMO_NAME } from "@/lib/site";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * The header of a page that pretends to be nobody's product: Starter,
 * Definition & checks and every "how it's built" page. The demo's own mark and
 * name, linking the root index, then the page's title and what it is for.
 *
 * A server component. `width` is the page's own column, so the header lines up
 * with what is under it.
 */
export function NeutralHeader({
  title,
  description,
  width = "max-w-[96rem]",
}: {
  title?: string;
  description?: string;
  width?: string;
}) {
  return (
    <header className="border-b">
      <div className={mergeTailwindClasses("mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6", width)}>
        <Link
          href="/"
          className="hover:text-primary flex w-fit min-w-0 items-center gap-2 underline-offset-4 hover:underline"
        >
          <span
            className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
            aria-hidden
          >
            <LayersIcon className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold">{DEMO_NAME}</span>
        </Link>
        {title && (
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          </div>
        )}
      </div>
    </header>
  );
}
