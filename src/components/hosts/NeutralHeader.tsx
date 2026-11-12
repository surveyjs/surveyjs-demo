import Image from "next/image";
import type { ReactNode } from "react";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * The header of a page that pretends to be nobody's product: Starter,
 * Definition & checks and every "how it's built" page. The SurveyJS logo links
 * to the main website, followed by the page's title and what it is for.
 *
 * A server component. `width` is the page's own column, so the header lines up
 * with what is under it.
 */
export function NeutralHeader({
  title,
  description,
  actions,
  width = "max-w-[96rem]",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  width?: string;
}) {
  return (
    <header className="border-b">
      <div className={mergeTailwindClasses("mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6", width)}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <a
            href="https://surveyjs.io/"
            className="hover:text-primary flex w-fit min-w-0 items-center"
          >
            <Image
              src="/surveyjs-logo.svg"
              alt="SurveyJS"
              width={78}
              height={32}
              className="h-8 w-auto translate-y-1"
              priority
            />
          </a>
          {actions}
        </div>
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
