export const APPOINTMENT_COPY = {
  dock: {
    usersLabel: "View as",
    usersTitle: "View as Another Patient",
    editLabel: "Edit Patient Details",
    editTitle: "Edit Patient Details",
  },
  dialog: {
    showEditorTitle: false,
    editorNote: "This editor is also a SurveyJS form.",
    title: "Patient details",
    description:
      "Change patient details to see how the appointment form updates.",
  },
  descriptions: {
    "Maria Delgado": "Saved details · Prescription refills",
    "Daniel Okafor": "Medicare · Different visit costs and referral requirements",
    "Priya Raman": "New patient · Additional registration questions",
  },
} as const;

export const ENCOUNTER_NOTE_COPY = {
  dock: {
    usersLabel: "Select Patient",
    usersTitle: "Select Patient",
    editLabel: "Edit Patient Details",
    editTitle: "Edit Patient Details",
  },
  dialog: {
    showEditorTitle: false,
    editorNote: "This editor is also a SurveyJS form.",
    title: "Patient details",
    description:
      "Change patient details to see how the encounter note updates.",
  },
  descriptions: {
    "Maria Delgado": "Interpreter needed · Existing diagnoses and medications",
    "Daniel Okafor": "Former smoker · Tobacco counselling question",
    "Priya Raman": "New patient · Additional first-visit page",
  },
} as const;
