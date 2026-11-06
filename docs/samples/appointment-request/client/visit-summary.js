// Ridgeline Family Health — Appointment Request Form: The page reads the form (client)
// https://surveyjs.io/documentation/appointment-request#the-page-reads-the-form

// #region sjs:appointment-request.visit-summary.client
// The page is downstream of the form: the panel re-renders on every answer.
survey.onValueChanged.add((sender) => {
  const summary = visitSummaryFor(sender.data, locale);
  // → { reason, location, provider, estimate, estimateLabel, whenText, referralNeeded, whatToBring }
  renderSummaryPanel(summary);
});
// #endregion
