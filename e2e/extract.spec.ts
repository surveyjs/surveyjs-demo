import { test, expect } from "@playwright/test";

/**
 * The paper way into the claims records: a PDF or a scan of a CMS-1500 goes to
 * `/api/extract`, and the answers come back keyed by question name.
 *
 * These tests deliberately never reach an LLM — the endpoint is asserted on the
 * input it rejects, so the suite costs nothing and needs no key.
 */

test("the claims page offers both sample documents and an upload", async ({
  page,
}) => {
  await page.goto("/claims");

  await expect(
    page.getByRole("button", { name: "Add from PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add from scan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add from your document" }),
  ).toBeVisible();
  await expect(page.getByText(/Supported formats: PDF, PNG, JPG, WEBP/)).toBeVisible();

  // The thumbnail opens the page full size, and the original is downloadable
  // from there - it ships with the template rather than being fetched.
  await page
    .getByRole("button", { name: "Open Office visit and EKG (Digital PDF) full size" })
    .click();
  await expect(
    page.getByRole("link", { name: "Download original" }),
  ).toHaveAttribute("href", "/samples/cms-1500-filled.pdf");
  await page.keyboard.press("Escape");

  for (const file of [
    "/samples/cms-1500-filled.pdf",
    "/samples/cms-1500-therapy-scan.jpg",
  ]) {
    expect((await page.request.get(file)).status()).toBe(200);
  }
});

test("the starter form is a plain form, with no extraction on it", async ({ page }) => {
  await page.goto("/starter");

  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add from/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add from your document" }),
  ).toHaveCount(0);
});

test("the extract endpoint rejects a request with no document", async ({ request }) => {
  const response = await request.post("/api/extract", {
    multipart: { formId: "insurance-claim" },
  });

  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("No document");
});

test("a document adds a filled draft to the list and opens it", async ({ page }) => {
  // The endpoint is stubbed, so the round trip is asserted without an LLM: what
  // matters here is what the page does with the answers, including the nulls a
  // model returns for the boxes left blank on the paper.
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          claimNumber: null,
          status: null,
          patientFirstName: "Margaret",
          patientLastName: "Chen",
          totalCharge: 248,
        },
      }),
    }),
  );

  await page.goto("/claims");
  await page.getByRole("button", { name: "Add from PDF" }).click();

  // In the list as a draft, selected, and open for correction - no Save first.
  const row = page.getByRole("row", { name: /Margaret Chen/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("draft");
  await expect(page.getByRole("heading", { name: /Edit CLM-/ })).toBeVisible();
  // Twice: the record header and the form footer both say it now.
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(2);
});
