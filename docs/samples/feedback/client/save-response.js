// Cadence — Customer Satisfaction Survey: Save Responses (client)
// https://surveyjs.io/documentation/feedback#save-responses

// #region sjs:feedback.save-response.client
// As the person answers. The host keeps the latest data for the PDF button.
// Matrix cells have their own event, so both events are handled.
function watchAnswers(survey, onDataChange) {
  const emit = (sender) => onDataChange({ ...sender.data });
  survey.onValueChanged.add(emit);
  survey.onMatrixCellValueChanged.add(emit);
  emit(survey);
}

// Send feedback completes the survey, and Form Library shows completedHtml.
// To store the feedback, call your save endpoint here with sender.data.
survey.onComplete.add((sender) => {
  // The answers stay in the page.
});
// #endregion
