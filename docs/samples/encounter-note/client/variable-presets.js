// Ridgeline Chart — Clinical Encounter Note: Variable Presets (client)
// https://surveyjs.io/documentation/encounter-note#variable-presets

// #region sjs:encounter-note.variable-presets.client
const creator = new SurveyCreator({
  ...options,
  variablePresets: structuredClone(patientVariablePresets),
});

// Creator's default is no preset. The first one is active on open,
// so Preview does not open with an empty chart.
creator.getPlugin("preview").variablePresets.active = patientVariablePresets.presets[0].name;
// #endregion
