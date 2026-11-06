// Larkspur CRM — CRM Opportunity Records: Validate Responses (server)
// https://surveyjs.io/documentation/crm-opportunity-records#validate-responses

// #region sjs:crm.validate-response.server
// The visitor's own schema: a choice they added in Creator is legal here.
const definition = await definitionFor("leads");
const verdict = await checkResponse(definition, document, {
  variables,             // from the session, not from the body
  requireComplete: true, // a lead is not a draft; every required question must pass
});
if (!verdict.ok && verdict.first) {
  return Response.json(
    {
      error: refusalMessage(NOT_STORED, verdict.first, verdict.count),
      check: "response",
      first: verdict.first,
      count: verdict.count,
    },
    { status: 422 },
  );
}
// #endregion
