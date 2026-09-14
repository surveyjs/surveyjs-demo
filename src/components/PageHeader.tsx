import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChartColumnIcon,
  Code2Icon,
  PencilRulerIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { features, type Features } from "@/features";

/** The edition config names an icon; React lives here, not in the config. */
const DESIGNER_ICONS: Record<Features["designer"]["icon"], LucideIcon> = {
  json: Code2Icon,
  designer: PencilRulerIcon,
};

/**
 * The heading over a form, and the places it leads: the editor this form is
 * edited in, and — in editions that ship one — the dashboard its answers land in.
 * A records page puts its own actions for the open record first, in `actions`.
 */
export function PageHeader({
  title,
  description,
  configureHref,
  analyticsHref,
  actions,
}: {
  title: string;
  description: string;
  configureHref?: string;
  /** The dashboard for this form. Pages pass `features.analyticsHref?.(id)`. */
  analyticsHref?: string;
  /** Rendered before the analytics and editor buttons: a records page's switchers and PDF. */
  actions?: ReactNode;
}) {
  const DesignerIcon = DESIGNER_ICONS[features.designer.icon];

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {analyticsHref && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={analyticsHref}>
              <ChartColumnIcon />
              View analytics
            </Link>
          </Button>
        )}
        {configureHref && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={configureHref} title={features.designer.hint}>
              <DesignerIcon />
              {features.designer.label}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
