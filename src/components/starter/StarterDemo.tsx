"use client";

import { useState } from "react";
import { checkoutSample, getFormNavItem, type SurveyData, type SurveyJSON } from "@/schemas";
import { DemoDock } from "@/components/dock/DemoDock";
import { SurveyForm } from "@/components/SurveyForm";
import { SurveyOutline } from "@/components/survey-outline/SurveyOutline";
import { features } from "@/features";
import { configureHref } from "@/lib/routes";

const nav = getFormNavItem("starter");

export function StarterDemo({ schema }: { schema: SurveyJSON }) {
  const [data, setData] = useState<SurveyData>();

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6">
        <SurveyOutline activate>
          <SurveyForm schema={schema} schemaId={nav.schemaId} finish={nav.finish} data={data} />
        </SurveyOutline>
      </main>
      <DemoDock
        exampleId={nav.id}
        configureHref={configureHref(nav.schemaId)}
        analyticsHref={features.analyticsHref?.(nav.schemaId)}
        onPrefill={() => setData(structuredClone(checkoutSample))}
      />
    </>
  );
}
