"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Survey } from "survey-react-ui";
import type { Model as SurveyModel, Question } from "survey-core";
import {
  createSurveyModel,
  type SchemaInput,
  type SurveyData,
  type SurveyJSON,
  type SurveyMode,
} from "@/schemas";
import { features } from "@/features";
import { loadSurveyJson } from "@/storage/survey-json";
import { submitResult } from "@/storage/survey-results";
import { FormCompleted } from "./FormCompleted";

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
 *  - {@link useSavedDefinition} — swap in the definition a visitor edited on
 *    `/configure`, on the client only, so the server keeps sending the canonical
 *    form;
 *  - {@link usePrefillAction} — the "Prefill demo data" button in the survey's
 *    own navigation bar, for filling a long form in front of an audience;
 *  - {@link usePdfAction} — "Save as PDF" beside it, when the edition provides a
 *    PDF export, which gets the same definition and the answers on screen;
 *  - {@link useSubmission} — what happens on completion: hand the answers to the
 *    caller, or POST them through the storage seam.
 *
 * Server rendering needs nothing special: this component is a client component
 * because survey-react-ui uses browser APIs, but Next.js still prerenders it, so
 * the form is in the HTML the server sends. See `/claims` — view source.
 */
export function SurveyForm({
  schema,
  schemaId,
  data,
  mode,
  onComplete,
  completedMessage = "Thank you. Your response has been submitted.",
  prefillData,
  prefillLabel = "Prefill demo data",
  pdfInNavigation = true,
  completeText,
  onModelReady,
}: {
  schema: SchemaInput;
  /**
   * When set, a survey definition saved in localStorage under this id replaces
   * `schema` on the client, and a completed form is submitted under it.
   */
  schemaId?: string;
  data?: SurveyData;
  mode?: SurveyMode;
  /**
   * Called instead of {@link submitResult} when the caller owns persistence
   * itself, as the records page does.
   */
  onComplete?: (data: SurveyData) => void;
  completedMessage?: string;
  prefillData?: SurveyData;
  prefillLabel?: string;
  /**
   * "Save as PDF" in the survey's own navigation bar, when the edition provides
   * a PDF export. The records page turns it off and keeps the form's navigation
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
  const { definition, swapping } = useSavedDefinition(schema, schemaId);

  // The two lines that are the actual integration.
  const model = useMemo(
    () => createSurveyModel(definition, { data, mode }),
    [definition, data, mode],
  );

  useEffect(() => {
    if (completeText) model.completeText = completeText;
  }, [completeText, model]);

  usePrefillAction(model, prefillData, prefillLabel);
  usePdfAction(model, schemaId, pdfInNavigation);
  const { completed, resume } = useSubmission(model, onComplete, schemaId);

  useEffect(() => {
    onModelReady?.(model);
  }, [model, onModelReady]);

  const editAgain = useCallback(() => {
    model.clear(false);
    resume();
  }, [model, resume]);

  if (completed) {
    return <FormCompleted message={completedMessage} onEdit={editAgain} />;
  }

  // The survey stays mounted while swapping — it has to, otherwise it never
  // renders and never reports that it is done. The spinner covers it instead.
  return (
    <div className="relative overflow-hidden border">
      <div className={swapping ? "invisible" : undefined}>
        <Survey model={model} />
      </div>
      {swapping && (
        <div
          className="bg-background absolute inset-0 flex min-h-96 items-center justify-center"
          role="status"
          aria-label="Loading..."
        >
          <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}
    </div>
  );
}

/** Minimum time the spinner stays on screen. */
const SPINNER_MIN_MS = 300;

/**
 * The definition to render: the one that ships, or this browser's edited copy.
 *
 * The server always renders `schema` itself — the prerendered HTML, the one
 * crawlers get, stays canonical — and a visitor who edited this form on
 * `/configure` gets their own version a tick later.
 *
 * The spinner only appears once the store has answered with a definition, so a
 * visitor who has none never sees a loading state. Against localStorage the
 * answer arrives in a microtask, before the browser paints; against a real
 * server the canonical form is briefly visible first, which is honest.
 */
function useSavedDefinition(
  schema: SchemaInput,
  schemaId?: string,
): { definition: SchemaInput; swapping: boolean } {
  const [saved, setSaved] = useState<SchemaInput | null>(null);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    // A different form starts from its own canonical definition again.
    setSaved(null);
    if (!schemaId) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void loadSurveyJson(schemaId).then((stored) => {
      if (!active || !stored) return;
      setSwapping(true);

      // Let the browser paint the spinner, then swap. The delay is a floor, not
      // the cost of the work: rebuilding the model and rendering the survey
      // measures about 30ms, so without it the spinner lives a single frame and
      // reads as a blink.
      timer = setTimeout(() => {
        setSaved(stored);
        setSwapping(false);
      }, SPINNER_MIN_MS);
    });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [schema, schemaId]);

  return { definition: saved ?? schema, swapping };
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
 * so the document is the form, filled in as far as it has been filled in.
 */
function usePdfAction(
  model: SurveyModel,
  schemaId: string | undefined,
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
        });
      },
    });

    return () => {
      model.navigationBar.removeActionById(id);
    };
  }, [enabled, model, schemaId]);
}

/**
 * What a completed form does with its answers.
 *
 * `onComplete` wins where the caller owns persistence — the records page writes
 * the record itself — and otherwise the answers go through the storage seam,
 * which is where a real app POSTs them. `resume` is the "Edit response" way back
 * from the thank-you screen.
 */
function useSubmission(
  model: SurveyModel,
  onComplete: ((data: SurveyData) => void) | undefined,
  schemaId: string | undefined,
): { completed: boolean; resume: () => void } {
  const [completed, setCompleted] = useState(false);

  // A rebuilt model is a fresh form: a saved definition arrived, or the records
  // page opened another record.
  useEffect(() => setCompleted(false), [model]);

  useEffect(() => {
    const handler = (sender: SurveyModel) => {
      setCompleted(true);
      if (onComplete) {
        onComplete(sender.data);
      } else if (schemaId) {
        void submitResult(schemaId, sender.data);
      }
    };

    model.onComplete.add(handler);
    return () => model.onComplete.remove(handler);
  }, [model, onComplete, schemaId]);

  const resume = useCallback(() => setCompleted(false), []);

  return { completed, resume };
}
