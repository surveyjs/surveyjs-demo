// Cadence — Customer Satisfaction Survey: Load and Save Form JSON Schemas (server)
// https://surveyjs.io/documentation/feedback#load-and-save-form-json-schemas

// #region sjs:feedback.creator-load-save.server
// PUT /api/storage/definitions/customer-satisfaction — body { json }
// 204 empty, or 422 { error, check: "lint" | "tests", first, count }
const verdict = await checkDefinition("customer-satisfaction", json);
if (!verdict.ok && verdict.first) {
  return Response.json(
    { error: refusalMessage(NOT_SAVED, verdict.first, verdict.count), check: verdict.check, first: verdict.first, count: verdict.count },
    { status: 422 },
  );
}
await store.putDefinition("customer-satisfaction", json);
return new Response(null, { status: 204 });
// #endregion
