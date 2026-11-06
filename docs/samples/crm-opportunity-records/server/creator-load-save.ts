// Larkspur CRM — CRM Opportunity Records: Load and Save Form JSON Schemas (server)
// https://surveyjs.io/documentation/crm-opportunity-records#load-and-save-form-json-schemas

// #region sjs:crm.creator-load-save.server
// PUT /api/storage/definitions/leads — body { json }
// 204 empty, or 422 { error, check: "lint" | "tests", first, count }
const verdict = await checkDefinition("leads", json);
if (!verdict.ok && verdict.first) {
  return Response.json(
    { error: refusalMessage(NOT_SAVED, verdict.first, verdict.count), check: verdict.check, first: verdict.first, count: verdict.count },
    { status: 422 },
  );
}
await store.putDefinition("leads", json);
return new Response(null, { status: 204 });
// #endregion
