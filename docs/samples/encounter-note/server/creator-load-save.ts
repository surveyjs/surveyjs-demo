// Ridgeline Chart — Clinical Encounter Note: Load and Save Form JSON Schemas (server)
// https://surveyjs.io/documentation/encounter-note#load-and-save-form-json-schemas

// #region sjs:encounter-note.creator-load-save.server
// PUT /api/storage/definitions/encounter-note — body { json }
// 204 empty, or 422 { error, check: "lint" | "tests", first, count }
const verdict = await checkDefinition("encounter-note", json);
if (!verdict.ok && verdict.first) {
  return Response.json(
    { error: refusalMessage(NOT_SAVED, verdict.first, verdict.count), check: verdict.check, first: verdict.first, count: verdict.count },
    { status: 422 },
  );
}
await store.putDefinition("encounter-note", json);
return new Response(null, { status: 204 });
// #endregion
