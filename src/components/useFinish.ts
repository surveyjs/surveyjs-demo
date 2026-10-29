import { useEffect } from "react";
import type { CompletingEvent, Model as SurveyModel } from "survey-core";
import type { FinishMode, SurveyData } from "@/schemas";

/**
 * What finishing a form does, by the page's `finish` (`src/schemas/navigation.ts`).
 * Every survey in this application that can be finished goes through here.
 *
 * - `"complete"` — `onComplete`. The survey completes, SurveyJS shows the
 *   definition's `completedHtml`, and `onFinish` gets the answers.
 * - `"save"` — `onCompleting`, with `allow = false`. survey-core fires it once
 *   the last page has validated and before it would complete, so `onFinish` gets
 *   valid answers and the form stays on screen with them, saved or not.
 *
 * `onFinish` may return a promise. In `"save"` mode it is awaited inside the
 * handler: `onCompleting` is an async event in survey-core 3, and while a
 * handler's promise is pending the survey's navigation is blocked, so Complete
 * cannot be pressed twice during a save.
 */
export function useFinish(
  model: SurveyModel,
  finish: FinishMode,
  onFinish: ((data: SurveyData) => unknown) | undefined,
): void {
  useEffect(() => {
    if (finish === "save") {
      // Registered even with nothing to call, so a "save" survey can never
      // complete by accident.
      const saving = async (sender: SurveyModel, options: CompletingEvent) => {
        options.allow = false;
        // Never rejects: survey-core waits for the handlers with
        // `Promise.all(...).then` and no rejection branch, so a rejected promise
        // would leave the navigation blocked for good. Showing a failure is the
        // caller's job; one it did not catch is logged here.
        try {
          await onFinish?.({ ...sender.data });
        } catch (failure) {
          console.error("[finish] the save failed", failure);
        }
      };
      model.onCompleting.add(saving);
      return () => model.onCompleting.remove(saving);
    }

    if (!onFinish) return;
    const completed = (sender: SurveyModel) => {
      void onFinish({ ...sender.data });
    };
    model.onComplete.add(completed);
    return () => model.onComplete.remove(completed);
  }, [model, finish, onFinish]);
}
