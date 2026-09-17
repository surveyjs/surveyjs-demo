"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  RotateCcwIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import type { ICreatorOptions, TabTestPlugin } from "survey-creator-core";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { loadSurveyJson, resetSurveyJson, saveSurveyJson } from "@/storage/survey-json";
import { useStorageAccess } from "@/components/StorageAccess";
import { getVariablePresets, type SurveyJSON } from "@/schemas";
import type { FormEntry } from "./forms";

import "@/lib/surveyjs-license";
// Registers `aiHint` before the Creator is built, so the property grid edits it
// under Description and a saved definition keeps it. `@/schemas` above happens
// to load it too; this import says so rather than relying on that.
import "@/schemas/custom-properties";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";
import "survey-core/themes/adapters/shadcn-base-nova.css";
import "@/styles/survey-overrides-shadcn.css";
import "@/styles/survey-overrides-base-nova.css";

/**
 * The tabs a form designer actually needs, and nothing that would need a server:
 * Designer, the JSON document itself, the logic overview, a live preview and the
 * theme editor. Translation is off — these demos ship in one language.
 *
 * `isAutoSave` is what makes the Creator call `saveSurveyFunc` as edits happen,
 * so there is no Save button to forget. Each save is a request to the server, so
 * the Creator's own throttle is raised to a second (`autoSaveDelay`, set on the
 * instance below); `saveSurveyJson` does no debouncing of its own.
 */
const CREATOR_OPTIONS: ICreatorOptions = {
  showJSONEditorTab: true,
  showLogicTab: true,
  showPreviewTab: true,
  showThemeTab: true,
  showTranslationTab: false,
  isAutoSave: true,
};

/**
 * Survey Creator, opened on one form.
 *
 * This is the commercial half of the story the whole template tells: the same
 * definitions the pages render are edited here in the visual designer, and what
 * is saved is what those pages then render — the round trip a buyer is asking
 * about. Everything the previous JSON-editor page did by hand (a Monaco pane, a
 * linter bar, a live preview beside it) is a tab in here.
 *
 * Edits are saved to each visitor's own sandbox on the server (see
 * `survey-json.ts`), so the URL is safe to hand around: what a visitor changes is
 * theirs alone, every page renders it for them, and everybody else keeps getting
 * the definition that ships. The route does not lint an autosave: a half-typed
 * expression would fail every one of them. In a browser that blocks the storage
 * cookie nothing can be saved, so the designer is read-only there and says why.
 *
 * A personalized form reads `{user_…}` variables that nothing in its JSON
 * declares. The Creator gets the form's variable presets (`getVariablePresets`)
 * as its `variablePresets` option, the same object the linter and the MIT
 * edition's preview read: the condition editor lists the variables with a value
 * editor for each, and the Preview tab has a preset selector and a structured
 * preset editor. Presets edited there live for this Creator session only; they
 * are not stored.
 */
export default function CreatorPane({ form }: { form: FormEntry }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [storageError, setStorageError] = useState<string | null>(null);
  const { readOnly, message: readOnlyMessage } = useStorageAccess();

  // Built once per form. The Creator owns its state from here on: it is the
  // editor, and rebuilding it on a prop change would throw away the tab, the
  // selection and the undo history.
  const creator = useMemo(() => {
    // Cloned: the Creator's preset editor writes the edited list into this object
    // in place, and the registry's object is a module singleton every page shares.
    const presets = getVariablePresets(form.id);
    const instance = new SurveyCreator(
      presets ? { ...CREATOR_OPTIONS, variablePresets: structuredClone(presets) } : CREATOR_OPTIONS,
    );
    instance.autoSaveDelay = 1000;
    instance.JSON = form.json;

    // The callback is what tells the Creator the save went through, so it waits
    // for the storage call — with a real endpoint behind it, a failed request
    // reports back instead of being swallowed.
    instance.saveSurveyFunc = (
      saveNo: number,
      callback: (no: number, isSuccess: boolean) => void,
    ) => {
      saveSurveyJson(form.id, instance.JSON as SurveyJSON).then(
        () => {
          setStorageError(null);
          callback(saveNo, true);
        },
        (failure: Error) => {
          setStorageError(failure.message);
          callback(saveNo, false);
        },
      );
    };

    // `aiHint` is registered with `nextToProperty: "description"`, but Survey
    // Creator 3.0.4 does not move a property up next to an anchor in the same
    // tab (`movePropertiesToAdjacentPositions` removes the copy it has just
    // inserted), so the hint lands at the end of General. Put it under
    // Description in the property grid itself, until Creator does.
    instance.onSurveyInstanceCreated.add((_, options) => {
      if (options.area !== "property-grid") return;
      const hint = options.survey.getQuestionByName("aiHint");
      const description = options.survey.getQuestionByName("description");
      const panel = hint?.parent;
      if (!hint || !description || !panel || description.parent !== panel) return;
      panel.removeElement(hint);
      panel.addElement(hint, panel.elements.indexOf(description) + 1);
    });

    // The Creator's own default is no preset, and a form that works with no
    // variables is worth testing. A reviewer arriving here should not meet "Hi
    // {user_firstName}", though, so Preview opens on the first preset; "No
    // variables" is one click away in its selector.
    const first = presets?.presets?.[0]?.name;
    if (first) {
      instance.getPlugin<TabTestPlugin>("preview").variablePresets.active = first;
    }

    return instance;
  }, [form]);

  // The Creator has no light/dark switch of its own that the app could read, so
  // the app tells it which palette to draw in. The shadcn tokens the adapter
  // consumes live on <html>, and this page renders inside it, so the chrome and
  // the form follow the header toggle together.
  useEffect(() => {
    creator.preferredColorPalette = resolvedTheme === "dark" ? "dark" : "light";
  }, [creator, resolvedTheme]);

  // No cookie, no sandbox: the designer shows the form but edits nothing. Only
  // ever switched on: the handshake answers once, and assigning `readOnly` at all
  // re-renders the designer.
  useEffect(() => {
    if (readOnly) creator.readOnly = true;
  }, [creator, readOnly]);

  // This visitor's stored definition, so the designer never opens on the shipped
  // JSON for somebody who has their own. A visitor with no edits gets the shipped
  // one back, which is not applied: setting `JSON` rebuilds the whole designer.
  // A failed load keeps the shipped JSON and says why.
  useEffect(() => {
    let active = true;
    loadSurveyJson(form.id).then(
      (saved) => {
        if (active && saved && JSON.stringify(saved) !== JSON.stringify(form.json)) {
          creator.JSON = saved;
        }
      },
      (failure: unknown) => {
        if (active) setStorageError((failure as Error).message);
      },
    );
    return () => {
      active = false;
    };
  }, [creator, form.id, form.json]);

  const reset = useCallback(async () => {
    try {
      await resetSurveyJson(form.id);
    } catch (failure) {
      // The designer stays as it was.
      setStorageError((failure as Error).message);
      return;
    }
    creator.JSON = form.json;
    setStorageError(null);
  }, [creator, form.id, form.json]);

  // Save, then go where the form actually lives. For the embedded demos that is
  // somebody else's website, which is the reason to press it.
  const saveAndOpen = useCallback(async () => {
    try {
      await saveSurveyJson(form.id, creator.JSON as SurveyJSON);
    } catch (failure) {
      setStorageError((failure as Error).message);
      return;
    }
    setStorageError(null);
    router.push(form.href);
  }, [creator, form.href, form.id, router]);

  // Which preset the Preview tab runs with, kept honest by the Creator's own
  // event: the selector there and the preset editor both change it.
  const [previewPreset, setPreviewPreset] = useState<string>(
    () => creator.getPlugin<TabTestPlugin>("preview").variablePresets.active,
  );
  useEffect(() => {
    const onChanged = (_: unknown, options: { active: string }) => setPreviewPreset(options.active);
    creator.onVariablePresetsChanged.add(onChanged);
    return () => creator.onVariablePresetsChanged.remove(onChanged);
  }, [creator]);
  const hasPresets = Boolean(getVariablePresets(form.id));

  return (
    <div className="bg-background text-foreground flex h-svh min-h-svh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {form.label} — form designer
          </h1>
          <p className="text-muted-foreground truncate text-xs">
            Saved as you edit, to your own sandbox on this server
            {hasPresets
              ? previewPreset
                ? `. Previewing as ${previewPreset}`
                : ". Previewing with no variables"
              : ""}
            .
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <a href={form.href}>
              <ArrowLeftIcon />
              <span className="hidden sm:inline">Back</span>
            </a>
          </Button>
          <ThemeSwitcher />
          <Button variant="outline" size="sm" className="gap-2" disabled={readOnly} onClick={reset}>
            <RotateCcwIcon />
            Reset
          </Button>
          <Button size="sm" className="gap-2" disabled={readOnly} onClick={saveAndOpen}>
            {form.embedded ? <SquareArrowOutUpRightIcon /> : <CheckIcon />}
            {form.previewLabel}
          </Button>
        </div>
      </header>

      {(storageError || readOnly) && (
        <p className="border-destructive/50 text-destructive shrink-0 border-b px-4 py-2 text-sm sm:px-6">
          {storageError ?? readOnlyMessage}
        </p>
      )}

      <div className="min-h-0 flex-1">
        <SurveyCreatorComponent creator={creator} />
      </div>
    </div>
  );
}
