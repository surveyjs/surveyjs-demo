"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { features } from "@/features";
import { getSchemaDefinition, isActiveRoute, navPages } from "@/schemas";
import { PAGE_ACTIONS } from "@/lib/site";
import {
  HOW_BUILT,
  HOW_BUILT_TEXT,
  findVariableReferences,
  itemsInEdition,
  type HowBuiltFeature,
  type HowBuiltItem,
} from "@/lib/how-built";
import { mergeTailwindClasses } from "@/lib/utils";
import { useHowBuilt } from "./HowBuiltProvider";

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

function Items({ items }: { items: readonly HowBuiltItem[] }) {
  return (
    <ul className="space-y-3">
      {itemsInEdition(items, features.edition).map((item) => (
        <li key={item.label} className="text-sm">
          <p className="font-medium">{item.label}</p>
          <p className="text-muted-foreground mt-0.5">{item.detail}</p>
          {item.source && (
            <a
              href={`${features.brand.sourceUrl}/blob/main/${item.source}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary mt-0.5 inline-block font-mono text-xs underline-offset-4 hover:underline"
            >
              {item.source}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function FeatureChip({ feature }: { feature: HowBuiltFeature }) {
  const elsewhere = feature.edition !== undefined && feature.edition !== features.edition;
  return (
    <Badge
      variant={feature.status === "coming" || elsewhere ? "outline" : "secondary"}
      className={mergeTailwindClasses("gap-1.5 whitespace-normal", elsewhere && "text-muted-foreground")}
    >
      {feature.label}
      {feature.status === "coming" && (
        <span className="text-muted-foreground font-normal">· {HOW_BUILT_TEXT.coming}</span>
      )}
      {elsewhere && (
        <span className="font-normal">· {features.brand.otherEdition.label}</span>
      )}
    </Badge>
  );
}

/**
 * The "How this page is built" panel: what goes into the form on this page,
 * what the definition does with it, and what comes out.
 *
 * Non-modal, on purpose: the form it explains stays usable beside it. The
 * content is `HOW_BUILT` in `src/lib/how-built.ts`; the variable references are
 * read off the definition that ships, so they cannot drift from the JSON.
 */
export function HowBuiltPanel() {
  const { open, setOpen } = useHowBuilt();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // A record's own URL (`/leads/LEAD-0001`) is described by its page.
  const page = navPages.find((item) => isActiveRoute(pathname, item.path));
  const content = page ? HOW_BUILT[page.id] : undefined;
  const schemaId = page?.schemaId;

  const references = useMemo(
    () =>
      content && schemaId
        ? findVariableReferences(getSchemaDefinition(schemaId).json, content.variables)
        : [],
    [content, schemaId],
  );

  if (!open) return null;

  return (
    <aside
      aria-label={PAGE_ACTIONS.howBuilt}
      className="bg-background fixed top-14 right-0 bottom-0 z-30 w-[26rem] max-w-full overflow-y-auto border-l shadow-lg"
    >
      <div className="bg-background sticky top-0 flex items-center justify-between gap-2 border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{PAGE_ACTIONS.howBuilt}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setOpen(false)}>
          <XIcon />
        </Button>
      </div>

      {!content || !schemaId ? (
        <p className="text-muted-foreground px-5 py-4 text-sm">{HOW_BUILT_TEXT.notDescribed}</p>
      ) : (
        <div className="space-y-6 px-5 py-4">
          <div className="space-y-2">
            <p className="text-sm">{content.summary}</p>
            {content.listNote && (
              <p className="text-muted-foreground text-xs">{content.listNote}</p>
            )}
          </div>

          <section>
            <SectionTitle>Data in</SectionTitle>
            <Items items={content.dataIn} />
          </section>

          <section>
            <SectionTitle>What the definition reads</SectionTitle>
            {references.length === 0 ? (
              <p className="text-muted-foreground text-sm">{HOW_BUILT_TEXT.noVariables}</p>
            ) : (
              <ul className="space-y-2">
                {references.map((reference, index) => (
                  <li key={index} className="text-sm">
                    <p>
                      <span className="font-medium">{reference.element}</span>{" "}
                      <span className="text-muted-foreground">{reference.property}</span>
                    </p>
                    <code className="bg-muted mt-0.5 block rounded px-1.5 py-1 font-mono text-xs break-words">
                      {reference.expression}
                    </code>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground mt-2 text-xs">{HOW_BUILT_TEXT.shippedNote}</p>
          </section>

          <section>
            <SectionTitle>Data out</SectionTitle>
            <Items items={content.dataOut} />
          </section>

          <section>
            <SectionTitle>Features</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {content.features.map((feature) => (
                <FeatureChip key={feature.label} feature={feature} />
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
