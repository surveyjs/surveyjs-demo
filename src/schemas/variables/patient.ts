import type { ISurveyVariablePresets } from "survey-core";
import { CLINIC_PATIENTS, patientRecordJson } from "../patient-record";
import { toVariableDefinition, toVariables } from "./prefix";

/** One line a reviewer can pick a patient by, keyed by the stored record's id. */
const DESCRIPTIONS: Readonly<Record<string, string>> = {
  delgado: "Established patient, full chart, a refill due; her chart says Spanish, so the page opens in Spanish",
  okafor: "Established patient on Medicare: copay and referral rules differ",
  raman: "First visit: no chart, so the same definition renders the long form",
};

/**
 * What the clinic knows about the patient, for both clinic forms: the public
 * appointment form (`clinic-visit.ts`) and the encounter note.
 *
 * Nothing is written twice. The definition is derived from `patientRecordJson`,
 * the survey the back office edits the record with, and the presets from
 * `CLINIC_PATIENTS`, the stored records, which keep their unprefixed shape.
 */
export const patientVariablePresets: ISurveyVariablePresets = {
  definition: toVariableDefinition(patientRecordJson),
  presets: CLINIC_PATIENTS.map((patient) => ({
    name: `${String(patient.data.firstName)} ${String(patient.data.lastName)}`,
    description: DESCRIPTIONS[patient.id],
    variables: toVariables(patient.data),
  })),
};
