export interface LintMutation {
  readonly id: string;
  readonly label: string;
  /** What the fault is, shown next to the button. */
  readonly effect: string;
  /** Returns the mutated survey JSON, or null when this schema has no suitable site. */
  readonly apply: (json: SurveyJsonObject) => SurveyJsonObject | null;
}

type SurveyJsonObject = Record<string, unknown>;
type ElementJson = Record<string, unknown> & { name?: unknown; type?: unknown };

const clone = (json: SurveyJsonObject): SurveyJsonObject =>
  JSON.parse(JSON.stringify(json)) as SurveyJsonObject;

/** Every object that carries both a name and a type — questions and panels alike. */
function elements(json: SurveyJsonObject): ElementJson[] {
  const found: ElementJson[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as ElementJson;
    if (typeof record.name === "string" && typeof record.type === "string") {
      found.push(record);
    }
    Object.values(record).forEach(walk);
  };
  walk(json.pages ?? json);
  return found;
}

const named = (json: SurveyJsonObject, name: string) =>
  elements(json).find((element) => element.name === name);

function unusedName(json: SurveyJsonObject, base: string): string {
  let candidate = base;
  let suffix = 2;
  while (named(json, candidate)) candidate = `${base}${suffix++}`;
  return candidate;
}

export const lintMutations: readonly LintMutation[] = [
  {
    id: "rename-referenced",
    label: "Rename a referenced question",
    effect: "a condition keeps pointing at the old name",
    apply: (source) => {
      const json = clone(source);
      for (const element of elements(json)) {
        const condition = element.visibleIf;
        if (typeof condition !== "string") continue;
        const referenced = /\{([A-Za-z_][\w]*)\}/.exec(condition)?.[1];
        if (!referenced) continue;
        const target = named(json, referenced);
        if (!target) continue;
        target.name = unusedName(json, `${referenced}Renamed`);
        return json;
      }
      return null;
    },
  },
  {
    id: "break-expression",
    label: "Break an expression",
    effect: "a condition references a question that does not exist",
    apply: (source) => {
      const json = clone(source);
      const site =
        elements(json).find((element) => typeof element.visibleIf === "string") ??
        elements(json)[0];
      if (!site) return null;
      site.visibleIf = "{noSuchQuestion} = 'yes'";
      return json;
    },
  },
  {
    id: "self-visibility",
    label: "Self-referencing visibility",
    effect: "a question is hidden by its own answer, which clears it again",
    apply: (source) => {
      const json = clone(source);
      const site =
        elements(json).find(
          (element) => !element.visibleIf && typeof element.name === "string",
        ) ?? elements(json)[0];
      if (!site || typeof site.name !== "string") return null;
      site.visibleIf = `{${site.name}} notempty`;
      return json;
    },
  },
  {
    id: "dead-choices-source",
    label: "Invalid choices source",
    effect: "a question copies its choices from a question that does not exist",
    apply: (source) => {
      const json = clone(source);
      const site = elements(json).find(
        (element) =>
          Array.isArray(element.choices) ||
          element.type === "dropdown" ||
          element.type === "radiogroup" ||
          element.type === "checkbox",
      );
      if (!site) return null;
      delete site.choices;
      site.choicesFromQuestion = "noSuchQuestion";
      return json;
    },
  },
];
