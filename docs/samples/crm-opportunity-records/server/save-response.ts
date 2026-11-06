// Larkspur CRM — CRM Opportunity Records: Save Responses (server)
// https://surveyjs.io/documentation/crm-opportunity-records#save-responses

// #region sjs:crm.save-response.server
// PUT /api/storage/results/leads/LEAD-0001
// Body: { data, userId? }  →  200 { id, data }
export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  const data = body?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return Response.json({ error: "Send { data } with a JSON object." }, { status: 400 });
  }

  // The body contains the id, not the role. Look the user up and build the variables
  // the schema reads. In your app this is getSession(), and the body has no userId.
  const user = await sessionUser(body.userId); // 400 when the id is unknown
  const variables = toVariables(user);         // { user_id, user_name, user_role, user_currency }

  // Ids first, so the check sees the document that would be stored.
  const document = assignRowIds(data, [
    "contacts", "lineItems", "competitors", "securityReview", "activities",
  ]);

  const verdict = await checkResponse(definition, document, { variables });
  if (!verdict.ok && verdict.first) {
    // 422 { error, check: "response", first, count } — nothing is written.
    // The sentence is "Not stored: …". Validate Responses shows the body.
    return Response.json({ error: refusalMessage("Not stored", verdict.first, verdict.count) }, { status: 422 });
  }

  await store.putRecord(id, document);
  return Response.json({ id, data: document });
}
// #endregion
