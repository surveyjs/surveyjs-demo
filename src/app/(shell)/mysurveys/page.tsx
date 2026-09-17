import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { navPages } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";
import {
  MYSURVEYS_COPY,
  MYSURVEYS_FRAME_TEXT,
  MYSURVEYS_PATHS,
  MYSURVEYS_SCREENSHOTS,
} from "@/lib/mysurveys";

// The row is `edition: "full"`, so an edition without it has no such page:
// `navPages` is already filtered, and the route answers 404 there.
const nav = navPages.find((item) => item.id === "mySurveys");

export const metadata: Metadata = nav ? pageMetadata(nav.id) : {};

/**
 * Whether a capture exists, asked while the page is built. The route has no
 * per-request input, so Next.js prerenders it and the answer is part of the
 * build: add the PNG under `public/mysurveys/`, rebuild, and the frame becomes
 * the image, with no code change.
 */
function hasCapture(file: string): boolean {
  return existsSync(path.join(process.cwd(), "public", file));
}

/**
 * MySurveys, the hosted form-management application, shown before anyone is sent
 * to its login screen, with the two alternatives beside it. The page links out
 * and embeds nothing, and it renders no form: there is no `schemaId` on its row.
 */
export default function MySurveysPage() {
  if (!nav) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title={nav.label} description={MYSURVEYS_COPY.description} />

      <div className="grid gap-4 sm:grid-cols-2">
        {MYSURVEYS_SCREENSHOTS.map((shot) => (
          <figure key={shot.id} data-screenshot={shot.id} className="flex flex-col gap-2">
            {hasCapture(shot.file) ? (
              <Image
                src={shot.file}
                alt={shot.label}
                width={1600}
                height={1000}
                className="aspect-[16/10] w-full rounded-lg border object-cover"
              />
            ) : (
              // Visibly empty on purpose: no fake UI stands in for a capture.
              <div
                data-placeholder=""
                className="text-muted-foreground flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm"
              >
                <ImageIcon className="size-5" aria-hidden />
                <span className="text-foreground font-medium">{shot.label}</span>
                <span className="text-xs">{MYSURVEYS_FRAME_TEXT}</span>
              </div>
            )}
            <figcaption className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">{shot.label}</span> — {shot.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {MYSURVEYS_PATHS.map((item) => (
          <Card key={item.id} data-path={item.id} className="gap-3 px-6">
            <h2 className="text-base font-semibold">{item.heading}</h2>
            <p className="text-muted-foreground flex-1 text-sm leading-relaxed">{item.copy}</p>
            <div>
              <Button asChild size="sm" variant={item.id === "hosted" ? "default" : "outline"}>
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.button} ↗
                </a>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
