# The CMS-1500 claim, archived

Until September 2026, the Documents page was `/claims`: a US health insurance claim (CMS-1500, 02/12) as a records page, with AI extraction from a PDF or a scan and a printer back onto the paper form. It was replaced by `/work-orders`, a field service job sheet that reads in any country.

Nothing about it is deleted. It is kept for two reasons:

- a **Healthcare / insurance** industry example, when the demo grows one;
- a **second extractor sample**, with a dense, standardized form that shows what `aiHint` can do with checkbox geometry and numbered boxes.

It stays under `src/`, so `next build` still type-checks it, and nothing outside this folder imports it.

## What is here

| File | What it was |
|---|---|
| `insurance-claim.ts` | The definition, `insuranceClaimJson` and `insuranceClaimSchema`, with an `aiHint` per box |
| `insurance-claim-seed.ts` | The seed claims |
| `collection.ts` | `claimsCollection`, the records page's collection (storage id `claims`) |
| `cms1500-pdf.ts` | `exportClaimToCms1500`, the printer: a hand-measured `[x, y]` table over the blank |
| `sample-documents.ts` | `claimSampleDocuments`, the two extractor sample cards |
| `service-lines.css` | The CSS that widened the eleven-column service-line matrix beside the list |

The assets are in `public/samples/archive/cms-1500/`: the blank, a filled PDF, a scan, and their `previews/`. The paths in the code above already point there. They are hand-made binaries; no script generates them.

## Re-registering it

1. **Schema.** In `src/schemas/index.ts`:

   ```ts
   export { insuranceClaimJson, insuranceClaimSchema } from "@/archive/insurance-claim/insurance-claim";
   import { insuranceClaimSchema } from "@/archive/insurance-claim/insurance-claim";
   // in schemaRegistry:
   [insuranceClaimSchema.id]: insuranceClaimSchema,
   ```

2. **Collection.** In `src/schemas/records.ts`:

   ```ts
   import { claimsCollection } from "@/archive/insurance-claim/collection";
   // in recordCollections:
   [claimsCollection.id]: claimsCollection,
   ```

   It has no `fromDocument`, so `createFrom` keeps the old precedence: `newRecord` wins over every extracted answer.

3. **Navigation.** In `src/schemas/navigation.ts`, add `"claims"` to `NavId` and this row to a group, and `claims: FileScanIcon` to `ICONS` in `src/components/Sidebar.tsx`:

   ```ts
   {
     id: "claims",
     label: "Claims",
     path: "/claims",
     description: "CMS-1500: scans into records with AI, and back onto the sheet as PDF.",
     schemaId: "insurance-claim",
     layout: "shell",
   },
   ```

   Then remove the `/claims` and `/claims/configure` redirects from `next.config.mjs` and from the `legacy redirects` block of `e2e/sidebar.spec.ts`.

4. **Editor.** In `src/components/configure/forms.ts`:

   ```ts
   form("insurance-claim", "../archive/insurance-claim/insurance-claim.ts", {
     label: "Claim record",
     hint: "The editor behind every row on the Claims page.",
     href: "/claims",
     previewLabel: "Save and quit",
     embedded: false,
   }),
   ```

5. **The pages.** `src/app/(shell)/claims/page.tsx`, `claims/[id]/page.tsx` and `claims/from-document/page.tsx`, like the three under `work-orders/`, rendering a view that passes:

   ```tsx
   <RecordsView
     collectionId="claims"
     basePath="/claims"
     exportPdf={(data) => exportClaimToCms1500(data)}
     documentImport={{
       label: "Add from document",
       segment: "from-document",
       render: ({ createFrom, onBusyChange }) => (
         <ExtractFromDocument
           formId="insurance-claim"
           noun="claim"
           documentName="CMS-1500"
           samples={claimSampleDocuments}
           onExtracted={createFrom}
           onBusyChange={onBusyChange}
         />
       ),
     }}
     {...rest}
   />
   ```

   The collection's `rail` shows the patient, then the claim number and status.

6. **CSS.** Copy the rules in `service-lines.css` back into `src/styles/survey-overrides-shadcn.css`. They were written for a form beside the old table at `lg`; beside the rail, from `xl`, check whether the service-line matrix still needs them.

7. **Panel.** Add `claims` to `HOW_BUILT` in `src/lib/how-built.ts`, and `insurance-claim` back to the lint-clean list in `e2e/configure.spec.ts`.
