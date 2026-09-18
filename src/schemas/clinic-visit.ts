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
import { textFor } from "./clinic-locale";
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
 * clinician the summary beside it does not name, or a plan the clinic does not
 * accept.
 *
 * **It is one definition in two languages.** Every string a patient reads is a
 * `{ default, es }` object, which is what survey-core stores a localized string
 * as: the page sets `model.locale` and the same JSON renders in Spanish, down to
 * the Next button, which comes from `survey-core/i18n/spanish`. The locale is not
 * chosen by the page — `preferredLanguage` on the patient's chart chooses it (see
 * `clinic-locale.ts`). Values are never translated, so a request answered in
 * Spanish and read back in English is the same request.
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
 *    assembled by survey-core from the chart, choice by choice;
 *  - and the language the whole thing opens in is a chart field too.
 *
 * Swap the user in the toolbar and the same JSON is a different form.
 */

const providerChoices = [
  {
    value: "any",
    text: {
      default: "First available — whoever can see me soonest",
      es: "El primero disponible: quien pueda atenderme más pronto",
    },
  },
  ...PROVIDERS.map((provider) => ({
    value: provider.id,
    // One composite string per language: the name and the credential are proper
    // nouns, the specialty and the caveat are not.
    text: {
      default: `${provider.name}, ${provider.credential} — ${textFor(
        provider.specialty,
        "en",
      )}${provider.acceptingNew ? "" : " (established patients only)"}`,
      es: `${provider.name}, ${provider.credential} — ${textFor(
        provider.specialty,
        "es",
      )}${provider.acceptingNew ? "" : " (solo pacientes ya registrados)"}`,
    },
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
  title: { default: "Request an appointment", es: "Solicitar una cita" },
  description: {
    default:
      "Tell us what you need and when. A scheduler calls you back the same business day to confirm the time.",
    es: "Díganos qué necesita y cuándo. Un coordinador de citas le llama el mismo día hábil para confirmar la hora.",
  },
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
  completeText: { default: "Request appointment", es: "Solicitar la cita" },
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
      title: { default: "Visit", es: "La visita" },
      elements: [
        {
          type: "html",
          name: "returningGreeting",
          visibleIf: "{user_isNewPatient} = false",
          html: {
            default:
              "<p>Welcome back, <strong>{user_preferredName}</strong>. We have you as {user_firstName} {user_lastName} · MRN {user_mrn} · last seen {user_lastVisit}, so most of this is already filled in.</p>",
            // "Qué gusto verle de nuevo" rather than "Bienvenida/o": the name is
            // piped in and the chart does not say which agreement to use.
            es: "<p>Qué gusto verle de nuevo, <strong>{user_preferredName}</strong>. En su expediente aparece como {user_firstName} {user_lastName} · expediente {user_mrn} · última visita {user_lastVisit}, así que casi todo ya está completado.</p>",
          },
        },
        {
          type: "html",
          name: "newGreeting",
          visibleIf: "{user_isNewPatient} = true",
          html: {
            default:
              "<p>You are new to Ridgeline, so there are a few more questions than usual — about five minutes. Everything you enter is used only to book the visit.</p>",
            es: "<p>Como es su primera visita a Ridgeline, hay algunas preguntas más de lo habitual: unos cinco minutos. Todo lo que escriba se usa únicamente para agendar la cita.</p>",
          },
        },
        {
          type: "html",
          name: "emergencyNotice",
          html: {
            default:
              "<p><strong>If this is a medical emergency, call 911.</strong> This form is not monitored after hours and is not a way to reach a clinician urgently. For advice outside opening hours, call our nurse line at (503) 555-0150.</p>",
            es: "<p><strong>Si es una emergencia médica, llame al 911.</strong> Nadie revisa este formulario fuera del horario de atención y no sirve para comunicarse con un profesional de manera urgente. Para consultas fuera del horario, llame a nuestra línea de enfermería al (503) 555-0150.</p>",
          },
        },
        {
          type: "radiogroup",
          name: "visitReason",
          title: {
            default: "What do you need to be seen for?",
            es: "¿Para qué necesita que le atendamos?",
          },
          isRequired: true,
          requiredErrorText: {
            default: "Choose the closest one — the scheduler will sort out the details.",
            es: "Elija la opción más cercana; el coordinador aclarará los detalles.",
          },
          choices: VISIT_REASONS.map((reason) => ({
            value: reason.id,
            text: reason.label,
          })),
        },
        {
          type: "boolean",
          name: "relatedToChart",
          visibleIf: "{user_conditions} notempty",
          title: {
            default: "Is this about something we already treat you for?",
            es: "¿Es por algo que ya le tratamos?",
          },
          labelTrue: { default: "Yes", es: "Sí" },
          labelFalse: { default: "No, something else", es: "No, es otra cosa" },
        },
        {
          type: "checkbox",
          name: "chartCondition",
          visibleIf: "{relatedToChart} = true",
          title: { default: "Which one?", es: "¿Cuál?" },
          description: { default: "Taken from your chart.", es: "Tomado de su expediente." },
          choices: chartConditionChoices,
        },
        {
          type: "comment",
          name: "symptoms",
          title: { default: "Briefly, what is going on?", es: "En pocas palabras, ¿qué le pasa?" },
          description: {
            default:
              "A sentence is enough. Please do not include anything you would not want read back to you over the phone.",
            es: "Con una frase basta. Por favor, no escriba nada que no quiera que le lean por teléfono.",
          },
          rows: 3,
          maxLength: 400,
          visibleIf: "{visitReason} anyof ['illness', 'urgentCare'] or {relatedToChart} = true",
        },
        {
          type: "boolean",
          name: "refillNeeded",
          visibleIf: "{user_openRefills} = true",
          title: {
            default: "Do you need a prescription refilled while we are at it?",
            es: "¿Necesita que le resurtan alguna receta de paso?",
          },
          description: {
            default: "You have refills available.",
            es: "Tiene resurtidos disponibles.",
          },
          labelTrue: { default: "Yes, please", es: "Sí, por favor" },
          labelFalse: { default: "No", es: "No" },
        },
        {
          type: "checkbox",
          name: "refillMedications",
          visibleIf: "{refillNeeded} = true",
          title: { default: "Which ones?", es: "¿Cuáles?" },
          choices: chartMedicationChoices,
        },
        {
          type: "radiogroup",
          name: "timeframe",
          title: { default: "How soon?", es: "¿Con qué urgencia?" },
          isRequired: true,
          choices: [
            { value: "asap", text: { default: "As soon as possible", es: "Lo antes posible" } },
            { value: "thisWeek", text: { default: "This week", es: "Esta semana" } },
            {
              value: "twoWeeks",
              text: { default: "In the next two weeks", es: "En las próximas dos semanas" },
            },
            {
              value: "flexible",
              text: {
                default: "No rush — I am planning ahead",
                es: "Sin prisa: estoy planeando con tiempo",
              },
            },
          ],
        },
        {
          type: "html",
          name: "urgentNotice",
          visibleIf: "{timeframe} = 'asap' or {visitReason} = 'urgentCare'",
          html: {
            default:
              "<p>Walk-in urgent care at our Cedar Park campus is open until 8:00 pm, seven days a week — you do not need this form for it. Submit it anyway if you would rather be called back.</p>",
            es: "<p>La atención urgente sin cita en nuestra sede de Cedar Park abre hasta las 8:00 p. m., los siete días de la semana; para eso no necesita este formulario. Envíelo de todos modos si prefiere que le llamemos.</p>",
          },
        },
      ],
    },
    {
      name: "whereWho",
      title: { default: "Where and who", es: "Dónde y con quién" },
      elements: [
        {
          type: "radiogroup",
          name: "location",
          title: {
            default: "Which of our offices?",
            es: "¿En cuál de nuestros consultorios?",
          },
          isRequired: true,
          defaultValueExpression: "{user_homeLocation}",
          choices: CLINIC_LOCATIONS.map((location) => ({
            value: location.id,
            // Offices and streets are proper nouns: one string, both languages.
            text: `${location.name} — ${location.address1}, ${location.city}`,
          })),
        },
        {
          type: "dropdown",
          name: "provider",
          title: { default: "Anyone in particular?", es: "¿Con alguien en particular?" },
          description: {
            default: "The list narrows to the clinicians who work at the office you picked.",
            es: "La lista se reduce a los profesionales que atienden en el consultorio que eligió.",
          },
          defaultValueExpression: "iif({user_primaryProvider} empty, 'any', {user_primaryProvider})",
          choices: providerChoices,
        },
        {
          type: "checkbox",
          name: "preferredDays",
          title: { default: "Which days work?", es: "¿Qué días le convienen?" },
          colCount: 3,
          choices: PREFERRED_DAYS.map((day) => ({ value: day.value, text: day.text })),
          showNoneItem: true,
          noneText: { default: "Any day", es: "Cualquier día" },
          separateSpecialChoices: true,
        },
        {
          type: "radiogroup",
          name: "preferredTime",
          title: { default: "And what time of day?", es: "¿Y a qué hora del día?" },
          defaultValue: "any",
          choices: PREFERRED_TIMES.map((entry) => ({
            value: entry.value,
            text: {
              default: entry.range
                ? `${entry.label.default} · ${entry.range.default}`
                : entry.label.default,
              es: entry.range ? `${entry.label.es} · ${entry.range.es}` : entry.label.es,
            },
          })),
        },
        {
          type: "boolean",
          name: "telehealth",
          title: {
            default: "Would a video visit work instead?",
            es: "¿Le serviría una visita por video?",
          },
          labelTrue: {
            default: "Yes, if it is clinically appropriate",
            es: "Sí, si es apropiado desde el punto de vista clínico",
          },
          labelFalse: { default: "I would rather come in", es: "Prefiero ir en persona" },
        },
      ],
    },
    {
      name: "patient",
      title: { default: "About you", es: "Sobre usted" },
      elements: [
        {
          type: "boolean",
          name: "identityCorrect",
          visibleIf: "{user_isNewPatient} = false",
          title: {
            default: "Are your details below still correct?",
            es: "¿Sus datos siguen siendo correctos?",
          },
          description: {
            default: "Answer no and they unlock for editing.",
            es: "Responda que no y podrá editarlos.",
          },
          defaultValue: true,
          labelTrue: { default: "Yes, all current", es: "Sí, están al día" },
          labelFalse: { default: "No, something has changed", es: "No, algo ha cambiado" },
        },
        {
          type: "text",
          name: "firstName",
          title: { default: "Legal first name", es: "Nombre legal" },
          isRequired: true,
          autocomplete: "given-name",
          defaultValueExpression: "{user_firstName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "lastName",
          title: { default: "Legal last name", es: "Apellido legal" },
          isRequired: true,
          startWithNewLine: false,
          autocomplete: "family-name",
          defaultValueExpression: "{user_lastName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "preferredName",
          title: { default: "Preferred name", es: "Nombre que prefiere" },
          description: {
            default: "What we should call you, if it differs.",
            es: "Cómo deberíamos llamarle, si es distinto.",
          },
          defaultValueExpression: "{user_preferredName}",
          enableIf: IDENTITY_UNLOCKED,
        },
        {
          type: "text",
          name: "dateOfBirth",
          title: { default: "Date of birth", es: "Fecha de nacimiento" },
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
          title: { default: "Mobile phone", es: "Teléfono celular" },
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
          title: { default: "Email", es: "Correo electrónico" },
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
          title: {
            default: "Is this your first visit to Ridgeline?",
            es: "¿Es su primera visita a Ridgeline?",
          },
          defaultValueExpression: "{user_isNewPatient}",
          labelTrue: { default: "Yes, I am a new patient", es: "Sí, es mi primera visita" },
          labelFalse: {
            default: "No, I have been seen here before",
            es: "No, ya me han atendido aquí",
          },
        },
        {
          type: "boolean",
          name: "needsInterpreter",
          title: { default: "Do you need an interpreter?", es: "¿Necesita un intérprete?" },
          defaultValueExpression: "{user_needsInterpreter}",
          labelTrue: { default: "Yes", es: "Sí" },
          labelFalse: { default: "No", es: "No" },
        },
        {
          type: "dropdown",
          name: "interpreterLanguage",
          title: { default: "Which language?", es: "¿En qué idioma?" },
          visibleIf: "{needsInterpreter} = true",
          isRequired: true,
          requiredIf: "{needsInterpreter} = true",
          // English is not a language anybody interprets into here. The values
          // stay the English language names, because `{languageLabel}` resolves
          // to one of them — translating a value would break the default.
          defaultValueExpression: "iif({user_preferredLanguage} = 'en', '', {languageLabel})",
          choices: [
            { value: "Spanish", text: { default: "Spanish", es: "Español" } },
            { value: "Vietnamese", text: { default: "Vietnamese", es: "Vietnamita" } },
            { value: "Russian", text: { default: "Russian", es: "Ruso" } },
            { value: "Mandarin", text: { default: "Mandarin", es: "Mandarín" } },
            { value: "Somali", text: { default: "Somali", es: "Somalí" } },
            {
              value: "American Sign Language",
              text: { default: "American Sign Language", es: "Lengua de señas americana" },
            },
          ],
          showOtherItem: true,
          otherText: { default: "Another language", es: "Otro idioma" },
        },
      ],
    },
    {
      name: "newHere",
      title: { default: "New here", es: "Primera visita" },
      visibleIf: "{user_isNewPatient} = true",
      description: {
        default: "This page exists because you are new to us. Established patients never see it.",
        es: "Esta página aparece porque es su primera visita con nosotros. Los pacientes que ya nos conocen nunca la ven.",
      },
      elements: [
        {
          type: "text",
          name: "previousClinic",
          title: { default: "Where were you seen before?", es: "¿Dónde le atendían antes?" },
          description: {
            default: "Clinic or provider name, if you had one.",
            es: "Nombre de la clínica o del profesional, si tenía uno.",
          },
        },
        {
          type: "boolean",
          name: "recordsRelease",
          title: {
            default: "May we request your records from them?",
            es: "¿Podemos solicitarles su expediente?",
          },
          labelTrue: { default: "Yes, request them", es: "Sí, solicítenlo" },
          labelFalse: { default: "Not for now", es: "Por ahora no" },
        },
        {
          type: "dropdown",
          name: "referralSource",
          title: {
            default: "How did you hear about Ridgeline?",
            es: "¿Cómo se enteró de Ridgeline?",
          },
          // Values stay the English text: they are what a stored request holds,
          // and the demo's prefill data carries one of them.
          choices: [
            {
              value: "A friend or family member",
              text: { default: "A friend or family member", es: "Un amigo o un familiar" },
            },
            {
              value: "My insurance directory",
              text: { default: "My insurance directory", es: "El directorio de mi seguro" },
            },
            {
              value: "A search engine",
              text: { default: "A search engine", es: "Un buscador de internet" },
            },
            {
              value: "Another clinician referred me",
              text: {
                default: "Another clinician referred me",
                es: "Otro profesional me refirió",
              },
            },
            { value: "I live nearby", text: { default: "I live nearby", es: "Vivo cerca" } },
          ],
          showOtherItem: true,
          otherText: { default: "Somewhere else", es: "En otro lugar" },
        },
        {
          type: "text",
          name: "emergencyContactName",
          title: { default: "Emergency contact", es: "Contacto de emergencia" },
          isRequired: true,
          requiredIf: "{user_isNewPatient} = true",
        },
        {
          type: "text",
          name: "emergencyContactPhone",
          title: { default: "Their phone", es: "Su teléfono" },
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
      title: { default: "Coverage", es: "Cobertura" },
      elements: [
        {
          type: "radiogroup",
          name: "coverage",
          title: {
            default: "How will this visit be paid for?",
            es: "¿Cómo se pagará esta visita?",
          },
          isRequired: true,
          defaultValueExpression: "iif({user_healthPlanOnFile} notempty, 'insurance', '')",
          choices: [
            {
              value: "insurance",
              text: { default: "Through my health plan", es: "Con mi plan de salud" },
            },
            {
              value: "selfPay",
              text: {
                default: "Self-pay — I will pay at check-in",
                es: "Pago directo: pagaré al registrarme",
              },
            },
          ],
        },
        {
          type: "panel",
          name: "insurancePanel",
          title: { default: "Your health plan", es: "Su plan de salud" },
          visibleIf: "{coverage} = 'insurance'",
          elements: [
            {
              type: "dropdown",
              name: "healthPlan",
              title: { default: "Plan", es: "Plan" },
              description: {
                default: "We are in network with all of these.",
                es: "Estamos dentro de la red de todos estos.",
              },
              isRequired: true,
              requiredIf: "{coverage} = 'insurance'",
              defaultValueExpression: "{user_healthPlanOnFile}",
              choices: HEALTH_PLANS.map((plan) => ({ value: plan.id, text: plan.name })),
              showOtherItem: true,
              otherText: {
                default: "Something else — please check for me",
                es: "Otro: por favor verifíquenlo",
              },
            },
            {
              type: "html",
              name: "cardOnFileNote",
              visibleIf: "{user_memberIdOnFile} notempty",
              html: {
                default:
                  "<p>We have your <strong>{healthPlanLabel}</strong> card on file — member ID {user_memberIdOnFile}, group {user_groupNumberOnFile}. Nothing to type unless it has changed.</p>",
                es: "<p>Tenemos su tarjeta de <strong>{healthPlanLabel}</strong> en el expediente: número de miembro {user_memberIdOnFile}, grupo {user_groupNumberOnFile}. No tiene que escribir nada, a menos que haya cambiado.</p>",
              },
            },
            {
              type: "boolean",
              name: "coverageChanged",
              visibleIf: "{user_memberIdOnFile} notempty",
              title: {
                default: "Has your coverage changed since your last visit?",
                es: "¿Ha cambiado su cobertura desde su última visita?",
              },
              defaultValue: false,
              labelTrue: { default: "Yes, it has", es: "Sí, ha cambiado" },
              labelFalse: { default: "No, same as before", es: "No, es la misma" },
            },
            {
              type: "text",
              name: "memberId",
              title: { default: "Member ID", es: "Número de miembro" },
              description: {
                default: "As printed on the front of the card.",
                es: "Como aparece impreso al frente de la tarjeta.",
              },
              visibleIf: "{user_memberIdOnFile} empty or {coverageChanged} = true",
            },
            {
              type: "text",
              name: "groupNumber",
              title: { default: "Group number", es: "Número de grupo" },
              startWithNewLine: false,
              visibleIf: "{user_memberIdOnFile} empty or {coverageChanged} = true",
            },
            {
              type: "boolean",
              name: "cardOnFile",
              title: {
                default: "Have we scanned your card before?",
                es: "¿Ya hemos escaneado su tarjeta antes?",
              },
              visibleIf: "{user_memberIdOnFile} empty",
              labelTrue: {
                default: "Yes, it should be on file",
                es: "Sí, debería estar en el expediente",
              },
              labelFalse: { default: "No, I will bring it", es: "No, la llevaré" },
            },
          ],
        },
        {
          type: "html",
          name: "selfPayNotice",
          visibleIf: "{coverage} = 'selfPay'",
          // The price for this visit is the one shown beside the form, in the
          // visit summary — there is no price table further down the page.
          html: {
            default:
              "<p>The self-pay price for this visit is the one shown beside this form, and it is the same for everyone. Payment is due at check-in and no claim is filed on your behalf.</p>",
            es: "<p>El precio de pago directo de esta visita es el que aparece junto a este formulario, y es el mismo para todos. El pago se hace al registrarse y no se presenta ningún reclamo al seguro en su nombre.</p>",
          },
        },
        {
          type: "boolean",
          name: "consentToContact",
          title: {
            default: "May we leave a voicemail or send a text about this request?",
            es: "¿Podemos dejarle un mensaje de voz o enviarle un texto sobre esta solicitud?",
          },
          isRequired: true,
          labelTrue: { default: "Yes, either is fine", es: "Sí, cualquiera de las dos" },
          labelFalse: {
            default: "No — call and speak to me only",
            es: "No: llámenme y hablen solo conmigo",
          },
        },
        {
          type: "boolean",
          name: "privacyAcknowledged",
          title: {
            default: "I have read the Notice of Privacy Practices",
            es: "He leído el Aviso de Prácticas de Privacidad",
          },
          description: {
            default:
              "Required before we can accept a request. Ask the scheduler for a copy when they call.",
            es: "Se requiere antes de que podamos aceptar la solicitud. Pida una copia al coordinador cuando le llame.",
          },
          isRequired: true,
          requiredErrorText: {
            default: "We cannot take the request without this acknowledgement.",
            es: "No podemos aceptar la solicitud sin esta confirmación.",
          },
        },
      ],
    },
  ],
  completedHtml: {
    default:
      "<h4>Request received.</h4><p>A scheduler will call you the same business day to confirm a time. Nothing has actually been sent anywhere — Ridgeline Family Health is a fictional clinic built to demonstrate SurveyJS.</p>",
    es: "<h4>Solicitud recibida.</h4><p>Un coordinador le llamará el mismo día hábil para confirmar la hora. En realidad no se ha enviado nada a ninguna parte: Ridgeline Family Health es una clínica ficticia creada para mostrar SurveyJS.</p>",
  },
};

export const clinicVisitSchema: SchemaDefinition = {
  id: "clinic-visit",
  title: "Appointment Request",
  description:
    "A US clinic's appointment request, rendered from the patient's own chart: prefilled identity, a shorter coverage step, chart-driven follow-up questions, and English or Spanish from one definition.",
  json: clinicVisitJson,
};
