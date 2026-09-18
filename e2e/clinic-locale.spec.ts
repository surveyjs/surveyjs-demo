import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  chartLocale,
  formatDollars,
  getSchemaDefinition,
  schemaRegistry,
  visitSummaryFor,
} from "../src/schemas";

/**
 * `/embedded/clinic` in two languages.
 *
 * The page opens in the language the patient's chart asks for, and everything on
 * it follows: the form from its own definition, the site around it from
 * `ridgeline-strings.ts`, survey-core's own buttons from its Spanish pack. The
 * tests below are about the seams — a string that stayed English, an answer lost
 * to a language switch, an override that outlived the patient it belonged to.
 *
 * The last two run without a browser at all.
 */

/**
 * The switch in the header. Its group is labelled in whichever language the page
 * is currently in, so the buttons — "EN" and "ES" in both — are what a test can
 * name without knowing where it started.
 */
function pressLocale(page: Page, locale: "EN" | "ES") {
  return page.getByRole("button", { name: locale, exact: true }).first().click();
}

function dockOf(page: Page) {
  return page.getByRole("toolbar", { name: "Embedded demo tools" });
}

/**
 * Sign in as somebody else through the toolbar's picker — and leave the dock
 * settled, so the next call can open the menu again.
 *
 * Picking a patient has a tail. The record is applied a debounce later, the
 * survey is remounted around it, and only then does the menu hand focus back to
 * the trigger it came from — about a fifth of a second after the click. A second
 * `loginAs` that opens the menu inside that window catches the restore in the
 * middle of it: focus lands on the trigger, the menu dismisses on focus-outside,
 * and the item detaches while Playwright is still clicking it.
 *
 * Waiting for the focus to come home is waiting for exactly that tail, so this
 * needs no clock of its own. The trigger is named for whoever is signed in, so
 * `next` also names it once the switch has taken.
 */
async function loginAs(page: Page, current: RegExp, next: RegExp) {
  await dockOf(page).getByRole("button", { name: current }).click();
  await page.getByRole("menuitemradio", { name: next }).click();
  await expect(dockOf(page).getByRole("button", { name: next })).toBeFocused();
}

async function openUserDialog(page: Page) {
  await dockOf(page).getByRole("button", { name: "Edit the user" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".sd-root-modern")).toBeVisible();
  return dialog;
}

/**
 * A dropdown of the popup's editor survey, by variable name — and the check that
 * it actually took.
 *
 * survey-core draws the list in a popup of its own, and the control says whether
 * it is showing: the field is a `combobox`, and `aria-expanded` is the one thing
 * on the page that knows. A click toggles it, so a click on a list that is
 * already open shuts it again — which is why this asks for the state it wants
 * rather than clicking a fixed number of times.
 *
 * Once the list is up, the option is a `role="option"` with the text a person
 * would read, and clicking it is what a person would do. Typing into the field
 * instead would be racing the filter: the keystroke reaches a list that has not
 * finished narrowing, nothing is selected, and the answer silently stays as it
 * was. The chosen value is still read back from the variables the popup prints,
 * so everything after this helper is an assertion about the page, never about
 * whether a dropdown heard us.
 */
async function chooseInEditor(dialog: Locator, name: string, option: string, value: string) {
  const question = dialog.locator(`[data-name="${name}"]`).first();
  const field = question.getByRole("combobox");

  await expect(async () => {
    if ((await field.getAttribute("aria-expanded")) !== "true")
      await question.locator(".sd-dropdown").first().click();
    await expect(field).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  // The popup is the page's, not the dialog's, so it is looked up from the page.
  await dialog.page().getByRole("option", { name: option, exact: true }).click();
  await expect(dialog.locator("pre")).toContainText(`"${name}": "${value}"`, { timeout: 5_000 });
}

test("the switch keeps the answers and re-derives the summary in the other language", async ({
  page,
}) => {
  test.slow();
  await page.goto("/embedded/clinic");
  await dockOf(page).getByRole("button", { name: "Prefill" }).click();

  const spanishPanel = page.getByRole("complementary", { name: "Su visita" });
  const englishPanel = page.getByRole("complementary", { name: "Your visit" });
  const card = page.locator("#request");

  // Behavioral health on an HMO: the specialist copay, the referral warning, and
  // a what-to-bring list that knows both.
  await expect(spanishPanel).toContainText("$35");
  await expect(spanishPanel).toContainText("Su copago de Blue Harbor HMO");
  await expect(spanishPanel).toContainText("exige un referido");
  await expect(spanishPanel).toContainText("Una identificación con foto");
  await expect(spanishPanel).toContainText("Su tarjeta del seguro");
  // Two days, joined the way Spanish joins them.
  await expect(spanishPanel).toContainText("martes o jueves");

  await pressLocale(page, "EN");

  // The same answers: the model was never rebuilt.
  await expect(englishPanel).toContainText("$35");
  await expect(englishPanel).toContainText("Your Blue Harbor HMO copay");
  await expect(englishPanel).toContainText("needs a referral");
  await expect(englishPanel).toContainText("A photo ID");
  await expect(englishPanel).toContainText("Tuesday or Thursday");
  await expect(card).toContainText("Behavioral health");

  // Walk to the coverage page and pay for it herself instead.
  for (let step = 0; step < 3; step += 1) {
    await card.getByRole("button", { name: "Next" }).click();
  }
  await card.getByText("Self-pay — I will pay at check-in").click();

  await expect(englishPanel).toContainText("$195");
  await expect(englishPanel).toContainText("Self-pay price");
  await expect(englishPanel).toContainText("A card for payment at check-in");
  await expect(englishPanel).not.toContainText("needs a referral");

  // And back: the Spanish of exactly that state, not of the state before it.
  await pressLocale(page, "ES");
  await expect(spanishPanel).toContainText("$195");
  await expect(spanishPanel).toContainText("Precio de pago directo");
  await expect(spanishPanel).toContainText("Una tarjeta para pagar al registrarse");
  await expect(spanishPanel).not.toContainText("exige un referido");
});

test("the chart wins again whenever the patient or the chart's language changes", async ({
  page,
}) => {
  test.slow();
  await page.goto("/embedded/clinic");
  const banner = page.getByRole("note");
  const card = page.locator("#request");

  // A patient whose chart says English: English, and nothing to explain.
  await loginAs(page, /Login as: Maria Delgado/, /Daniel Okafor/);
  await expect(card).toContainText("Welcome back, Danny");
  await expect(banner).toHaveCount(0);
  // The switch is there for him all the same.
  await pressLocale(page, "ES");
  await expect(card).toContainText("Qué gusto verle de nuevo");
  await expect(banner).toHaveCount(0);

  // Round trip one: an override belongs to the patient it was made for, so
  // coming back to Maria opens her page in her language, not in his.
  await loginAs(page, /Login as: Daniel Okafor/, /Maria Delgado/);
  await expect(card).toContainText("Qué gusto verle de nuevo");
  await expect(banner).toContainText("por eso este formulario se abrió en español");
  await expect(banner).not.toContainText("usted cambió");

  // Round trip two: the same must hold when it is the chart that moves.
  await pressLocale(page, "EN");
  await expect(card).toContainText("Welcome back, Maria");
  await expect(banner).toContainText("you switched this form to English");

  const dialog = await openUserDialog(page);
  await chooseInEditor(dialog, "user_preferredLanguage", "English", "en");
  // The page is rendered from the chart after a 400 ms debounce.
  await expect(banner).toHaveCount(0);
  await expect(card).toContainText("Welcome back, Maria");

  await chooseInEditor(dialog, "user_preferredLanguage", "Spanish", "es");
  await expect(card).toContainText("Qué gusto verle de nuevo");
  await expect(page.getByRole("note")).toContainText(
    "por eso este formulario se abrió en español",
  );

  // The popup is the reviewer's tool, so it stays English on a Spanish page —
  // and it says which locale the chart chose.
  await expect(dialog).toHaveAttribute("lang", "en");
  await expect(dialog).toContainText("user_preferredLanguage");
  await expect(dialog).toContainText("es → es");
});

test("a chart in a language this demo does not have opens in English, and says nothing", async ({
  page,
}) => {
  test.slow();
  await page.goto("/embedded/clinic");
  const dialog = await openUserDialog(page);
  await chooseInEditor(dialog, "user_preferredLanguage", "Vietnamese", "vi");

  await expect(page.locator("#request")).toContainText("Welcome back, Maria");
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(dialog).toContainText("vi → en (no translation yet)");
});

test("the reviewer's own tools stay English, and the sign-in fallback does not", async ({
  page,
}) => {
  test.slow();
  await page.goto("/embedded/clinic");

  // The switch names itself in the language of the page it is on.
  await expect(page.getByRole("group", { name: "Idioma de la página" }).first()).toBeVisible();

  // Spanish page, English tools — each saying so to a screen reader.
  await expect(dockOf(page)).toHaveAttribute("lang", "en");
  const outlineLabel = page.locator("[data-survey-outline-label]").first();
  await expect(outlineLabel).toHaveAttribute("lang", "en");
  await expect(outlineLabel).toContainText("SurveyJS renders this");

  // The chip is the clinic's own, so it speaks to the patient.
  const dialog = await openUserDialog(page);
  for (const field of ["user_firstName", "user_lastName", "user_preferredName"]) {
    const input = dialog.locator(`[data-name="${field}"] input`).first();
    await input.fill("");
    await input.press("Tab");
  }
  await expect(page.locator("header").first()).toContainText("Iniciar sesión");
});

test("the form and the whole panel are above the fold at 1440×900", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/embedded/clinic");

  const panel = page.getByRole("complementary", { name: "Su visita" });
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);

  // The form's first page is taller than any viewport, so what has to be in view
  // is its top: the title, the progress bar and the first question.
  const firstQuestion = page.locator('[data-name="visitReason"]').first();
  const questionBox = await firstQuestion.boundingBox();
  expect(questionBox).not.toBeNull();
  expect(questionBox!.y).toBeLessThan(900);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // The sections that existed only to be scrolled past are gone.
  for (const heading of [
    "What we do here",
    "Our clinicians",
    "Offices and hours",
    "Insurance we take",
    "New here?",
  ]) {
    await expect(page.getByText(heading, { exact: true })).toHaveCount(0);
  }
});

/* ── no browser ─────────────────────────────────────────────────────────────── */

test("no shipped definition carries a localized object where a string belongs", () => {
  for (const [id, schema] of Object.entries(schemaRegistry)) {
    expect(JSON.stringify(schema.json), `${id} renders a localized object into a string`).not.toContain(
      "[object Object]",
    );
  }
});

test("the encounter note reads the shared lists in English", () => {
  const json = getSchemaDefinition("encounter-note").json as Record<string, unknown>;
  const choices: unknown[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "choices" && Array.isArray(value)) choices.push(...value);
      walk(value);
    }
  };
  walk(json);

  // Not one `text` in the clinician's form is a `{ default, es }` object.
  for (const choice of choices) {
    if (choice && typeof choice === "object" && "text" in choice) {
      expect(typeof (choice as { text: unknown }).text).toBe("string");
    }
  }
  expect(
    choices.some(
      (choice) =>
        typeof choice === "object" &&
        choice !== null &&
        (choice as { value?: unknown }).value === "navarro" &&
        (choice as { text?: unknown }).text === "Alicia Navarro, MD — Family medicine",
    ),
  ).toBe(true);
});

test("the chart picks the locale, and dollars look American in both", () => {
  expect(chartLocale("es")).toBe("es");
  expect(chartLocale("en")).toBe("en");
  // No translation exists for these, and half a translation is worse than none.
  expect(chartLocale("vi")).toBe("en");
  expect(chartLocale("ru")).toBe("en");
  expect(chartLocale("zh")).toBe("en");
  expect(chartLocale(undefined)).toBe("en");

  // `es-US` formats dollars the American way. If a runtime ever disagrees, the
  // panel would say "35 US$" to a patient standing in Portland.
  expect(formatDollars(35, "es")).toBe("$35");
  expect(formatDollars(195, "en")).toBe("$195");
  expect(formatDollars(0, "es")).toBe("$0");

  // And the summary is derived in the language it is asked for.
  const data = {
    visitReason: "behavioral",
    coverage: "insurance",
    healthPlan: "blueharbor",
    preferredDays: ["Tuesday", "Thursday"],
    preferredTime: "afternoon",
  };
  expect(visitSummaryFor(data, "es").whenText).toContain("martes o jueves");
  expect(visitSummaryFor(data, "en").whenText).toContain("Tuesday or Thursday");
  expect(visitSummaryFor(data, "es").estimateLabel).toContain("Blue Harbor HMO");
  expect(visitSummaryFor(data, "es").bring[0]).toBe("Una identificación con foto");
  expect(visitSummaryFor({}, "es").estimateLabel).toContain("Elija un motivo");
});
