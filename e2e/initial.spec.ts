import { test, expect } from "@playwright/test";
import { features } from "../src/features";

const surveyRoutes = [
  "/starter",
  "/embedded/feedback",
  "/embedded/chart",
  "/embedded/clinic",
];
const allRoutes = [
  "/",
  ...surveyRoutes,
  "/claims",
  "/leads",
  "/definition",
  // The one editor, on a plain form and on a personalized one.
  "/configure",
  "/configure?form=clinic-visit",
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

test("/claims renders the table and the SurveyJS editor", async ({ page }) => {
  await page.goto("/claims");
  await expect(page.getByRole("table").first()).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
});

test("a saved definition is what the pages render, and the server stays canonical", async ({
  page,
}) => {
  // Full page loads plus the editor's heavy dynamic import; against `next dev`,
  // where each route compiles on first request, the default budget is too tight.
  test.slow();

  // The saved definition is applied after hydration, so this is exactly where a
  // mismatch would show up.
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      errors.push(message.text());
    }
  });

  // What the editor writes when somebody saves this form — the storage seam is
  // the contract, so the round trip can be asserted without driving whichever
  // editor the edition ships (configure.spec.ts drives the JSON one).
  //
  // Written once, not with `addInitScript`: an init script runs on every
  // navigation and would put the edit back after Reset below has removed it.
  await page.goto("/starter");
  await page.evaluate(() => {
    localStorage.setItem(
      "sjs-demo-schema:checkout",
      JSON.stringify({
        title: "Edited by the e2e test",
        elements: [{ type: "text", name: "q1", title: "A brand new question" }],
      }),
    );
  });

  await page.goto("/starter");
  await expect(page.getByText("A brand new question")).toBeVisible();

  // The definition lives in localStorage, so a full reload keeps it — while the
  // HTML the server sent stays canonical, which is what search engines get.
  const response = await page.reload();
  const serverHtml = await response!.text();
  expect(serverHtml).not.toContain("A brand new question");
  expect(serverHtml).toContain("Email address");
  await expect(page.getByText("A brand new question")).toBeVisible();

  // And the editor's Reset puts the shipped definition back. Reset is disabled
  // in the server markup and only enables once the saved definition has been
  // read, which happens after hydration — hence waiting for the editor first.
  await page.goto("/configure?form=checkout");
  await expect(page.locator(features.designer.readySelector).first()).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole("button", { name: "Reset" }).click();
  await page.goto("/starter");
  // Asserted on the seam itself: the text check below would also pass in the
  // moment before a saved definition swaps in, so on its own it proves nothing.
  expect(
    await page.evaluate(() => localStorage.getItem("sjs-demo-schema:checkout")),
  ).toBeNull();
  await expect(page.getByText("A brand new question")).toHaveCount(0);
  await expect(page.getByText("Email address").first()).toBeVisible();

  expect(errors).toHaveLength(0);
});

test("the spinner shows only for a visitor with a saved definition", async ({
  page,
}) => {
  await page.goto("/starter");
  // Nothing saved: the server markup stays put, no loading state at all.
  await expect(page.locator('[role="status"]')).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem(
      "sjs-demo-schema:checkout",
      JSON.stringify({
        title: "Saved by the e2e test",
        elements: [{ type: "text", name: "q1", title: "A saved question" }],
      }),
    );
  });

  // Swapping in the saved definition is deferred past a paint on purpose, so
  // the spinner is genuinely drawn rather than collapsed into one frame.
  await page.reload();
  await expect(page.locator('[role="status"]')).toBeVisible();
  await expect(page.getByText("A saved question")).toBeVisible();
  await expect(page.locator('[role="status"]')).toHaveCount(0);
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
  await typeInEditor(dialog, "firstName", "John");
  await typeInEditor(dialog, "monthsActive", "1");

  // The popup shows the object the survey is actually handed.
  await expect(dialog.locator("pre")).toContainText('"firstName": "John"');

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

test("/embedded/clinic fills the request from the patient's chart", async ({ page }) => {
  test.slow();
  await page.goto("/embedded/clinic");
  const dock = page.getByRole("toolbar", { name: "Embedded demo tools" });
  const panel = page.getByRole("complementary", { name: "Your visit" });
  const card = page.locator("#request");

  // Nothing has been answered, and the summary is already populated: the office,
  // the clinician and the coverage came from the portal record.
  await expect(panel).not.toContainText("Answer the first question");
  await expect(panel).toContainText("Westbridge");
  await expect(panel).toContainText("Alicia Navarro, MD");
  await expect(card).toContainText("Welcome back, Maria");

  // Her chart has asthma and hypertension on it, so a question exists that a new
  // patient never sees.
  await expect(card).toContainText("Is this about something we already treat you for?");

  await dock.getByRole("button", { name: "Prefill" }).click();

  // Behavioral health bills at the specialist copay, and the plan on file is the
  // HMO — so the panel shows $35 and the referral warning rather than the happy
  // path. The plan was never typed in.
  await expect(panel).toContainText("Behavioral health");
  await expect(panel).toContainText("$35");
  await expect(panel).toContainText("referral");

  // The directory and the office list mark what the request names.
  await expect(page.locator("#provider-navarro")).toContainText("Requested");
  await expect(page.locator("#location-westbridge")).toContainText("Chosen");

  // Sign in as the patient who has no chart. Same definition, and the form is
  // the long one: identity to fill in, insurance card fields, an extra page.
  await dock.getByRole("button", { name: /Login as: Maria Delgado/ }).click();
  await page.getByRole("menuitemradio", { name: /Priya Raman/ }).click();

  await expect(card).toContainText("You are new to Ridgeline");
  await expect(card).toContainText("New here");
  await expect(card).not.toContainText("Is this about something we already treat you for?");
  await expect(panel).toContainText("New to Ridgeline");
  // No plan on file, so there is nothing to estimate.
  await expect(panel).not.toContainText("$35");

  // And the popup is where that patient's record is edited, with the object the
  // survey receives shown underneath it.
  const dialog = await openUserDialog(page);
  await expect(dialog).toContainText("The signed-in user");
  await expect(dialog.locator("pre")).toContainText('"isNewPatient": true');
  await typeInEditor(dialog, "preferredName", "Pri");
  await expect(card).toContainText("You are new to Ridgeline");
  await expect(dialog.locator("pre")).toContainText('"preferredName": "Pri"');
});
