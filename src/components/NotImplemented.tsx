import { useId } from "react";
import { ConstructionIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

/**
 * A page that is in the sidebar but not built yet.
 *
 * It wears the normal shell and page header, so the chrome around it is real and
 * testable, and it says plainly that the page does not exist yet. It shows no
 * form, no mock data and no screenshot: a placeholder that looks like the page
 * would promise something the template does not do.
 */
export function NotImplemented({
  title,
  description,
  features,
}: {
  title: string;
  /** One line on what the page will show — usually the sidebar description. */
  description: string;
  /** What the page will demonstrate once it is built. */
  features?: readonly string[];
}) {
  const headingId = useId();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title={title} description={description} />
      <Card className="gap-3 px-6" data-not-implemented="">
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
            <ConstructionIcon className="text-muted-foreground size-4" aria-hidden />
            Not implemented yet
          </h2>
          <p className="text-muted-foreground text-sm">This page is not built yet.</p>
          {features && features.length > 0 && (
            <div className="text-sm">
              <p>It will demonstrate:</p>
              <ul className="text-muted-foreground mt-1 list-disc pl-5">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
