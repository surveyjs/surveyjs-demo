// Ridgeline Family Health — Appointment Request Form: Rendered in the patient's language (client)
// https://surveyjs.io/documentation/appointment-request#rendered-in-the-patients-language

// #region sjs:appointment-request.locale.client
// The record decides. The demo translates one language, so everything else is English.
function chartLocale(preferredLanguage) {
  return preferredLanguage === "es" ? "es" : "en";
}

// A later change of the switch sets the locale on the existing model.
// The model is kept; Form Library re-renders the texts in the new language.
survey.locale = "es";
// #endregion
