import {
  CHART_CONDITIONS,
  CHART_MEDICATIONS,
  CLINIC_LOCATIONS,
  PROVIDERS,
  VISIT_REASONS,
} from "./clinic-info";
import type { SchemaDefinition, SurveyJSON } from "./types";

/**
 * "Encounter note" — the form a clinician fills in with the patient in the room.
 *
 * The other clinic demo is the patient-facing side: a short public request form
 * that a portal pre-answers. This is the staff side of the same practice, and it
 * exists to answer the one objection a serious buyer raises — *fine, but our real
 * forms are nothing like that.* So this one is deliberately heavy, and every
 * heavy part of it is survey-core doing the work rather than a host page:
 *
 *  - **structure**: eight pages with a table of contents, a review step before
 *    anything is filed, and a page that only exists for a patient who has never
 *    been seen here;
 *  - **repeating data**: dynamic matrices with expandable detail rows (the
 *    problem list, the medication list), total rows (medications), and a dynamic
 *    panel rendered as tabs with its own file upload per surgery;
 *  - **calculation**: BMI, mean arterial pressure, an average of every blood
 *    pressure taken today, total daily dose and morphine-milligram equivalents,
 *    a depression screener scored from matrix cells, and a cardiovascular risk
 *    band assembled from all of it — all in `expression` questions and
 *    `calculatedValues`, none of it in React;
 *  - **logic**: `visibleIf`, `enableIf`, `requiredIf`, `resetValueIf`,
 *    `rowsVisibleIf` (the focused exam grows rows for the systems flagged
 *    abnormal), choice-level `visibleIf`, carry-forward choices
 *    (`choicesFromQuestion`), unique-value detection, expression validators, and
 *    three survey triggers;
 *  - **capture**: file upload, camera capture and a signature pad for the
 *    attestation.
 *
 * And it is still rendered *for a person*: the chart is published to the survey
 * as `{user.…}` (see `demo-accounts.ts`), so the banner, the age, the site, the
 * clinician, the problem list, the medication list, the allergies, the tobacco
 * counselling prompt and the whole new-patient page come out of the record of
 * whichever patient is open. Switch patients in the toolbar and the note is a
 * different document.
 *
 * Everything a reviewer sees here is this JSON. The page around it is a header
 * bar and nothing else.
 */

const providerChoices = PROVIDERS.map((provider) => ({
  value: provider.id,
  text: `${provider.name}, ${provider.credential} — ${provider.specialty}`,
}));

const siteChoices = CLINIC_LOCATIONS.map((location) => ({
  value: location.id,
  text: `${location.name} — ${location.address1}, ${location.city}`,
}));

const complaintChoices = VISIT_REASONS.map((reason) => ({
  value: reason.id,
  text: reason.label,
}));

const conditionChoices = CHART_CONDITIONS.map((condition) => ({
  value: condition.id,
  text: condition.label,
}));

/**
 * The chart's own conditions first, and only for the patient who has them.
 *
 * The choice-level `visibleIf` is the interesting half: the same definition
 * offers Maria her asthma and her blood pressure, offers Daniel his diabetes,
 * and offers a brand-new patient nothing at all — without a second form.
 */
const chartConditionChoices = CHART_CONDITIONS.map((condition) => ({
  value: condition.id,
  text: condition.label,
  visibleIf: `{user.conditions} contains '${condition.id}'`,
}));

const chartMedicationChoices = CHART_MEDICATIONS.map((medication) => ({
  value: medication.id,
  text: medication.label,
  visibleIf: `{user.medications} contains '${medication.id}'`,
}));

const drugChoices = [
  ...CHART_MEDICATIONS.map((medication) => ({
    value: medication.id,
    text: medication.label,
  })),
  { value: "hydrocodone", text: "Hydrocodone / acetaminophen" },
  { value: "oxycodone", text: "Oxycodone" },
  { value: "tramadol", text: "Tramadol" },
  { value: "prednisone", text: "Prednisone" },
  { value: "amoxicillin", text: "Amoxicillin" },
];

/** Systems, used three times over: the screen, the exam rows and the summary. */
const ROS_SYSTEMS = [
  { value: "constitutional", text: "Constitutional" },
  { value: "eyes", text: "Eyes" },
  { value: "ent", text: "Ear, nose and throat" },
  { value: "cardiovascular", text: "Cardiovascular" },
  { value: "respiratory", text: "Respiratory" },
  { value: "gastrointestinal", text: "Gastrointestinal" },
  { value: "genitourinary", text: "Genitourinary" },
  { value: "musculoskeletal", text: "Musculoskeletal" },
  { value: "skin", text: "Skin" },
  { value: "neurological", text: "Neurological" },
  { value: "psychiatric", text: "Psychiatric" },
  { value: "endocrine", text: "Endocrine" },
];

const FAMILY_CONDITIONS = [
  { value: "heart", text: "Heart disease" },
  { value: "stroke", text: "Stroke" },
  { value: "diabetesFamily", text: "Diabetes" },
  { value: "cancer", text: "Cancer" },
  { value: "mentalHealth", text: "Depression or anxiety" },
];

const IMMUNIZATIONS = [
  { value: "influenza", text: "Influenza" },
  { value: "tdap", text: "Tdap" },
  { value: "mmr", text: "MMR" },
  { value: "covid", text: "COVID-19" },
  { value: "pneumococcal", text: "Pneumococcal" },
];

export const encounterNoteJson: SurveyJSON = {
  title: "Encounter note — {user.lastName}, {user.firstName}",
  description: "MRN {user.mrn} · last seen {user.lastVisit}",
  widthMode: "responsive",
  showQuestionNumbers: "off",
  questionErrorLocation: "bottom",
  checkErrorsMode: "onValueChanged",
  clearInvisibleValues: "onHiddenContainer",
  textUpdateMode: "onTyping",
  autoGrowComment: true,

  // The chart is long, so the note is navigable rather than linear: a table of
  // contents down the side, and a review of everything entered before it is
  // signed.
  showTOC: true,
  tocLocation: "left",
  showPreviewBeforeComplete: true,
  previewMode: "answeredQuestions",
  previewText: "Review the note",
  completeText: "Sign and file",
  completedHtml:
    "<h4>Note filed for {user.firstName} {user.lastName}</h4><p>Assessment recorded, orders queued and the visit summary is on its way to the portal. Follow-up in {followUpWeeks} weeks.</p>",

  /**
   * Values the note carries but nobody types.
   *
   * `includeIntoResult` puts them in the submitted data, so the numbers a
   * downstream system needs — the medication burden, the count of problems
   * addressed — arrive with the note instead of being recomputed from it.
   */
  calculatedValues: [
    {
      name: "chartProblemCount",
      expression: "count({chartProblems})",
      includeIntoResult: true,
    },
    {
      name: "noteMme",
      expression: "round(sumInArray({medications}, 'dailyMme'), 0)",
      includeIntoResult: true,
    },
    {
      name: "openOrderCount",
      expression: "countInArray({orders}, 'orderItem')",
      includeIntoResult: true,
    },
  ],

  /**
   * Three triggers, each the kind a clinic actually asks for: escalate a visit
   * that reports a red flag, shorten the follow-up interval when the pressure is
   * high, and require the pain-clinic referral once the opioid total crosses the
   * CDC threshold.
   */
  triggers: [
    {
      type: "setvalue",
      expression: "{redFlags} notempty and {redFlags} notcontains 'none'",
      setToName: "escalateToday",
      setValue: true,
    },
    {
      type: "runexpression",
      expression: "{avgSystolic} >= 140 or {avgDiastolic} >= 90",
      setToName: "followUpWeeks",
      runExpression: "2",
    },
    {
      type: "setvalue",
      expression: "{totalMme} >= 90",
      setToName: "painClinicReferral",
      setValue: true,
    },
  ],

  pages: [
    /* ── 1 · the visit ─────────────────────────────────────────────────────── */
    {
      name: "encounterPage",
      title: "Encounter",
      navigationDescription: "Who, where, why",
      elements: [
        {
          type: "html",
          name: "patientBanner",
          html: "<div class=\"demo-note-banner\"><strong>{user.firstName} {user.lastName}</strong> · MRN {user.mrn} · born {user.dateOfBirth}<br>Plan on file: {user.healthPlanLabel} · preferred language: {user.languageLabel}</div>",
        },
        {
          type: "expression",
          name: "patientAge",
          title: "Age",
          titleLocation: "left",
          expression: "age({user.dateOfBirth})",
        },
        {
          type: "dropdown",
          name: "encounterType",
          title: "Encounter type",
          isRequired: true,
          choices: [
            { value: "office", text: "Office visit" },
            { value: "telehealth", text: "Telehealth" },
            { value: "wellness", text: "Annual wellness visit" },
            { value: "postOp", text: "Post-operative follow-up" },
            { value: "urgent", text: "Urgent, same-day" },
          ],
        },
        {
          type: "text",
          name: "encounterDate",
          title: "Date of service",
          inputType: "date",
          isRequired: true,
          startWithNewLine: false,
          defaultValueExpression: "today()",
          maxValueExpression: "today()",
        },
        {
          type: "dropdown",
          name: "renderingProvider",
          title: "Seen by",
          isRequired: true,
          choices: providerChoices,
          // The chart's own clinician, already chosen.
          defaultValueExpression: "{user.primaryProvider}",
        },
        {
          type: "dropdown",
          name: "encounterSite",
          title: "Location",
          startWithNewLine: false,
          choices: siteChoices,
          defaultValueExpression: "{user.homeLocation}",
        },
        {
          type: "boolean",
          name: "interpreterPresent",
          title: "Interpreter present for this visit",
          description:
            "The chart records {user.languageLabel} as {user.firstName}'s preferred language.",
          // The question does not exist for a patient who does not need one.
          visibleIf: "{user.needsInterpreter} = true",
          defaultValueExpression: "true",
        },
        {
          type: "dropdown",
          name: "chiefComplaint",
          title: "Chief complaint",
          isRequired: true,
          showOtherItem: true,
          otherText: "Something else — describe it",
          choices: complaintChoices,
        },
        {
          type: "comment",
          name: "hpi",
          title: "History of present illness",
          description: "Onset, duration, character, what makes it better or worse.",
          isRequired: true,
          rows: 4,
        },
        {
          type: "text",
          name: "symptomOnset",
          title: "Symptoms started",
          inputType: "date",
          maxValueExpression: "today()",
        },
        {
          type: "expression",
          name: "symptomDays",
          title: "Days of symptoms",
          titleLocation: "left",
          startWithNewLine: false,
          visibleIf: "{symptomOnset} notempty",
          expression: "diffDays({symptomOnset}, today())",
        },
        {
          type: "slider",
          name: "painNow",
          title: "Pain right now",
          min: 0,
          max: 10,
          step: 1,
          allowClear: true,
          customLabels: [
            { value: 0, text: "None" },
            { value: 5, text: "Moderate" },
            { value: 10, text: "Worst" },
          ],
        },
        {
          type: "checkbox",
          name: "redFlags",
          title: "Red flags reported",
          colCount: 2,
          choices: [
            { value: "chestPain", text: "Chest pain or pressure" },
            { value: "dyspnea", text: "Shortness of breath at rest" },
            { value: "syncope", text: "Fainting" },
            { value: "focalDeficit", text: "New weakness or numbness" },
            { value: "suicidalIdeation", text: "Thoughts of self-harm" },
            {
              value: "none",
              text: "None reported",
              // Selecting it clears the rest — one property, no handler.
              isExclusive: true,
            },
          ],
        },
        {
          type: "boolean",
          name: "escalateToday",
          title: "Escalate to same-day evaluation",
          description: "Set by the note itself when a red flag is recorded.",
          visibleIf: "{redFlags} notempty and {redFlags} notcontains 'none'",
        },
        {
          type: "boolean",
          name: "telehealthConsent",
          title: "Verbal consent for telehealth obtained",
          visibleIf: "{encounterType} = 'telehealth'",
          requiredIf: "{encounterType} = 'telehealth'",
        },
      ],
    },

    /* ── 2 · vitals ────────────────────────────────────────────────────────── */
    {
      name: "vitalsPage",
      title: "Vitals",
      navigationDescription: "Measurements taken today",
      elements: [
        {
          type: "text",
          name: "heightIn",
          title: "Height (in)",
          inputType: "number",
          min: "24",
          max: "90",
        },
        {
          type: "text",
          name: "weightLb",
          title: "Weight (lb)",
          inputType: "number",
          min: "40",
          max: "700",
          startWithNewLine: false,
        },
        {
          type: "expression",
          name: "bmi",
          title: "BMI",
          titleLocation: "left",
          startWithNewLine: false,
          visibleIf: "{heightIn} notempty and {weightLb} notempty",
          expression: "round({weightLb} * 703 / ({heightIn} * {heightIn}), 1)",
          displayStyle: "decimal",
        },
        {
          type: "expression",
          name: "bmiClass",
          title: "Class",
          titleLocation: "left",
          startWithNewLine: false,
          visibleIf: "{bmi} notempty",
          expression:
            "iif({bmi} < 18.5, 'Underweight', iif({bmi} < 25, 'Normal', iif({bmi} < 30, 'Overweight', iif({bmi} < 35, 'Obesity I', 'Obesity II+'))))",
        },
        {
          type: "matrixdynamic",
          name: "bpReadings",
          title: "Blood pressure",
          description:
            "Every reading taken during the visit. The mean arterial pressure and the averages below are calculated by the form.",
          addRowText: "Add a reading",
          removeRowText: "Remove",
          rowCount: 1,
          minRowCount: 1,
          maxRowCount: 6,
          confirmDelete: true,
          detailPanelMode: "underRowSingle",
          columns: [
            {
              name: "bpPosition",
              title: "Position",
              cellType: "dropdown",
              choices: [
                { value: "sitting", text: "Sitting" },
                { value: "standing", text: "Standing" },
                { value: "supine", text: "Supine" },
              ],
              defaultValue: "sitting",
            },
            {
              name: "sysBp",
              title: "Systolic",
              cellType: "text",
              inputType: "number",
              isRequired: true,
              totalType: "avg",
              totalFormat: "Mean {0}",
            },
            {
              name: "diaBp",
              title: "Diastolic",
              cellType: "text",
              inputType: "number",
              isRequired: true,
              totalType: "avg",
              totalFormat: "Mean {0}",
              validators: [
                {
                  type: "expression",
                  text: "Diastolic must be lower than systolic.",
                  expression: "{row.diaBp} < {row.sysBp}",
                },
              ],
            },
            {
              name: "pulseBpm",
              title: "Pulse",
              cellType: "text",
              inputType: "number",
              totalType: "avg",
              totalFormat: "Mean {0}",
            },
            {
              name: "mapValue",
              title: "MAP",
              cellType: "expression",
              expression: "round(({row.diaBp} * 2 + {row.sysBp}) / 3, 0)",
            },
          ],
          detailElements: [
            {
              type: "dropdown",
              name: "cuffSize",
              title: "Cuff",
              choices: [
                { value: "standard", text: "Standard adult" },
                { value: "large", text: "Large adult" },
                { value: "thigh", text: "Thigh" },
              ],
            },
            {
              type: "comment",
              name: "readingNote",
              title: "Note",
              startWithNewLine: false,
            },
          ],
        },
        {
          type: "expression",
          name: "avgSystolic",
          title: "Average systolic",
          titleLocation: "left",
          expression: "round(avgInArray({bpReadings}, 'sysBp'), 0)",
        },
        {
          type: "expression",
          name: "avgDiastolic",
          title: "Average diastolic",
          titleLocation: "left",
          startWithNewLine: false,
          expression: "round(avgInArray({bpReadings}, 'diaBp'), 0)",
        },
        {
          type: "html",
          name: "bpStage2",
          visibleIf: "{avgSystolic} >= 140 or {avgDiastolic} >= 90",
          html: "<div class=\"demo-note-alert\">Stage 2 hypertension by today's average. The follow-up interval below has been shortened to two weeks by a survey trigger.</div>",
        },
        {
          type: "html",
          name: "bpElevated",
          visibleIf: "{avgSystolic} >= 130 and {avgSystolic} < 140",
          html: "<div class=\"demo-note-note\">Stage 1 by today's average — repeat at the next visit.</div>",
        },
        {
          type: "text",
          name: "temperatureF",
          title: "Temp (°F)",
          inputType: "number",
        },
        {
          type: "text",
          name: "respRate",
          title: "Respirations",
          inputType: "number",
          startWithNewLine: false,
        },
        {
          type: "text",
          name: "spo2",
          title: "SpO₂ (%)",
          inputType: "number",
          min: "50",
          max: "100",
          startWithNewLine: false,
        },
        {
          type: "boolean",
          name: "tobaccoCounseling",
          title: "Tobacco cessation counselling given",
          description: "The chart records tobacco use, so the prompt is here.",
          visibleIf: "{user.smoking} anyof ['current', 'former']",
        },
      ],
    },

    /* ── 3 · the problem list ──────────────────────────────────────────────── */
    {
      name: "problemsPage",
      title: "Problem list",
      navigationDescription: "Chart reconciliation",
      elements: [
        {
          type: "boolean",
          name: "reconcileChart",
          title: "Reconcile the chart problem list today",
          description:
            "Off, the list below is read-only — which is what `enableIf` is for.",
        },
        {
          type: "checkbox",
          name: "chartProblems",
          title: "On the chart",
          description: "Comes from this patient's record, not from the definition.",
          colCount: 2,
          choices: chartConditionChoices,
          defaultValueExpression: "{user.conditions}",
          enableIf: "{reconcileChart} = true",
        },
        {
          type: "matrixdynamic",
          name: "problems",
          title: "Problems addressed today",
          description:
            "Each row opens a detail section for the code and the assessment. A problem can only be listed once.",
          addRowText: "Add a problem",
          removeRowText: "Remove",
          rowCount: 1,
          confirmDelete: true,
          detailPanelMode: "underRowSingle",
          detailPanelShowOnAdding: true,
          keyName: "problemName",
          keyDuplicationError: "That problem is already on today's note.",
          columns: [
            {
              name: "problemName",
              title: "Problem",
              cellType: "dropdown",
              isRequired: true,
              isUnique: true,
              choices: conditionChoices,
            },
            {
              name: "onsetDate",
              title: "Onset",
              cellType: "text",
              inputType: "date",
              maxValueExpression: "today()",
            },
            {
              name: "problemStatus",
              title: "Status",
              cellType: "dropdown",
              isRequired: true,
              choices: [
                { value: "active", text: "Active" },
                { value: "chronic", text: "Chronic, stable" },
                { value: "resolved", text: "Resolved" },
                { value: "ruledOut", text: "Ruled out" },
              ],
              defaultValue: "active",
            },
            {
              name: "problemSeverity",
              title: "Severity",
              cellType: "rating",
              rateMax: 5,
              // Nothing to grade once it is gone.
              resetValueIf: "{row.problemStatus} anyof ['resolved', 'ruledOut']",
            },
          ],
          detailElements: [
            {
              type: "text",
              name: "icdCode",
              title: "ICD-10",
              maskType: "pattern",
              maskSettings: { pattern: "a99.9", saveMaskedValue: true },
            },
            {
              type: "expression",
              name: "monthsSinceOnset",
              title: "Months since onset",
              titleLocation: "left",
              startWithNewLine: false,
              visibleIf: "{row.onsetDate} notempty",
              expression: "round(diffDays({row.onsetDate}, today()) / 30, 0)",
            },
            {
              type: "comment",
              name: "problemAssessment",
              title: "Assessment for this problem",
            },
          ],
        },
        {
          type: "expression",
          name: "problemCount",
          title: "Problems on this note",
          titleLocation: "left",
          expression: "countInArray({problems}, 'problemName')",
        },
      ],
    },

    /* ── 4 · medications ───────────────────────────────────────────────────── */
    {
      name: "medsPage",
      title: "Medications",
      navigationDescription: "Reconciliation and dosing",
      elements: [
        {
          type: "checkbox",
          name: "chartMeds",
          title: "Active medications on file",
          colCount: 2,
          choices: chartMedicationChoices,
          defaultValueExpression: "{user.medications}",
        },
        {
          type: "boolean",
          name: "refillsRequested",
          title: "Refills requested at this visit",
          defaultValueExpression: "{user.openRefills}",
        },
        {
          type: "tagbox",
          name: "refillItems",
          title: "Refill which of them?",
          visibleIf: "{refillsRequested} = true",
          // Carried forward from what was ticked above — no second list to keep
          // in step with the chart.
          choicesFromQuestion: "chartMeds",
          choicesFromQuestionMode: "selected",
        },
        {
          type: "matrixdynamic",
          name: "medications",
          title: "Today's medication list",
          description:
            "Daily dose and morphine-milligram equivalents are calculated per row and totalled underneath.",
          addRowText: "Add a medication",
          removeRowText: "Remove",
          rowCount: 1,
          confirmDelete: true,
          detailPanelMode: "underRowSingle",
          columns: [
            {
              name: "drugName",
              title: "Drug",
              cellType: "dropdown",
              isRequired: true,
              allowClear: false,
              minWidth: "170px",
              choices: drugChoices,
            },
            {
              name: "doseAmount",
              title: "Dose",
              cellType: "text",
              inputType: "number",
              isRequired: true,
              minWidth: "78px",
            },
            {
              name: "doseUnit",
              title: "Unit",
              cellType: "dropdown",
              allowClear: false,
              minWidth: "84px",
              choices: [
                { value: "mg", text: "mg" },
                { value: "mcg", text: "mcg" },
                { value: "ml", text: "mL" },
              ],
              defaultValue: "mg",
            },
            {
              name: "dosesPerDay",
              title: "Per day",
              cellType: "text",
              inputType: "number",
              defaultValue: 1,
              min: "1",
              max: "6",
              minWidth: "84px",
              enableIf: "{row.drugName} notempty",
            },
            {
              name: "dailyDose",
              title: "Daily dose",
              cellType: "expression",
              expression: "{row.doseAmount} * {row.dosesPerDay}",
              minWidth: "92px",
              totalType: "sum",
              totalFormat: "Total {0}",
            },
            {
              name: "dailyMme",
              title: "Daily MME",
              cellType: "expression",
              expression:
                "iif({row.isOpioid} = true, {row.doseAmount} * {row.dosesPerDay} * {row.mmeFactor}, 0)",
              minWidth: "92px",
              totalType: "sum",
              totalFormat: "Total {0}",
            },
          ],
          detailElements: [
            {
              type: "dropdown",
              name: "medRoute",
              title: "Route",
              choices: [
                { value: "po", text: "Oral" },
                { value: "inhaled", text: "Inhaled" },
                { value: "sc", text: "Subcutaneous" },
                { value: "topical", text: "Topical" },
              ],
              defaultValue: "po",
            },
            {
              type: "boolean",
              name: "isOpioid",
              title: "Opioid",
              startWithNewLine: false,
              // Answered by the row itself for the three that are.
              setValueIf: "{row.drugName} anyof ['hydrocodone', 'oxycodone', 'tramadol']",
              setValueExpression: "true",
            },
            {
              type: "dropdown",
              name: "mmeFactor",
              title: "MME factor",
              visibleIf: "{row.isOpioid} = true",
              choices: [
                { value: 1, text: "1 — hydrocodone / morphine" },
                { value: 1.5, text: "1.5 — oxycodone" },
                { value: 0.2, text: "0.2 — tramadol" },
              ],
            },
            {
              type: "boolean",
              name: "continueMed",
              title: "Continue",
              startWithNewLine: false,
              defaultValue: true,
            },
          ],
        },
        {
          type: "expression",
          name: "totalMme",
          title: "Total daily MME",
          titleLocation: "left",
          expression: "round({medications-total.dailyMme}, 0)",
        },
        {
          type: "html",
          name: "mmeWarning",
          visibleIf: "{totalMme} >= 50",
          html: "<div class=\"demo-note-alert\">Total daily MME is {totalMme}. At 50 or more, CDC guidance asks for a naloxone conversation; at 90 the note requires a pain-clinic referral.</div>",
        },
        {
          type: "boolean",
          name: "naloxoneOffered",
          title: "Naloxone offered and discussed",
          visibleIf: "{totalMme} >= 50",
          requiredIf: "{totalMme} >= 50",
        },
        {
          type: "boolean",
          name: "painClinicReferral",
          title: "Pain-clinic referral placed",
          visibleIf: "{totalMme} >= 90",
        },
        {
          type: "comment",
          name: "pharmacyNote",
          title: "Note to the pharmacy",
          visibleIf: "{refillsRequested} = true",
        },
      ],
    },

    /* ── 5 · history ───────────────────────────────────────────────────────── */
    {
      name: "historyPage",
      title: "History",
      navigationDescription: "Allergies, surgical, family, social",
      elements: [
        {
          type: "comment",
          name: "allergyList",
          title: "Allergies",
          description: "Prefilled from the chart; edit it in front of the patient.",
          defaultValueExpression: "{user.allergies}",
        },
        {
          type: "paneldynamic",
          name: "surgicalHistory",
          title: "Surgical history",
          // One tab per operation, titled by the operation itself.
          displayMode: "tab",
          templateTabTitle: "{panel.surgeryLabel}",
          tabTitlePlaceholder: "New entry",
          panelCount: 1,
          maxPanelCount: 8,
          confirmDelete: true,
          templateElements: [
            {
              type: "expression",
              name: "surgeryLabel",
              visible: false,
              expression:
                "iif({panel.procedureName} empty, 'New entry', {panel.procedureName})",
            },
            {
              type: "text",
              name: "procedureName",
              title: "Procedure",
              isRequired: true,
            },
            {
              type: "text",
              name: "procedureYear",
              title: "Year",
              inputType: "number",
              startWithNewLine: false,
              min: "1930",
              maxValueExpression: "currentYear()",
            },
            {
              type: "dropdown",
              name: "anesthesiaType",
              title: "Anesthesia",
              choices: [
                { value: "general", text: "General" },
                { value: "regional", text: "Regional" },
                { value: "local", text: "Local" },
                { value: "unknown", text: "Not recorded" },
              ],
            },
            {
              type: "boolean",
              name: "hadComplication",
              title: "Complication",
              startWithNewLine: false,
            },
            {
              type: "comment",
              name: "complicationDetail",
              title: "What happened",
              visibleIf: "{panel.hadComplication} = true",
            },
            {
              type: "file",
              name: "opReport",
              title: "Operative report",
              description: "PDF or a photo of the paper record.",
              acceptedTypes: ".pdf,.png,.jpg,.jpeg",
              maxSize: 2000000,
              allowMultiple: true,
              maxFiles: 3,
            },
          ],
        },
        {
          type: "matrixdropdown",
          name: "familyHistory",
          title: "Family history",
          description: "Who, for each condition — one grid instead of fifteen questions.",
          cellType: "boolean",
          alternateRows: true,
          rows: FAMILY_CONDITIONS,
          columns: [
            { name: "mother", title: "Mother" },
            { name: "father", title: "Father" },
            { name: "sibling", title: "Sibling" },
          ],
        },
        {
          type: "radiogroup",
          name: "tobaccoStatus",
          title: "Tobacco",
          defaultValueExpression: "{user.smoking}",
          choices: [
            { value: "never", text: "Never" },
            { value: "former", text: "Former" },
            { value: "current", text: "Current" },
          ],
        },
        {
          type: "slider",
          name: "drinksPerWeek",
          title: "Alcohol — standard drinks per week",
          min: 0,
          max: 40,
          step: 1,
          labelCount: 5,
        },
        {
          type: "checkbox",
          name: "screeningsDue",
          title: "Screening due",
          colCount: 2,
          choices: [
            { value: "colonoscopy", text: "Colonoscopy" },
            { value: "mammogram", text: "Mammogram" },
            { value: "a1c", text: "HbA1c" },
            { value: "lipids", text: "Lipid panel" },
            { value: "depression", text: "Depression screen" },
            { value: "none", text: "Nothing due", isExclusive: true },
          ],
        },
      ],
    },

    /* ── 6 · review of systems and the focused exam ────────────────────────── */
    {
      name: "examPage",
      title: "ROS & exam",
      navigationDescription: "Screen, then examine",
      elements: [
        {
          type: "tagbox",
          name: "rosAbnormal",
          title: "Systems reported abnormal",
          description:
            "Whatever is chosen here grows a row in the exam grid below — the rows are not written in the definition.",
          choices: ROS_SYSTEMS,
        },
        {
          type: "matrixdropdown",
          name: "examFindings",
          title: "Focused exam",
          visibleIf: "{rosAbnormal} notempty",
          // The rows are the answer to the question above.
          rowsVisibleIf: "{rosAbnormal} contains {item}",
          rows: ROS_SYSTEMS,
          alternateRows: true,
          columns: [
            {
              name: "examImpression",
              title: "Impression",
              cellType: "dropdown",
              isRequired: true,
              choices: [
                { value: "normal", text: "Normal on exam" },
                { value: "mild", text: "Mild finding" },
                { value: "significant", text: "Significant finding" },
                { value: "deferred", text: "Deferred" },
              ],
            },
            {
              name: "examDetail",
              title: "Detail",
              cellType: "comment",
            },
          ],
        },
        {
          type: "matrix",
          name: "phq2",
          title: "PHQ-2 — over the last two weeks, how often has the patient been bothered by…",
          visibleIf: "{rosAbnormal} contains 'psychiatric' or {screeningsDue} contains 'depression'",
          alternateRows: true,
          columns: [
            { value: 0, text: "Not at all" },
            { value: 1, text: "Several days" },
            { value: 2, text: "More than half the days" },
            { value: 3, text: "Nearly every day" },
          ],
          rows: [
            { value: "interest", text: "Little interest or pleasure in doing things" },
            { value: "mood", text: "Feeling down, depressed or hopeless" },
          ],
        },
        {
          type: "expression",
          name: "phq2Score",
          title: "PHQ-2 score",
          titleLocation: "left",
          visibleIf: "{phq2.interest} notempty and {phq2.mood} notempty",
          expression: "{phq2.interest} + {phq2.mood}",
        },
        {
          type: "html",
          name: "phq9Prompt",
          visibleIf: "{phq2Score} >= 3",
          html: "<div class=\"demo-note-note\">A PHQ-2 of 3 or more is a positive screen — administer the PHQ-9 before the patient leaves.</div>",
        },
        {
          type: "comment",
          name: "examNarrative",
          title: "Exam narrative",
          rows: 3,
        },
      ],
    },

    /* ── 7 · assessment, scoring, orders ───────────────────────────────────── */
    {
      name: "planPage",
      title: "Assessment & plan",
      navigationDescription: "Scores, orders, signature",
      elements: [
        {
          type: "expression",
          name: "riskScore",
          title: "Cardiovascular risk points",
          titleLocation: "left",
          description:
            "Age, today's pressure, BMI, the chart's problem count and tobacco — one expression over five pages of answers.",
          expression:
            "iif({patientAge} >= 65, 2, iif({patientAge} >= 50, 1, 0)) + iif({avgSystolic} >= 140, 2, iif({avgSystolic} >= 130, 1, 0)) + iif({bmi} >= 30, 1, 0) + iif({chartProblemCount} >= 3, 1, 0) + iif({tobaccoStatus} = 'current', 2, iif({tobaccoStatus} = 'former', 1, 0))",
        },
        {
          type: "expression",
          name: "riskBand",
          title: "Band",
          titleLocation: "left",
          startWithNewLine: false,
          expression: "iif({riskScore} >= 5, 'High', iif({riskScore} >= 3, 'Moderate', 'Low'))",
        },
        {
          type: "html",
          name: "riskCard",
          html: "<div class=\"demo-note-banner\"><strong>{riskBand} cardiovascular risk</strong> — {riskScore} points. Problem list: {problemCount} addressed today, {chartProblemCount} on the chart. Medication burden: {totalMme} MME per day.</div>",
        },
        {
          type: "comment",
          name: "assessmentText",
          title: "Assessment",
          isRequired: true,
          rows: 4,
        },
        {
          type: "matrixdynamic",
          name: "orders",
          title: "Orders",
          description: "The item list narrows to whatever category the row is in.",
          addRowText: "Add an order",
          removeRowText: "Remove",
          rowCount: 1,
          confirmDelete: true,
          columns: [
            {
              name: "orderCategory",
              title: "Category",
              cellType: "dropdown",
              isRequired: true,
              choices: [
                { value: "lab", text: "Lab" },
                { value: "imaging", text: "Imaging" },
                { value: "referral", text: "Referral" },
                { value: "procedure", text: "Procedure" },
              ],
            },
            {
              name: "orderItem",
              title: "Item",
              cellType: "dropdown",
              isRequired: true,
              // Choice-level visibility, inside a matrix cell.
              choices: [
                { value: "cbc", text: "CBC with differential", visibleIf: "{row.orderCategory} = 'lab'" },
                { value: "cmp", text: "Comprehensive metabolic panel", visibleIf: "{row.orderCategory} = 'lab'" },
                { value: "a1cLab", text: "HbA1c", visibleIf: "{row.orderCategory} = 'lab'" },
                { value: "lipidLab", text: "Lipid panel", visibleIf: "{row.orderCategory} = 'lab'" },
                { value: "chestXray", text: "Chest X-ray", visibleIf: "{row.orderCategory} = 'imaging'" },
                { value: "ecg", text: "ECG", visibleIf: "{row.orderCategory} = 'imaging'" },
                { value: "ultrasound", text: "Ultrasound", visibleIf: "{row.orderCategory} = 'imaging'" },
                { value: "cardiology", text: "Cardiology", visibleIf: "{row.orderCategory} = 'referral'" },
                { value: "endocrine", text: "Endocrinology", visibleIf: "{row.orderCategory} = 'referral'" },
                { value: "behavioralHealth", text: "Behavioral health", visibleIf: "{row.orderCategory} = 'referral'" },
                { value: "spirometry", text: "Spirometry", visibleIf: "{row.orderCategory} = 'procedure'" },
                { value: "jointInjection", text: "Joint injection", visibleIf: "{row.orderCategory} = 'procedure'" },
              ],
            },
            {
              name: "orderPriority",
              title: "Priority",
              cellType: "dropdown",
              choices: [
                { value: "routine", text: "Routine" },
                { value: "soon", text: "Within a week" },
                { value: "stat", text: "STAT" },
              ],
              defaultValue: "routine",
            },
            {
              name: "orderDue",
              title: "Due",
              cellType: "text",
              inputType: "date",
              minValueExpression: "today()",
            },
            {
              name: "orderDays",
              title: "In days",
              cellType: "expression",
              expression: "iif({row.orderDue} empty, 0, diffDays(today(), {row.orderDue}))",
            },
          ],
        },
        {
          type: "text",
          name: "followUpWeeks",
          title: "Follow up in (weeks)",
          inputType: "number",
          defaultValue: 12,
          min: "1",
          max: "52",
        },
        {
          type: "file",
          name: "attachments",
          title: "Attach to the note",
          description: "Outside records, an ECG strip, a photo of the lesion.",
          acceptedTypes: ".pdf,.png,.jpg,.jpeg",
          allowMultiple: true,
          maxFiles: 6,
          maxSize: 2000000,
        },
        {
          type: "file",
          name: "woundPhoto",
          title: "Photograph a finding",
          description: "Straight from the camera, on the device in the room.",
          sourceType: "file-camera",
          maxSize: 2000000,
        },
        {
          type: "signaturepad",
          name: "attestation",
          title: "Attestation",
          description:
            "I have reviewed and agree with the documentation above, and it reflects the care I provided.",
          isRequired: true,
          signatureAutoScaleEnabled: true,
          signatureHeight: 140,
          placeholder: "Sign here",
        },
        {
          type: "boolean",
          name: "sendToPortal",
          title: "Send the visit summary to the patient portal",
          defaultValueExpression: "true",
        },
      ],
    },

    /* ── 8 · only for a patient nobody has seen before ─────────────────────── */
    {
      name: "baselinePage",
      title: "New-patient baseline",
      navigationDescription: "First visit only",
      // The page does not exist for an established patient.
      visibleIf: "{user.isNewPatient} = true",
      elements: [
        {
          type: "html",
          name: "baselineIntro",
          html: "<div class=\"demo-note-note\">{user.firstName} has no history with this practice, so this page exists. Switch to an established patient in the toolbar and it leaves the table of contents entirely.</div>",
        },
        {
          type: "matrixdropdown",
          name: "immunizations",
          title: "Immunization baseline",
          rows: IMMUNIZATIONS,
          columns: [
            {
              name: "immStatus",
              title: "Status",
              cellType: "dropdown",
              choices: [
                { value: "upToDate", text: "Up to date" },
                { value: "due", text: "Due" },
                { value: "declined", text: "Declined" },
                { value: "unknown", text: "Unknown" },
              ],
            },
            {
              name: "immDate",
              title: "Last given",
              cellType: "text",
              inputType: "date",
              maxValueExpression: "today()",
              visibleIf: "{row.immStatus} = 'upToDate'",
            },
          ],
        },
        {
          type: "file",
          name: "priorRecords",
          title: "Records from the previous practice",
          acceptedTypes: ".pdf,.png,.jpg,.jpeg",
          allowMultiple: true,
          maxFiles: 10,
          maxSize: 2000000,
        },
        {
          type: "boolean",
          name: "recordsReleaseSigned",
          title: "Records release signed",
          isRequired: true,
        },
        {
          type: "comment",
          name: "baselineNote",
          title: "Anything else worth carrying into the chart",
        },
      ],
    },
  ],
};

export const encounterNoteSchema: SchemaDefinition = {
  id: "encounter-note",
  title: "Encounter note",
  description:
    "The clinician-facing note: eight pages, dynamic matrices with totals and detail rows, calculated scores, file and camera capture, a signature, and a chart-driven shape.",
  json: encounterNoteJson,
};
