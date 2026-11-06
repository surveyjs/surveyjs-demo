// Ridgeline Family Health — Appointment Request Form: Save Responses (client)
// https://surveyjs.io/documentation/appointment-request#save-responses

// #region sjs:appointment-request.save-response.client
// As the patient answers. The page derives the summary panel from the data,
// and the host keeps the latest data for the PDF button.
function watchAnswers(survey, onDataChange) {
  const emit = (sender) => onDataChange({ ...sender.data });
  survey.onValueChanged.add(emit);
  survey.onMatrixCellValueChanged.add(emit);
  emit(survey);
}

// Request appointment completes the form, and Form Library shows completedHtml.
// To store the request, call your save endpoint here with sender.data.
survey.onComplete.add((sender) => {
  // Choice values are the same in both languages: { visitReason: "illness", location: "westbridge", … }
});
// #endregion
