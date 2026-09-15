This directory holds the full edition's own implementations, the ones `src/features/index.ts` wires into the shared components.

- `work-order-pdf.ts` — the job sheet printer behind Work orders' "Save as PDF" (`exportWorkOrderPdf`), and `work-order-boxes.ts`, its box table, generated with the blank `public/samples/work-order-blank.pdf` by the shared `npm run assets:work-order`.

The older ones still live at their historical paths: `src/lib/pdf-export.ts`, `src/lib/surveyjs-license.ts`, `src/components/analytics/` and `src/components/configure/CreatorPane.tsx`.
New Full-only code goes here; those files move here in a later change.
