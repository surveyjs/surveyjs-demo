import {
  CHART_CONDITIONS,
  CHART_MEDICATIONS,
  CLINIC_LOCATIONS,
  HEALTH_PLANS,
  PREFERRED_DAYS,
  PREFERRED_TIMES,
  PROVIDERS,
  VISIT_REASONS,
} from "./clinic-info";
import { PATIENT_LANGUAGES } from "./patient-record";
import type { SchemaDefinition, SurveyJSON } from "./types";
import { labelExpression } from "./variables/labels";

/**
 * "Request an appointment" — the form on Ridgeline Family Health's home page.
 *
 * This is the survey that belongs on a clinic site, and it is the one SurveyJS
 * is bought for: masked phone numbers, a date of birth, conditional insurance
 * panels, required consents, and a review step before anything is submitted.
 * Nothing exotic — the value is that it is the real shape of a real form, and it
 * needs no bespoke CSS to sit on a public-facing page.
 *
 * Every choice is generated from `clinic-info.ts`, so the form can never offer a
 * clinician the directory below it does not list, or a plan the coverage section
 * does not accept.
 *
 * And it is the strongest of the three demos for **personalisation**, because a
 * patient portal knows more about you than any other login you have. Everything
 * below reads the chart the host app passed in (`{user_…}`, see
 * `demo-accounts.ts`):
 *
 *  - the office, the clinician, the plan, the name, the date of birth and the
 *    phone number all arrive answered;
 *  - the identity fields are locked until the patient says something has changed,
 *    so an established patient confirms four things instead of typing nine;
 *  - the insurance-card fields are not there at all while a card is on file;
 *  - a whole extra page exists for a first-time patient and for nobody else;
 *  - "is this about something we already treat?" offers *this* patient's
 *    conditions, and the refill question *this* patient's medications — both
 *    assembled by survey-core from the chart, choice by choice.
 *
 * Swap the user in the toolbar and the same JSON is a different form.
 */

const providerChoices = [
  { value: "any", text: "First available — whoever can see me soonest" },
  ...PROVIDERS.map((provider) => ({
    value: provider.id,
    text: `${provider.name}, ${provider.credential} — ${provider.specialty}${
      provider.acceptingNew ? "" : " (established patients only)"
    }`,
    // Filters the list down to whoever actually works at the chosen site. If a
    // build of survey-core ignores item-level visibility the list simply stays
    // complete, which is why this is safe to lean on in a demo.
    visibleIf: `{location} empty or {location} anyof [${provider.locationIds
      .map((id) => `'${id}'`)
      .join(", ")}]`,
  })),
];

/**
 * The patient's own problem list, as choices.
 *
 * Nine conditions are declared; each one is visible only if it is on this
 * patient's chart. Maria sees two, Ruth sees three, a new patient sees the
 * question not at all.
 */
const chartConditionChoices = CHART_CONDITIONS.map((condition) => ({
  value: condition.id,
  text: condition.label,
  visibleIf: `{user_conditions} contains '${condition.id}'`,
}));

const chartMedicationChoices = CHART_MEDICATIONS.map((medication) => ({
  value: medication.id,
  text: medication.label,
  visibleIf: `{user_medications} contains '${medication.id}'`,
}));

/** Locked while the record on file is confirmed as correct. */
const IDENTITY_UNLOCKED = "{user_isNewPatient} = true or {identityCorrect} = false";

export const clinicVisitJson: SurveyJSON = {
  title: "Request an appointment",
  description:
    "Tell us what you need and when. A scheduler calls you back the same business day to confirm the time.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  showProgressBar: true,
  progressBarLocation: "belowheader",
  progressBarType: "pages",
  progressBarShowPageTitles: true,
  // Nobody should submit their date of birth and insurance ID without seeing it
  // back first — and it is what lets a patient fix one field without retyping.
  showPreviewBeforeComplete: true,
  previewMode: "answeredQuestions",
  completeText: "Request appointment",
  // The record carries values; the text a patient reads is worked out here.
  calculatedValues: [
    {
      name: "languageLabel",
      expression: labelExpression("user_preferredLanguage", PATIENT_LANGUAGES, "English"),
      includeIntoResult: false,
    },
    {
      name: "healthPlanLabel",
      expression: labelExpression(
        "user_healthPlanOnFile",
        HEALTH_PLANS.map((plan) => ({ value: plan.id, text: plan.name })),
        "health plan",
      ),
      includeIntoResult: false,
    },
  ],
  pages: [
    {
      name: "visit",
      title: "Visit",
      elements: [
        {
          type: "html",
          name: "returningGreeting",
          visibleIf: "{user_isNewPatient} = false",
          html: "<p>Welcome back, <strong>{user_preferredName}</strong>. We have you as {user_firstName} {user_lastName} · MRN {user_mrn} · last seen {user_lastVisit}, so most of this is already filled in.</p>",
        },
        {
          type: "html",
          name: "newGreeting",
          visibleIf: "{user_isNewPatient} = true",
          html: "<p>You are new to Ridgeline, so there are a few more questions than usual — about five minutes. Everything you enter is used only to book the visit.</p>",
        },
        {
          type: "html",
          name: "emergencyNotice",
          html: "<p><strong>If this is a medical emergency, call 911.</strong> This form is not monitored after hours and is not a way to reach a clinician urgently. For advice outside opening hours, call our nurse line at (503) 555-0150.</p>",
        },
        {
          type: "radiogroup",
          name: "visitReason",
          title: "What do you need to be seen for?",
          isRequired: true,
          requiredErrorText: "Choose the closest one — the scheduler will sort out the details.",
          choices: VISIT_REASONS.map((reason) => ({
            value: reason.id,
            text: reason.label,
          })),
        },
        {
          type: "boolean",
          name: "relatedToChart",
          visibleIf: "{user_conditions} notempty",
          title: "Is this about something we already treat you for?",
          labelTrue: "Yes",
          labelFalse: "No, something else",
        },
        {
          type: "checkbox",
          name: "chartCondition",
          visibleIf: "{relatedToChart} = true",
          title: "Which one?",
          description: "Taken from your chart.",
          choices: chartConditionChoices,
        },
        {
          type: "comment",
          name: "symptoms",
          title: "Briefly, what is going on?",
          description:
            "A sentence is enough. Please do not include anything you would not want read back to you over the phone.",
          rows: 3,
          maxLength: 400,
          visibleIf: "{visitReason} anyof ['illness', 'urgentCare'] or {relatedToChart} = true",
        },
        {
          type: "boolean",
          name: "refillNeeded",
          visibleIf: "{user_openRefills} = true",
          title: "Do you need a prescription refilled while we are at it?",
          description: "You have refills available.",
          labelTrue: "Yes, please",
          labelFalse: "No",
        },
        {
          type: "checkbox",
          name: "refillMedications",
          visibleIf: "{refillNeeded} = true",
          title: "Which ones?",
          choices: chartMedicationChoices,
        },
        {
          type: "radiogroup",
          name: "timeframe",
          title: "How soon?",
          isRequired: true,
          choices: [
            { value: "asap", text: "As soon as possible" },
            { value: "thisWeek", text: "This week" },
            { value: "twoWeeks", text: "In the next two weeks" },
            { value: "flexible", text: "No rush — I am planning ahead" },
          ],
        },
        {
          type: "html",
          name: "urgentNotice",
          visibleIf: "{timeframe} = 'asap' or {visitReason} = 'urgentCare'",
          html: "<p>Walk-in urgent care at our Cedar Park campus is open until 8:00 pm, seven days a week — you do not need this form for it. Submit it anyway if you would rather be called back.</p>",
        },
      ],
    },
    {
      name: "whereWho",
      title: "Where and who",
      elements: [
        {
          type: "radiogroup",
          name: "location",
          title: "Which of our offices?",
          isRequired: true,
          defaultValueExpression: "{user_homeLocation}",
          choices: CLINIC_LOCATIONS.map((location) => ({
            value: location.id,
            text: `${location.name} — ${location.address1}, ${location.city}`,
          })),
        },
        {
          type: "dropdown",
          name: "provider",
          title: "Anyone in particular?",
          description: "The list narrows to the clinicians who work at the office you picked.",
          defaultValueExpression: "iif({user_primaryProvider} empty, 'any', {user_primaryProvider})",
          choices: providerChoices,
        },
        {
          type: "checkbox",
          name: "preferredDays",
          title: "Which days work?",
          colCount: 3,
          choices: [...PREFERRED_DAYS],
          showNoneItem: true,
          noneText: "Any day",
          separateSpecialChoices: true,
        },
        {
          type: "radiogroup",
          name: "preferredTime",
          title: "And what time of day?",
          defaultValue: "any",
          choices: PREFERRED_TIMES.map((entry) => ({ value: entry.value, text: entry.text })),
        },
        {
          type: "boolean",
          name: "telehealth",
          title: "Would a video visit work instead?",
          labelTrue: "Yes, if it is clinically appropriate",
          labelFalse: "I would rather come in",
        },
      ],
    },
    {
      name: "patient",
      title: "About you",
      elements: [
        {
          type: "boolean",
          name: "identityCorrect",
          visibleIf: "{user_isNewPatient} = false",
          title: "Are your details below still correct?",
          description: "Answer no and they unlock for editing.",
          defaultValue: true,
          labelTrue: "Yes, all current",
          labelFalse: "No, something has changed",
        },
        {
          type: "text",
          name: "firstName",
          title: "Legal first name",
          isRequired: true,
          autocomplete: "given-name",
          defaultValueExpression: "{user_firstName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "lastName",
          title: "Legal last name",
          isRequired: true,
          startWithNewLine: false,
          autocomplete: "family-name",
          defaultValueExpression: "{user_lastName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "preferredName",
          title: "Preferred name",
          description: "What we should call you, if it differs.",
          defaultValueExpression: "{user_preferredName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "dateOfBirth",
          title: "Date of birth",
          inputType: "date",
          isRequired: true,
          startWithNewLine: false,
          autocomplete: "bday",
          defaultValueExpression: "{user_dateOfBirth}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "phone",
          title: "Mobile phone",
          inputType: "tel",
          isRequired: true,
          maskType: "pattern",
          maskSettings: { pattern: "(999) 999-9999" },
          placeholder: "(___) ___-____",
          autocomplete: "tel",
          defaultValueExpression: "{user_phone}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "email",
          title: "Email",
          inputType: "email",
          startWithNewLine: false,
          validators: [{ type: "email" }],
          autocomplete: "email",
          defaultValueExpression: "{user_email}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "boolean",
          name: "newPatient",
          title: "Is this your first visit to Ridgeline?",
          defaultValueExpression: "{user_isNewPatient}",
          labelTrue: "Yes, I am a new patient",
          labelFalse: "No, I have been seen here before",
        },
        {
          type: "boolean",
          name: "needsInterpreter",
          title: "Do you need an interpreter?",
          defaultValueExpression: "{user_needsInterpreter}",
          labelTrue: "Yes",
          labelFalse: "No",
        },
        {
          type: "dropdown",
          name: "interpreterLanguage",
          title: "Which language?",
          visibleIf: "{needsInterpreter} = true",
          isRequired: true,
          requiredIf: "{needsInterpreter} = true",
          // English is not a language anybody interprets into here.
          defaultValueExpression: "iif({user_preferredLanguage} = 'en', '', {languageLabel})",
          choices: [
            "Spanish",
            "Vietnamese",
            "Russian",
            "Mandarin",
            "Somali",
            "American Sign Language",
          ],
          showOtherItem: true,
          otherText: "Another language",
        },
      ],
    },
    {
      name: "newHere",
      title: "New here",
      visibleIf: "{user_isNewPatient} = true",
      description:
        "This page exists because you are new to us. Established patients never see it.",
      elements: [
        {
          type: "text",
          name: "previousClinic",
          title: "Where were you seen before?",
          description: "Clinic or provider name, if you had one.",
        },
        {
          type: "boolean",
          name: "recordsRelease",
          title: "May we request your records from them?",
          labelTrue: "Yes, request them",
          labelFalse: "Not for now",
        },
        {
          type: "dropdown",
          name: "referralSource",
          title: "How did you hear about Ridgeline?",
          choices: [
            "A friend or family member",
            "My insurance directory",
            "A search engine",
            "Another clinician referred me",
            "I live nearby",
          ],
          showOtherItem: true,
          otherText: "Somewhere else",
        },
        {
          type: "text",
          name: "emergencyContactName",
          title: "Emergency contact",
          isRequired: true,
          requiredIf: "{user_isNewPatient} = true",
        },
        {
          type: "text",
          name: "emergencyContactPhone",
          title: "Their phone",
          inputType: "tel",
          startWithNewLine: false,
          maskType: "pattern",
          maskSettings: { pattern: "(999) 999-9999" },
          placeholder: "(___) ___-____",
        },
      ],
    },
    {
      // Not "coverage": the question below owns that name, and a page sharing it
      // makes {coverage} ambiguous — survey-core's linter reports it as a duplicate.
      name: "coveragePage",
      title: "Coverage",
      elements: [
        {
          type: "radiogroup",
          name: "coverage",
          title: "How will this visit be paid for?",
          isRequired: true,
          defaultValueExpression: "iif({user_healthPlanOnFile} notempty, 'insurance', '')",
          choices: [
            { value: "insurance", text: "Through my health plan" },
            { value: "selfPay", text: "Self-pay — I will pay at check-in" },
          ],
        },
        {
          type: "panel",
          name: "insurancePanel",
          title: "Your health plan",
          visibleIf: "{coverage} = 'insurance'",
          elements: [
            {
              type: "dropdown",
              name: "healthPlan",
              title: "Plan",
              description: "We are in network with all of these.",
              isRequired: true,
              requiredIf: "{coverage} = 'insurance'",
              defaultValueExpression: "{user_healthPlanOnFile}",
              choices: HEALTH_PLANS.map((plan) => ({ value: plan.id, text: plan.name })),
              showOtherItem: true,
              otherText: "Something else — please check for me",
            },
            {
              type: "html",
              name: "cardOnFileNote",
              visibleIf: "{user_memberIdOnFile} notempty",
              html: "<p>We have your <strong>{healthPlanLabel}</strong> card on file — member ID {user_memberIdOnFile}, group {user_groupNumberOnFile}. Nothing to type unless it has changed.</p>",
            },
            {
              type: "boolean",
              name: "coverageChanged",
              visibleIf: "{user_memberIdOnFile} notempty",
              title: "Has your coverage changed since your last visit?",
              defaultValue: false,
              labelTrue: "Yes, it has",
              labelFalse: "No, same as before",
            },
            {
              type: "text",
              name: "memberId",
              title: "Member ID",
              description: "As printed on the front of the card.",
              visibleIf: "{user_memberIdOnFile} empty or {coverageChanged} = true",
            },
            {
              type: "text",
              name: "groupNumber",
              title: "Group number",
              startWithNewLine: false,
              visibleIf: "{user_memberIdOnFile} empty or {coverageChanged} = true",
            },
            {
              type: "boolean",
              name: "cardOnFile",
              title: "Have we scanned your card before?",
              visibleIf: "{user_memberIdOnFile} empty",
              labelTrue: "Yes, it should be on file",
              labelFalse: "No, I will bring it",
            },
          ],
        },
        {
          type: "html",
          name: "selfPayNotice",
          visibleIf: "{coverage} = 'selfPay'",
          html: "<p>Our self-pay prices are posted on this page and are the same for everyone. Payment is due at check-in and no claim is filed on your behalf.</p>",
        },
        {
          type: "boolean",
          name: "consentToContact",
          title: "May we leave a voicemail or send a text about this request?",
          isRequired: true,
          labelTrue: "Yes, either is fine",
          labelFalse: "No — call and speak to me only",
        },
        {
          type: "boolean",
          name: "privacyAcknowledged",
          title: "I have read the Notice of Privacy Practices",
          description:
            "Required before we can accept a request. A copy is linked in the footer of this page.",
          isRequired: true,
          requiredErrorText: "We cannot take the request without this acknowledgement.",
        },
      ],
    },
  ],
  completedHtml:
    "<h4>Request received.</h4><p>A scheduler will call you the same business day to confirm a time. Nothing has actually been sent anywhere — Ridgeline Family Health is a fictional clinic built to demonstrate SurveyJS.</p>",
};

export const clinicVisitSchema: SchemaDefinition = {
  id: "clinic-visit",
  title: "Appointment Request",
  description:
    "A US clinic's appointment request, rendered from the patient's own chart: prefilled identity, a shorter coverage step, and chart-driven follow-up questions.",
  json: clinicVisitJson,
};
