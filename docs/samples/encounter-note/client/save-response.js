// Ridgeline Chart — Clinical Encounter Note: Save Responses (client)
// https://surveyjs.io/documentation/encounter-note#save-responses

// #region sjs:encounter-note.save-response.client
// As the clinician types. The host keeps the latest data for the PDF button.
// Matrix cells have their own event, so both events are handled.
function watchAnswers(survey, onDataChange) {
  const emit = (sender) => onDataChange({ ...sender.data });
  survey.onValueChanged.add(emit);
  survey.onMatrixCellValueChanged.add(emit);
  emit(survey);
}

// Sign and file completes the note, and Form Library shows completedHtml.
// To store the note, call your save endpoint here with sender.data.
survey.onComplete.add((sender) => {
  // sender.data includes chartProblemCount, noteMme, and openOrderCount.
});
// #endregion
