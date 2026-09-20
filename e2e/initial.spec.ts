import { test, expect } from "@playwright/test";
import { features } from "../src/features";
import { checkoutJson } from "../src/schemas/checkout";
import { navPages } from "../src/schemas/navigation";
import { HOW_INDEX, howHref } from "../src/lib/routes";
import { SHORT_CHECKOUT } from "./short-checkout";
import { startSession } from "./session";

const surveyRoutes = [
  "/leads",
  "/starter",
  "/embedded/feedback",
  "/embedded/chart",
  "/embedded/clinic",
];
const allRoutes = [
  "/",
  ...surveyRoutes,
  "/work-orders",
  // A record's own URL, and the import panel's.
  "/leads/LEAD-0001",
  "/work-orders/WO-2026-0118",
  "/work-orders/from-document",
  "/definition",
  // A page with no form on it, and the full edition's alone.
  ...(features.edition === "full" ? ["/mysurveys"] : []),
  // The one editor, on a plain form and on a personalized one.
  "/configure",
  "/configure?form=clinic-visit",
  // The explainers: the index, and one per example this edition ships. They are
  // all inside the shell, an embedded demo's included.
  HOW_INDEX,
  ...navPages.map((item) => howHref(item.path)),
];

test("root redirects to the first page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page).toHaveTitle(/SurveyJS/i);
});

for (const route of surveyRoutes) {
  test(`${route} is rendered on the server`, async ({ page }) => {
    // Read the raw document — the survey markup must be in the HTML the
    // server sent, before any JavaScript runs.
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(await response!.text()).toContain("sd-root-modern");
    await expect(page.locator(".sd-root-modern").first()).toBeVisible();
  });
}

test("/embedded/chart is the survey and almost nothing else", async ({ page }) => {
  test.slow();
  await page.goto("/embedded/chart");
  const card = page.locator("[data-survey-root]");

  // The note is titled, banner and all, from the chart that is open.
  await expect(card).toContainText("Delgado, Maria");
  await expect(card).toContainText("RFH-04812");

  // Eight pages, listed by the survey's own table of contents — not by the page.
  const toc = card.getByText("Medications", { exact: true }).first();
  await expect(toc).toBeVisible();
  await expect(card.getByText("Assessment & plan", { exact: true }).first()).toBeVisible();

  // An established patient has no new-patient page.
  await expect(card.getByText("New-patient baseline")).toHaveCount(0);

  // A red flag in the prefilled answers escalates the visit — by trigger, and
  // the question it writes to did not exist a moment ago.
  await page
    .getByRole("toolbar", { name: "Embedded demo tools" })
    .getByRole("button", { name: "Prefill" })
    .click();
  await expect(card.getByText("Escalate to same-day evaluation")).toBeVisible({
    timeout: 15_000,
  });
});

test("opening another chart changes the note's shape", async ({ page }) => {
  test.slow();
  await page.goto("/embedded/chart");
  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });
  const card = page.locator("[data-survey-root]");

  await dock.getByRole("button", { name: /Open chart/ }).click();
  await page.getByRole("menuitemradio", { name: "Priya Raman" }).click();

  // Priya has never been seen here, so a page exists for her and for nobody
  // else — the same definition, a longer note.
  await expect(card).toContainText("Raman, Priya");
  await expect(card.getByText("New-patient baseline").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("/work-orders renders the rail and the SurveyJS editor", async ({ page }) => {
  await page.goto("/work-orders");
  const rail = page.getByRole("navigation", { name: "Work orders", exact: true });
  await expect(rail.getByRole("link").first()).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
});

for (const [route, heading] of [
  ["/leads/LEAD-0003", "View Kestrel Freight"],
  ["/work-orders/WO-2026-0120", "View WO-2026-0120"],
] as const) {
  test(`${route} opens that record in the HTML the server sent`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const html = await response!.text();
    expect(html).toContain("sd-root-modern");
    expect(html).toContain(heading);
  });
}

test("a saved definition is what the server renders, for that visitor only", async ({
  page,
  request,
}) => {
  // Full page loads plus the editor's heavy dynamic import; against `next dev`,
  // where each route compiles on first request, the default budget is too tight.
  test.slow();

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      errors.push(message.text());
    }
  });

  // What the editor writes when somebody saves this form — the storage route is
  // the contract, so the round trip can be asserted without driving whichever
  // editor the edition ships (configure.spec.ts drives the JSON one).
  // `page.request` shares the browser's cookies, so this is the page's visitor.
  await startSession(page.request);
  // A whole definition, not a fragment: the route runs the form's own linter and
  // its suite before it stores anything, so a fixture has to be valid for the
  // form it claims to be. This is the short checkout with one question added.
  const edited = structuredClone(SHORT_CHECKOUT) as typeof SHORT_CHECKOUT & {
    pages: { elements: unknown[] }[];
  };
  edited.title = "Edited by the e2e test";
  edited.pages[0].elements.unshift({ type: "text", name: "q1", title: "A brand new question" });
  const saved = await page.request.put("/api/storage/definitions/checkout", {
    data: { json: edited },
  });
  expect(saved.status()).toBe(204);

  // The server reads the visitor's definition, so the HTML it sends already
  // has the edit, with no loading state to swap it in.
  const response = await page.goto("/starter");
  const serverHtml = await response!.text();
  expect(serverHtml).toContain("A brand new question");
  expect(serverHtml).not.toContain("Email address");
  await expect(page.getByText("A brand new question")).toBeVisible();

  // Anybody else, a crawler with no cookie among them, still gets the form that ships.
  const anonymous = await request.get("/starter");
  expect(await anonymous.text()).not.toContain("A brand new question");

  // And the editor's Reset puts the shipped definition back. Reset is disabled
  // in the server markup and only enables once the stored definition has been
  // read, which happens after hydration — hence waiting for the editor first.
  await page.goto("/configure?form=checkout");
  await expect(page.locator(features.designer.readySelector).first()).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole("button", { name: "Reset" }).click();
  // Asserted on the route itself: the page check below would also pass if Reset
  // had only changed the editor.
  await expect
    .poll(async () => {
      const stored = await page.request.get("/api/storage/definitions/checkout");
      return ((await stored.json()) as { json: { title?: string } }).json.title;
    })
    .toBe(checkoutJson.title);
  await page.goto("/starter");
  await expect(page.getByText("A brand new question")).toHaveCount(0);
  await expect(page.getByText("Email address").first()).toBeVisible();

  expect(errors).toHaveLength(0);
});

for (const route of allRoutes) {
  test(`no SSR failure or hydration mismatch on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    // Hydration mismatches are reported through console.error, not as an
    // uncaught exception, so pageerror alone never sees them. Warnings count
    // too: React reports plenty of real problems at that level.
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        errors.push(message.text());
      }
    });

    // A full document load: this is the request that runs the server render.
    // Without the status check a failed SSR still looks fine, because React
    // recovers on the client and paints the page anyway.
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
}

/** Opens the toolbar's user popup and waits for the editor survey inside it. */
async function openUserDialog(page: import("@playwright/test").Page) {
  await page
    .getByRole("toolbar", { name: "Embedded demo tools" })
    .getByRole("button", { name: "Edit the user" })
    .click();
  const dialog = page.getByRole("dialog");
  // The editor is a SurveyJS survey — same markup as the demo it drives.
  await expect(dialog.locator(".sd-root-modern")).toBeVisible();
  return dialog;
}

/** One field of the editor survey, by question name. */
function editorField(dialog: import("@playwright/test").Locator, name: string) {
  return dialog.locator(`[data-name="${name}"] input`).first();
}

async function typeInEditor(
  dialog: import("@playwright/test").Locator,
  name: string,
  value: string,
) {
  const field = editorField(dialog, name);
  await field.fill(value);
  // survey-core commits a text answer on blur by default.
  await field.press("Tab");
}

test("/embedded/feedback renders the same definition differently per user", async ({
  page,
}) => {
  test.slow();
  await page.goto("/embedded/feedback");
  const card = page.locator("#feedback");

  // The host page and the survey are reading the same account object.
  await expect(page.locator("header").first()).toContainText("Alex Rivera");
  await expect(card).toContainText("Hi Alex, how are we doing?");
  await expect(card).toContainText("Business plan");

  // `usagePeriod` was never asked: it is derived from the account's monthsActive
  // by a defaultValueExpression, and 14 months is more than a year.
  await expect(card).toContainText("More than a year");

  // Alex has an open ticket, so the Support step exists; Alex is not new, so the
  // onboarding step does not. Both are whole pages, so this reads the progress
  // bar — matched with its step number, because "Support" is also a row in the
  // ratings matrix on the page below.
  await expect(card).toContainText(/What matters\s*2\s*Support\s*3/);
  await expect(card).not.toContainText("Getting started");

  const dialog = await openUserDialog(page);
  await typeInEditor(dialog, "user_firstName", "John");
  await typeInEditor(dialog, "user_monthsActive", "1");

  // The popup shows the object the survey is actually handed.
  await expect(dialog.locator("pre")).toContainText('"user_firstName": "John"');

  // Same JSON definition, a different user: a new greeting, a re-derived tenure,
  // and a step that did not exist before.
  await expect(card).toContainText("Hi John, how are we doing?");
  // One month re-derives usagePeriod through the second branch of the iif chain.
  await expect(card).toContainText("One to six months");
  await expect(card).toContainText(/Getting started\s*2/);
  await expect(page.locator("header").first()).toContainText("John Rivera");
});

test("the demo toolbar links to the one editor", async ({ page }) => {
  await page.goto("/embedded/feedback");
  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });

  // No editor in the host page: every form in the template is edited on one
  // page, and this link opens it on this form.
  await expect(dock.getByRole("link", { name: features.designer.label })).toHaveAttribute(
    "href",
    "/configure?form=customer-satisfaction",
  );

  // The user, on the other hand, is right here — one popup, one survey.
  const dialog = await openUserDialog(page);
  await expect(dialog).toContainText("The signed-in user");
  await expect(dialog).toContainText("See what the JSON does with it");
});

test("Login as renders the same definition for a different customer", async ({ page }) => {
  test.slow();
  await page.goto("/embedded/feedback");
  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });
  const card = page.locator("#feedback");

  // The demo opens as the first preset account: fourteen months in, a ticket
  // open, so a Support step and no onboarding.
  await expect(card).toContainText("Hi Alex, how are we doing?");
  await expect(card).toContainText(/What matters\s*2\s*Support\s*3/);
  await expect(card).not.toContainText("Getting started");

  await dock.getByRole("button", { name: /Login as: Alex Rivera/ }).click();
  await page.getByRole("menuitemradio", { name: /Priya Shah/ }).click();

  // Three weeks old, on Free, no ticket: the same JSON now greets somebody else,
  // derives a different tenure and grows a step that did not exist.
  await expect(card).toContainText("Hi Priya, how are we doing?");
  await expect(card).toContainText("One to six months");
  await expect(card).toContainText(/Getting started\s*2/);
  await expect(card).not.toContainText(/Support\s*3/);
  await expect(page.locator("header").first()).toContainText("Priya Shah");
});

test("the demo links home and outlines where SurveyJS draws", async ({ page }) => {
  await page.goto("/embedded/chart");
  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });

  await expect(dock.getByRole("link", { name: "SurveyJS demos" })).toHaveAttribute(
    "href",
    "/",
  );

  // The attribute goes on <html> for as long as the demo is on screen; what
  // matters is that the rule it keys reaches the one element marking where
  // SurveyJS draws, and that nobody has to press anything for it.
  await expect(page.locator("html")).toHaveAttribute("data-demo-highlight", "");
  await expect(page.locator("[data-survey-root]")).toHaveCSS("outline-style", "dashed");
});

test("/embedded/clinic opens in the chart's language and fills the request from it", async ({
  page,
}) => {
  test.slow();
  // Maria Delgado's chart says `preferredLanguage: "es"`, so the page — the form
  // and the site around it — is Spanish before any JavaScript runs.
  const response = await page.goto("/embedded/clinic");
  const serverHtml = await response!.text();
  // Both languages travel to the browser — the definition is a prop, so the
  // whole of it is in the payload. What proves the server *rendered* Spanish is
  // the markup only rendering produces: the greeting, the panel's label, and
  // survey-core's own next button.
  expect(serverHtml).toContain("Qué gusto verle de nuevo");
  expect(serverHtml).toContain('aria-label="Su visita"');
  expect(serverHtml).toContain("Siguiente");

  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });
  const panel = page.getByRole("complementary", { name: "Su visita" });
  const card = page.locator("#request");

  await expect(card).toContainText("Qué gusto verle de nuevo");
  await expect(card).toContainText("Maria");
  await expect(card).not.toContainText("Welcome back");
  // survey-core's own strings are Spanish too, from `survey-core/i18n/spanish`.
  await expect(card.getByRole("button", { name: "Siguiente" })).toBeVisible();

  // The banner says why, in both languages, the page's own first.
  const banner = page.getByRole("note");
  await expect(banner).toContainText(
    "El idioma preferido de Maria es el español, por eso este formulario se abrió en español.",
  );
  await expect(banner).toContainText("Maria's preferred language is Spanish");

  // Nothing has been answered, and the summary is already populated: the office,
  // the clinician and the coverage came from the portal record.
  await expect(panel).not.toContainText("Responda la primera pregunta");
  await expect(panel).toContainText("Westbridge");
  await expect(panel).toContainText("Alicia Navarro, MD");

  // Her chart has asthma and hypertension on it, so a question exists that a new
  // patient never sees — asked in her language.
  await expect(card).toContainText("¿Es por algo que ya le tratamos?");

  await dock.getByRole("button", { name: "Prefill" }).click();

  // Behavioral health bills at the specialist copay, and the plan on file is the
  // HMO — so the panel shows $35 and the referral warning rather than the happy
  // path. The plan was never typed in.
  await expect(panel).toContainText("Salud del comportamiento");
  await expect(panel).toContainText("$35");
  await expect(panel).toContainText("exige un referido");

  // The switch moves every string on the page, and the form keeps the answers.
  await page.getByRole("button", { name: "EN", exact: true }).first().click();

  await expect(card).toContainText("Welcome back, Maria");
  await expect(card).toContainText("Is this about something we already treat you for?");
  const englishPanel = page.getByRole("complementary", { name: "Your visit" });
  await expect(englishPanel).toContainText("Behavioral health");
  await expect(englishPanel).toContainText("$35");
  await expect(englishPanel).toContainText("referral");

  // No host string is left behind: header, panel chrome, row labels, footer, and
  // the banner, which now leads with English and says who overruled the chart.
  await expect(page.locator("header").first()).toContainText("Request an appointment");
  await expect(englishPanel).toContainText("Your visit");
  await expect(englishPanel).toContainText("Reason");
  await expect(englishPanel).toContainText("Clinician");
  await expect(englishPanel).toContainText("What to bring");
  await expect(page.locator("footer")).toContainText("fictional clinic");
  await expect(banner.locator("p").first()).toContainText(
    "Maria's preferred language is Spanish — you switched this form to English.",
  );
  // Nothing Spanish is left outside the banner, which keeps both languages.
  const chrome = (await page.locator("header, #request, footer").allInnerTexts()).join(" ");
  for (const spanish of ["Su visita", "Qué gusto verle", "Solicitar una cita", "Qué llevar"]) {
    expect(chrome).not.toContain(spanish);
  }

  // Sign in as the patient who has no chart. Same definition, and the form is
  // the long one: identity to fill in, insurance card fields, an extra page.
  await dock.getByRole("button", { name: /Login as: Maria Delgado/ }).click();
  await page.getByRole("menuitemradio", { name: /Priya Raman/ }).click();

  await expect(card).toContainText("You are new to Ridgeline");
  await expect(card).toContainText("New here");
  await expect(card).not.toContainText("Is this about something we already treat you for?");
  await expect(englishPanel).toContainText("New to Ridgeline");
  // Her chart says English, so there is nothing to explain.
  await expect(page.getByRole("note")).toHaveCount(0);
  // No plan on file, so there is nothing to estimate.
  await expect(englishPanel).not.toContainText("$35");

  // And the popup is where that patient's record is edited, with the object the
  // survey receives shown underneath it.
  const dialog = await openUserDialog(page);
  await expect(dialog).toContainText("The signed-in user");
  await expect(dialog.locator("pre")).toContainText('"user_isNewPatient": true');
  await typeInEditor(dialog, "user_preferredName", "Pri");
  await expect(card).toContainText("You are new to Ridgeline");
  await expect(dialog.locator("pre")).toContainText('"user_preferredName": "Pri"');
});
