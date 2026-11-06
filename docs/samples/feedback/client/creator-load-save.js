// Cadence — Customer Satisfaction Survey: Load and Save Form JSON Schemas (client)
// https://surveyjs.io/documentation/feedback#load-and-save-form-json-schemas

// #region sjs:feedback.creator-load-save.client
import { SurveyCreator } from "survey-creator-js";

const creator = new SurveyCreator({
  showJSONEditorTab: true,
  showLogicTab: true,
  showPreviewTab: true,
  showThemeTab: true,
  showTranslationTab: true,
  clearTranslationsOnSourceTextChange: true,
  isAutoSave: true,
  variablePresets: structuredClone(cadenceVariablePresets),
});
creator.autoSaveDelay = 1000;
creator.showErrorOnFailedSave = false;
creator.JSON = (await fetch("/api/storage/definitions/customer-satisfaction").then((r) => r.json())).json;
creator.getPlugin("preview").variablePresets.active = cadenceVariablePresets.presets[0].name;

creator.saveSurveyFunc = (saveNo, callback) => {
  fetch("/api/storage/definitions/customer-satisfaction", {
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
