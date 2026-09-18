"use client";

import { useEffect, useMemo } from "react";
import { Survey } from "survey-react-ui";
import type { Model } from "survey-core";
import { createSurveyModel, type SurveyData, type SurveyJSON } from "@/schemas";
import "@/lib/surveyjs-license";
import { mergeTailwindClasses } from "@/lib/utils";
import { SurveyOutlineLabel } from "@/components/survey-outline/SurveyOutline";

import "survey-core/survey-core.css";
import "survey-core/themes/adapters/shadcn-base-nova.css";
import "@/styles/survey-overrides-shadcn.css";
import "@/styles/survey-overrides-base-nova.css";

/**
 * The survey as a host site embeds it: no admin chrome, no page header, and no
 * wrapper of its own beyond the card the host page would have used anyway.
 *
 * All three demos render this same component. What differs between them is the
 * JSON they pass and the `variables` they pass with it — nothing in here knows
 * which site it is standing in.
 *
 * `onDataChange` is what lets a host page price itself from the answers as they
 * are given. It fires for plain answers, dynamic-panel edits and matrix cells,
 * and once on mount so a prefilled model does not look empty to the page.
 */
export function EmbeddedSurvey({
  json,
  data,
  variables,
  locale,
  onDataChange,
  onComplete,
}: {
  json: SurveyJSON;
  /** Prefilled answers. A new object remounts the model, which "Reset" wants. */
  data?: SurveyData;
  /**
   * What the host app already knows about the visitor. The definition reads it
   * with `{name}`, so the same JSON renders differently per user — see
   * `demo-accounts.ts`.
   */
  variables?: Readonly<Record<string, unknown>>;
  /**
   * The language the definition renders in, for a form whose strings carry
   * translations. It goes to the factory, so the HTML the **server** sends is
   * already in that language, and it is kept in step below without rebuilding.
   */
  locale?: string;
  onDataChange?: (data: SurveyData) => void;
  onComplete?: (data: SurveyData) => void;
}) {
  const model = useMemo(
    () => createSurveyModel(json, { data, variables, locale }),
    // `locale` is deliberately not a dependency: rebuilding the model would
    // throw the answers away, and changing language mid-form must not cost a
    // word. The effect below moves the live model instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [json, data, variables],
  );

  useEffect(() => {
    if (locale && model.locale !== locale) model.locale = locale;
  }, [model, locale]);

  useEffect(() => {
    if (!onDataChange) return;
    const emit = (sender: Model) => onDataChange({ ...sender.data });

    // One handler, five events: survey-core reports a dynamic panel's rows and a
    // matrix's cells through their own events, not through onValueChanged, and a
    // quote that ignored them would sit stale while the visitor typed.
    const onValue = (sender: Model) => emit(sender);
    model.onValueChanged.add(onValue);
    model.onDynamicPanelValueChanged.add(onValue);
    model.onDynamicPanelAdded.add(onValue);
    model.onDynamicPanelRemoved.add(onValue);
    model.onMatrixCellValueChanged.add(onValue);
    emit(model);

    return () => {
      model.onValueChanged.remove(onValue);
      model.onDynamicPanelValueChanged.remove(onValue);
      model.onDynamicPanelAdded.remove(onValue);
      model.onDynamicPanelRemoved.remove(onValue);
      model.onMatrixCellValueChanged.remove(onValue);
    };
  }, [model, onDataChange]);

  useEffect(() => {
    if (!onComplete) return;
    const handler = (sender: Model) => onComplete({ ...sender.data });
    model.onComplete.add(handler);
    return () => model.onComplete.remove(handler);
  }, [model, onComplete]);

  return <Survey model={model} />;
}

/**
 * The container a host page puts a form in — a plain shadcn card.
 *
 * `data-survey-root` marks the boundary of what SurveyJS draws, which is what the
 * always-on outline is keyed off. Nothing else on these pages carries the
 * attribute: everything outside it is the mock site's own markup.
 *
 * The corner label is part of that outline and part of the argument: it says
 * which element the library drew, and pressing it takes the whole ring away, so
 * the page can be looked at as a visitor would see it without hunting for a
 * control in the toolbar. Both it and the ring are styled in `globals.css`,
 * keyed off the attribute an embedded demo sets on `<html>`; the label and that
 * attribute are shared with the records pages, in `survey-outline/`.
 */
export function SurveyCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-survey-root=""
      className={mergeTailwindClasses(
        "bg-card relative overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      <SurveyOutlineLabel />
      {children}
    </div>
  );
}
