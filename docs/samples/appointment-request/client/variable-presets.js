// Ridgeline Family Health — Appointment Request Form: Variable Presets (client)
// https://surveyjs.io/documentation/appointment-request#variable-presets

// #region sjs:appointment-request.variable-presets.client
const creator = new SurveyCreator({
  ...options,
  variablePresets: structuredClone(patientVariablePresets),
});

// Creator's default is no preset. The first one is active on open,
// so Preview does not open with an empty record.
creator.getPlugin("preview").variablePresets.active = patientVariablePresets.presets[0].name;
// #endregion
