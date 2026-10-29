"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Survey } from "survey-react-ui";
import type { Model as SurveyModel, Question } from "survey-core";
import {
  createSurveyModel,
  type FinishMode,
  type SchemaInput,
  type SurveyData,
  type SurveyJSON,
  type SurveyMode,
} from "@/schemas";
import { features } from "@/features";
import "@/lib/surveyjs-license";
import { submitResult } from "@/storage/survey-results";
import { announceCompleted } from "@/lib/demo-events";
import { useStorageAccess } from "./StorageAccess";
import { useFinish } from "./useFinish";

import "survey-core/survey-core.css";
import "survey-core/themes/adapters/shadcn-base-nova.css";
import "@/styles/survey-overrides-shadcn.css";
import "@/styles/survey-overrides-base-nova.css";

/**
 * A survey definition, rendered. This is the whole integration:
 *
 * ```tsx
 * const model = createSurveyModel(schema, { data, mode });
 * return <Survey model={model} />;
 * ```
 *
 * Two lines, both below, and there is no third one hiding anywhere: no wrapper
 * component per form, no field registry, no adapter between the JSON and the
 * inputs. The four CSS imports above are the theme, and the survey then takes
 * its colours, radius and light/dark from the same shadcn tokens as the rest of
 * the app.
 *
 * Everything else in this file is convenience *this template* wanted, and each
 * piece is one hook you can delete without touching the rest:
 *
 *  - {@link usePrefillAction} — the "Prefill demo data" button in the survey's
 *    own navigation bar, for filling a long form in front of an audience;
 *  - {@link usePdfAction} — "Save as PDF" beside it, when the edition provides a
 *    PDF export, which gets the same definition and the answers on screen;
 *  - {@link useSubmission} — what happens to the answers when the form is
 *    finished: hand them to the caller, or POST them through the storage seam.
 *
 * Whether finishing *completes* the survey is the page's `finish`, applied by
 * `useFinish`: `"complete"` shows the definition's own `completedHtml`, and
 * `"save"` keeps the form on screen while the caller saves.
 *
 * Server rendering needs nothing special: this component is a client component
 * because survey-react-ui uses browser APIs, but Next.js still renders it on the
 * server, so the form is in the HTML the server sends. The page passes the
 * definition the visitor stored, read on the server, so an edit made on
 * `/configure` is in that HTML too. See `/starter` — view source.
 */
export function SurveyForm({
  schema,
  schemaId,
  data,
  variables,
  mode,
  finish,
  onComplete,
  prefillData,
  prefillLabel = "Prefill demo data",
  pdfInNavigation = true,
  completeText,
  onModelReady,
}: {
  schema: SchemaInput;
  /**
   * The form's schema id: a completed form is submitted under this id, and the
   * PDF export is labelled with it.
   */
  schemaId?: string;
  data?: SurveyData;
  /**
   * Published to the model as survey variables, e.g. `{ user }` for a page
   * rendered for the signed-in user. A new object rebuilds the model, so pass a
   * memoized one.
   */
  variables?: Readonly<Record<string, unknown>>;
  mode?: SurveyMode;
  /** The page's `finish`: what finishing the form does. See `FinishMode`. */
  finish: FinishMode;
  /**
   * Called instead of {@link submitResult} when the caller owns persistence
   * itself, as the records pages do. In `"save"` mode it may return a promise,
   * and the survey's navigation stays blocked until it settles.
   */
  onComplete?: (data: SurveyData) => unknown;
  prefillData?: SurveyData;
  prefillLabel?: string;
  /**
   * "Save as PDF" in the survey's own navigation bar, when the edition provides
   * a PDF export. The records pages turn it off and keep the form's navigation
   * to its own actions.
   */
  pdfInNavigation?: boolean;
  /**
   * What the button that finishes the form says. Worth setting wherever the
   * page has its own word for it - the records editor says Save changes above
   * the form and should not say Complete below it.
   */
  completeText?: string;
  onModelReady?: (model: SurveyModel) => void;
}) {
  // The two lines that are the actual integration.
  const model = useMemo(
    () => createSurveyModel(schema, { data, variables, mode }),
    [schema, data, variables, mode],
  );

  useEffect(() => {
    if (completeText) model.completeText = completeText;
  }, [completeText, model]);

  usePrefillAction(model, prefillData, prefillLabel);
  usePdfAction(model, schemaId, variables, pdfInNavigation);
  useFinish(model, finish, useSubmission(onComplete, schemaId));

  useEffect(() => {
    onModelReady?.(model);
  }, [model, onModelReady]);

  return (
    <div className="relative overflow-hidden border">
      <Survey model={model} />
    </div>
  );
}

/**
 * "Prefill demo data", added to the survey's own navigation bar.
 *
 * `addNavigationItem` is why there is no button in the JSX: the control belongs
 * to the survey, sits beside Next and Complete, and is themed with them. It
 * fills the page in view rather than the whole form, so a demo can walk one
 * page at a time.
 */
function usePrefillAction(
  model: SurveyModel,
  prefillData: SurveyData | undefined,
  prefillLabel: string,
): void {
  useEffect(() => {
    if (!prefillData) return;
    const id = "sv-prefill-demo";

    model.addNavigationItem({
      id,
      title: prefillLabel,
      action: () => {
        const onThisPage = new Set(
          model.currentPage.questions.map((question: Question) =>
            question.getValueName(),
          ),
        );
        model.mergeData(
          Object.fromEntries(
            Object.entries(prefillData).filter(([name]) => onThisPage.has(name)),
          ),
        );
      },
    });

    return () => {
      model.navigationBar.removeActionById(id);
    };
  }, [model, prefillData, prefillLabel]);
}

/**
 * "Save as PDF", next to Prefill in the survey's own navigation bar — only when
 * the edition provides a PDF export (`features.exportPdf`). Without one, nothing
 * is added.
 *
 * There is no separate print layout and no export mapping: `model.toJSON()` is
 * the definition currently on screen — the shipped one, or the copy a visitor
 * edited on `/configure` — and `model.data` is what they have answered so far,
 * so the document is the form, filled in as far as it has been filled in. The
 * variables go with them: the definition reads them, and the JSON does not hold
 * them.
 */
function usePdfAction(
  model: SurveyModel,
  schemaId: string | undefined,
  variables: Readonly<Record<string, unknown>> | undefined,
  enabled: boolean,
): void {
  useEffect(() => {
    const exportPdf = features.exportPdf;
    if (!enabled || !exportPdf) return;
    const id = "sv-export-pdf";

    model.addNavigationItem({
      id,
      title: "Save as PDF",
      action: () => {
        void exportPdf(model.toJSON() as SurveyJSON, {
          label: model.title || schemaId || "form",
          data: model.data,
          variables,
        });
      },
    });

    return () => {
      model.navigationBar.removeActionById(id);
    };
  }, [enabled, model, schemaId, variables]);
}

/**
 * What a finished form does with its answers: the callback `useFinish` calls.
 *
 * `onComplete` wins where the caller owns persistence — a records page writes
 * the record itself — and otherwise the answers go through the storage seam,
 * which is where a real app POSTs them.
 *
 * A submission that fails is logged, and the definition's completed page shows
 * anyway: nothing on the page reads submissions back, so a retry would be new
 * UI for nothing. A browser that blocks the storage cookie submits nothing at
 * all.
 */
function useSubmission(
  onComplete: ((data: SurveyData) => unknown) | undefined,
  schemaId: string | undefined,
): (data: SurveyData) => unknown {
  const { readOnly } = useStorageAccess();

  return useCallback(
    (data: SurveyData) => {
      if (onComplete) return onComplete(data);
      if (!schemaId || readOnly) return;
      // Stored: the dock's "See next" card may show. A caller that owns
      // persistence announces its own save.
      return submitResult(schemaId, data).then(announceCompleted, (failure: unknown) => {
        console.error(`[survey-results] ${schemaId} was not submitted`, failure);
      });
    },
    [onComplete, schemaId, readOnly],
  );
}
