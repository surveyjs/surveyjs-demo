// Cadence — Customer Satisfaction Survey: Variable Presets (client)
// https://surveyjs.io/documentation/feedback#variable-presets

// #region sjs:feedback.variable-presets.client
const creator = new SurveyCreator({
  ...options,
  variablePresets: structuredClone(cadenceVariablePresets),
});

// Creator's default is no preset. The first one is active on open,
// so Preview does not open with an empty name.
creator.getPlugin("preview").variablePresets.active = cadenceVariablePresets.presets[0].name;
// #endregion
