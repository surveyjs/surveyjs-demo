// Ridgeline Family Health — Appointment Request Form: Load and Save Form JSON Schemas (server)
// https://surveyjs.io/documentation/appointment-request#load-and-save-form-json-schemas

// #region sjs:appointment-request.creator-load-save.server
// PUT /api/storage/definitions/clinic-visit — body { json }
// 204 empty, or 422 { error, check: "lint" | "tests", first, count }
const verdict = await checkDefinition("clinic-visit", json);
if (!verdict.ok && verdict.first) {
  return Response.json(
    { error: refusalMessage(NOT_SAVED, verdict.first, verdict.count), check: verdict.check, first: verdict.first, count: verdict.count },
    { status: 422 },
  );
}
await store.putDefinition("clinic-visit", json);
return new Response(null, { status: 204 });
// #endregion
