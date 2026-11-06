// Ridgeline Chart — Clinical Encounter Note: Load and Save Form JSON Schemas (client)
// https://surveyjs.io/documentation/encounter-note#load-and-save-form-json-schemas

// #region sjs:encounter-note.creator-load-save.client
import { SurveyCreator } from "survey-creator-js";

const creator = new SurveyCreator({
  showJSONEditorTab: true,
  showLogicTab: true,
  showPreviewTab: true,
  showThemeTab: true,
  showTranslationTab: true,
  clearTranslationsOnSourceTextChange: true,
  isAutoSave: true,
  variablePresets: structuredClone(patientVariablePresets),
});
creator.autoSaveDelay = 1000;
creator.showErrorOnFailedSave = false;
creator.JSON = (await fetch("/api/storage/definitions/encounter-note").then((r) => r.json())).json;
creator.getPlugin("preview").variablePresets.active = patientVariablePresets.presets[0].name;

creator.saveSurveyFunc = (saveNo, callback) => {
  fetch("/api/storage/definitions/encounter-note", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: creator.JSON }),
  }).then(async (res) => {
    if (res.ok) {
      callback(saveNo, true);
      return;
    }
    callback(saveNo, false);                 // back to "modified" before the toast
    creator.notify((await res.json()).error, "error");
  });
};
// #endregion
