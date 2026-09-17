import { test, expect } from "@playwright/test";
import { Model, SurveyVariablePresets } from "survey-core";
import { FORMS } from "../src/components/configure/forms";
import { lintSurveyJson } from "../src/lib/lint/lint-survey";
import { buildPathIndex, locatePath } from "../src/lib/lint/monaco-adapter";
import { CLINIC_PATIENTS, patientRecordJson } from "../src/schemas/patient-record";
import { createSurveyModel } from "../src/schemas/createSurveyModel";
import { customerSatisfactionJson } from "../src/schemas/customer-satisfaction";
import { LEADS_USERS } from "../src/storage/session";
import {
  USER_PREFIX,
  fromVariables,
  getVariableNames,
  getVariablePresets,
  toVariableDefinition,
  toVariables,
} from "../src/schemas/variables";

/**
 * The variable presets, without a browser: what each personalized form declares
 * (`src/schemas/variables/`) holds together, in both editions.
 */

const PERSONALIZED = ["customer-satisfaction", "clinic-visit", "encounter-note", "leads"];

test("the personalized forms have presets, and the plain ones have none", () => {
  for (const form of FORMS) {
    const presets = getVariablePresets(form.id);
    if (PERSONALIZED.includes(form.id)) expect(presets?.presets?.length).toBeGreaterThan(1);
    else expect(presets).toBeUndefined();
  }
  // One object, two ids: the clinic forms read the same patient.
  expect(getVariablePresets("clinic-visit")).toBe(getVariablePresets("encounter-note"));
});

for (const id of PERSONALIZED) {
  test(`${id}: every preset validates, and every key carries the prefix once`, () => {
    const source = getVariablePresets(id)!;
    const companion = new SurveyVariablePresets(source);
    const names = companion.getVariableNames();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name.startsWith(USER_PREFIX)).toBe(true);
      expect(name.startsWith(USER_PREFIX + USER_PREFIX)).toBe(false);
    }
    for (const preset of source.presets!) {
      expect(preset.description).toBeTruthy();
      const verdict = companion.validateVariables(preset.variables);
      expect(verdict.isValid, `${preset.name}: ${JSON.stringify(verdict)}`).toBe(true);
    }
    companion.dispose();
  });

  test(`${id}: the shipped definition is clean with its presets, and not without them`, () => {
    const json = FORMS.find((form) => form.id === id)!.json as Record<string, unknown>;
    expect(lintSurveyJson(json, { variablePresets: getVariablePresets(id) }).findings).toEqual([]);
    expect(lintSurveyJson(json).ok).toBe(false);
  });
}

test("toVariables and fromVariables are inverses, and drop what is not the user's", () => {
  const account = { firstName: "Maria", conditions: ["asthma"] };
  expect(toVariables(account)).toEqual({ user_firstName: "Maria", user_conditions: ["asthma"] });
  expect(fromVariables({ ...toVariables(account), locale: "es" })).toEqual(account);
});

test("the patient definition is the patient record, renamed", () => {
  const definition = toVariableDefinition(patientRecordJson);
  const record = new Model(patientRecordJson);
  const model = new Model(definition);

  // Every question prefixed, none lost, in the same order.
  expect(model.getAllQuestions().map((question) => question.name)).toEqual(
    record.getAllQuestions().map((question) => `${USER_PREFIX}${question.name}`),
  );
  // No reference to an unprefixed question is left, and the renamed ones were rewritten.
  const recordNames = record.getAllQuestions().map((question) => question.name);
  const text = JSON.stringify(definition);
  for (const name of recordNames) expect(text).not.toContain(`{${name}}`);
  expect(text).toContain("{user_policyholder} = 'other'");
  // What is below a question keeps its name: a matrix column is no variable.
  const columns = (json: unknown) =>
    [...JSON.stringify(json).matchAll(/"columns":\[(.*?)\]/g)].map((match) => match[1]);
  expect(columns(definition)).toEqual(columns(patientRecordJson));
  // The survey's own settings survive.
  expect(definition.title).toBe(patientRecordJson.title);
  expect(definition.showQuestionNumbers).toBe(patientRecordJson.showQuestionNumbers);
  // The input is not touched.
  expect(record.getAllQuestions()[0].name.startsWith(USER_PREFIX)).toBe(false);
});

test("the presets are the people the pages sign in as", () => {
  expect(getVariablePresets("leads")!.presets!.map((preset) => preset.name)).toEqual(
    LEADS_USERS.map((user) => user.name),
  );
  expect(getVariablePresets("leads")!.presets!.map((preset) => preset.variables)).toEqual(
    LEADS_USERS.map((user) => toVariables(user)),
  );
  expect(getVariablePresets("clinic-visit")!.presets!.map((preset) => preset.variables)).toEqual(
    CLINIC_PATIENTS.map((patient) => toVariables(patient.data)),
  );
  expect(getVariableNames(getVariablePresets("leads"))).toEqual([
    "user_id",
    "user_name",
    "user_role",
    "user_currency",
  ]);
});

test("a label is a calculated value of the form, follows the variable and stays out of the data", () => {
  const [alex, priya] = getVariablePresets("customer-satisfaction")!.presets!;
  const title = (variables: Record<string, unknown>) => {
    const model = createSurveyModel(customerSatisfactionJson, { variables });
    return { model, note: model.getQuestionByName("accountNote").locHtml.renderedHtml };
  };
  expect(title(alex.variables).note).toContain("Business plan");
  expect(title(priya.variables).note).toContain("Free plan");

  const { model } = title(alex.variables);
  model.setVariable("user_plan", "enterprise");
  expect(model.getQuestionByName("accountNote").locHtml.renderedHtml).toContain("Enterprise plan");
  expect(model.data).not.toHaveProperty("planLabel");
});

test("a preset finding has a path outside the document, and the editor gives it no line", () => {
  const presets = structuredClone(getVariablePresets("leads")!);
  presets.presets![1].variables.user_role = "intern";
  const json = FORMS.find((form) => form.id === "leads")!.json as Record<string, unknown>;
  const [finding] = lintSurveyJson(json, { variablePresets: presets }).findings;
  expect(finding.ruleId).toBe("variable/preset");
  expect(finding.path).toBe("variablePresets.presets[1].variables.user_role");
  expect(locatePath(buildPathIndex(JSON.stringify(json, null, 2)), finding.path)).toBeNull();
});
