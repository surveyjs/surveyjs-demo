import type { ClinicLocale } from "@/schemas";

/**
 * Every word the clinic page says for itself, in both languages.
 *
 * The form's strings live in the definition, and the visit summary's live beside
 * the function that derives it (`clinic-info.ts`). What is left is the host site:
 * its utility bar, its header, the banner above the form, the panel's chrome and
 * its footer. They are here rather than in the definition because a visitor can
 * edit that definition on `/configure` — a stored copy without these keys would
 * leave the page around the form speechless.
 *
 * `Record<ClinicLocale, RidgelineStrings>` is the whole safety net: a key added
 * in English and forgotten in Spanish does not compile. A string with a value in
 * it is a function, so no caller has to know how it is put together.
 *
 * Not here, and deliberately: the reviewer's tools. The demo dock, the "Edit the
 * user" popup and the "SurveyJS renders this" label are the demo talking about
 * the page rather than the clinic talking to a patient, and they stay English in
 * every locale — see `RidgelineDemo.tsx`.
 */
export interface RidgelineStrings {
  /* utility bar */
  readonly urgentCareHours: string;
  readonly payBill: string;
  readonly patientPortal: string;
  readonly schemeLight: string;
  readonly schemeDark: string;
  readonly switchToLight: string;
  readonly switchToDark: string;

  /* header */
  readonly nav: readonly string[];
  readonly requestAppointment: string;
  readonly mrn: string;
  readonly noPlanOnFile: string;
  readonly signIn: string;

  /* the language switch, in the header and in the banner */
  readonly languageGroup: string;
  readonly englishFull: string;
  readonly spanishFull: string;

  /* the visit summary panel */
  readonly panelHeading: string;
  readonly panelEmpty: string;
  readonly requestReceived: string;
  readonly requestReceivedNote: string;
  readonly changeAnswers: string;
  readonly rowReason: string;
  readonly rowOffice: string;
  readonly rowClinician: string;
  readonly rowWhen: string;
  readonly rowPatient: string;
  readonly firstAvailable: string;
  readonly newPatient: string;
  readonly selfPayPrice: string;
  readonly estimatedDue: string;
  readonly referral: (planName: string) => string;
  readonly urgentNote: string;
  readonly whatToBring: string;

  /* footer */
  readonly disclaimer: string;
}

export const RIDGELINE_STRINGS: Record<ClinicLocale, RidgelineStrings> = {
  en: {
    urgentCareHours: "Urgent care until 8:00 pm daily",
    payBill: "Pay my bill",
    patientPortal: "Patient portal",
    schemeLight: "Light",
    schemeDark: "Dark",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",

    nav: ["Services", "Providers", "Locations", "Patients", "Insurance & billing"],
    requestAppointment: "Request an appointment",
    mrn: "MRN",
    noPlanOnFile: "no plan on file",
    signIn: "Sign in",

    languageGroup: "Page language",
    englishFull: "English",
    spanishFull: "Español",

    panelHeading: "Your visit",
    panelEmpty:
      "Answer the first question and this fills in — what it costs you, where you are going and what to bring.",
    requestReceived: "Request received",
    requestReceivedNote:
      "A scheduler calls you back the same business day. Nothing was really sent — this clinic is fictional.",
    changeAnswers: "Change my answers",
    rowReason: "Reason",
    rowOffice: "Office",
    rowClinician: "Clinician",
    rowWhen: "When",
    rowPatient: "Patient",
    firstAvailable: "First available",
    newPatient: "New to Ridgeline",
    selfPayPrice: "Self-pay price",
    estimatedDue: "Estimated due at check-in",
    referral: (planName) =>
      `${planName} needs a referral from your assigned primary-care clinician for this kind of visit. We can request one for you — say so when the scheduler calls.`,
    urgentNote:
      "Walk-in urgent care at Cedar Park is open until 8:00 pm today. If this cannot wait for a callback, come in.",
    whatToBring: "What to bring",

    disclaimer:
      "Ridgeline Family Health is a fictional clinic built to demonstrate SurveyJS inside a realistic healthcare page. The clinicians, offices, phone numbers, insurance plans and prices are invented; nothing on this page is medical advice, no appointment is booked and no data leaves your browser. The page is plain shadcn/ui; the form is SurveyJS, styled only by the shadcn theme adapter.",
  },
  es: {
    urgentCareHours: "Atención urgente hasta las 8:00 p. m. todos los días",
    payBill: "Pagar mi factura",
    patientPortal: "Portal del paciente",
    schemeLight: "Claro",
    schemeDark: "Oscuro",
    switchToLight: "Cambiar al modo claro",
    switchToDark: "Cambiar al modo oscuro",

    nav: ["Servicios", "Profesionales", "Consultorios", "Pacientes", "Seguros y facturación"],
    requestAppointment: "Solicitar una cita",
    mrn: "Expediente",
    noPlanOnFile: "sin plan registrado",
    signIn: "Iniciar sesión",

    languageGroup: "Idioma de la página",
    englishFull: "English",
    spanishFull: "Español",

    panelHeading: "Su visita",
    panelEmpty:
      "Responda la primera pregunta y esto se completa: cuánto le costará, a dónde debe ir y qué llevar.",
    requestReceived: "Solicitud recibida",
    requestReceivedNote:
      "Un coordinador le llama el mismo día hábil. En realidad no se envió nada: esta clínica es ficticia.",
    changeAnswers: "Cambiar mis respuestas",
    rowReason: "Motivo",
    rowOffice: "Consultorio",
    rowClinician: "Profesional",
    rowWhen: "Cuándo",
    rowPatient: "Paciente",
    firstAvailable: "El primero disponible",
    newPatient: "Primera visita a Ridgeline",
    selfPayPrice: "Precio de pago directo",
    estimatedDue: "Estimado a pagar al registrarse",
    referral: (planName) =>
      `${planName} exige un referido de su médico de atención primaria asignado para este tipo de visita. Podemos solicitarlo por usted; dígalo cuando le llame el coordinador.`,
    urgentNote:
      "La atención urgente sin cita en Cedar Park abre hoy hasta las 8:00 p. m. Si esto no puede esperar una llamada, venga.",
    whatToBring: "Qué llevar",

    disclaimer:
      "Ridgeline Family Health es una clínica ficticia creada para mostrar SurveyJS dentro de una página de atención médica realista. Los profesionales, los consultorios, los números de teléfono, los planes de seguro y los precios son inventados; nada en esta página es consejo médico, no se agenda ninguna cita y ningún dato sale de su navegador. La página es shadcn/ui sin más; el formulario es SurveyJS, con los estilos del adaptador de tema de shadcn y nada más.",
  },
};

/**
 * The banner above the form, which says both languages at once.
 *
 * It is not part of `RidgelineStrings` because it is the one thing on the page
 * that does not follow the active locale: a patient who reads Spanish and a
 * colleague looking over their shoulder both have to be able to read it, so both
 * lines are always rendered, each with its own `lang`.
 *
 * `switchedToEnglish` is what makes the second half honest — the chart still says
 * Spanish, and the sentence says who overruled it.
 */
export const RIDGELINE_BANNER: Record<
  ClinicLocale,
  (name: string, switchedToEnglish: boolean) => string
> = {
  en: (name, switchedToEnglish) =>
    switchedToEnglish
      ? `${name}'s preferred language is Spanish — you switched this form to English.`
      : `${name}'s preferred language is Spanish — this form opened in Español.`,
  es: (name, switchedToEnglish) =>
    switchedToEnglish
      ? `El idioma preferido de ${name} es el español, pero usted cambió este formulario a inglés.`
      : `El idioma preferido de ${name} es el español, por eso este formulario se abrió en español.`,
};
