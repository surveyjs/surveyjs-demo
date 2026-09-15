import { test, expect } from "@playwright/test";
import { Serializer } from "survey-core";
import { lintSurveyJson } from "../src/lib/lint/lint-survey";
import { createSurveyModel } from "../src/schemas/createSurveyModel";
import "../src/schemas/custom-properties";

/**
 * `aiHint` is a registered property on the survey and on questions, the two
 * places the extractor reads it. Helpers only, no page; both editions run it.
 */

test("a hint on the survey, a question and a matrix lints clean with nothing suppressed", () => {
  const verdict = lintSurveyJson({
    aiHint: "The whole document.",
    pages: [
      {
        name: "page1",
        elements: [
          { type: "text", name: "name", aiHint: "The NAME box." },
          {
            type: "matrixdynamic",
            name: "lines",
            aiHint: "The table.",
            columns: [{ name: "item", cellType: "text" }],
          },
        ],
      },
    ],
  });
  expect(verdict.findings).toEqual([]);
  expect(verdict.suppressedCount).toBe(0);
});

test("a hint on a panel or a page is reported, because the extractor never reads it there", () => {
  const verdict = lintSurveyJson({
    pages: [
      {
        name: "page1",
        aiHint: "Nobody reads this.",
        elements: [
          {
            type: "panel",
            name: "group",
            aiHint: "Nor this.",
            elements: [{ type: "text", name: "name" }],
          },
        ],
      },
    ],
  });
  const unknown = verdict.findings.filter((finding) => finding.ruleId === "property/unknown");
  expect(unknown.map((finding) => finding.path).sort()).toEqual(
    ["pages[0].aiHint", "pages[0].elements[0].aiHint"].sort(),
  );
  expect(verdict.suppressedCount).toBe(0);
});

test("a model keeps the hints when it serializes", () => {
  const model = createSurveyModel({
    aiHint: "Survey hint",
    elements: [
      { type: "text", name: "name", aiHint: "Question hint" },
      { type: "matrixdynamic", name: "lines", columns: [{ name: "item", cellType: "text", aiHint: "Column hint" }] },
    ],
  });
  const json = model.toJSON() as {
    aiHint?: string;
    pages: { elements: { aiHint?: string; columns?: Record<string, unknown>[] }[] }[];
  };
  expect(json.aiHint).toBe("Survey hint");
  expect(json.pages[0].elements[0].aiHint).toBe("Question hint");
  // A column takes its cell question's properties, but serializes no hint.
  expect(json.pages[0].elements[1].columns?.[0]).not.toHaveProperty("aiHint");
});

test("the property sits under Description, and is a plain string", () => {
  for (const className of ["survey", "question"]) {
    const property = Serializer.findProperty(className, "aiHint");
    expect(property, className).toBeTruthy();
    expect(property.nextToProperty).toBe("description");
    expect(property.isLocalizable).toBe(false);
    expect(property.type).toBe("text");
  }
  expect(Serializer.findProperty("panel", "aiHint")).toBeFalsy();
  expect(Serializer.findProperty("page", "aiHint")).toBeFalsy();
});
