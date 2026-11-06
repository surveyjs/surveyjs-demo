// Larkspur CRM — CRM Opportunity Records: Variable Presets (client)
// https://surveyjs.io/documentation/crm-opportunity-records#variable-presets

// #region sjs:crm.variable-presets.client
const creator = new SurveyCreator({
  ...options,
  variablePresets: structuredClone(leadsVariablePresets),
});

// Creator's default is no preset. The first one is active on open,
// so Preview does not open with an empty name.
creator.getPlugin("preview").variablePresets.active = leadsVariablePresets.presets[0].name;
// #endregion
