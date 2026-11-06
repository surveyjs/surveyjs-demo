// Larkspur CRM — CRM Opportunity Records: Save Responses (client)
// https://surveyjs.io/documentation/crm-opportunity-records#save-responses

// #region sjs:crm.save-response.client
import { Model } from "survey-core";

// schema, variables, and the open record were loaded with the page (see the next section)
const survey = new Model(schema);
survey.data = record.data;

// Save changes validates every page, then completes. onComplete sends the answers.
survey.onComplete.add(async (sender) => {
  const res = await fetch(`/api/storage/results/leads/${record.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    // userId replaces the session in this demo. Your route calls getSession()
    // and the body is { data } only.
    body: JSON.stringify({ data: sender.data, userId: activeUserId })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  // 200 { id, data } — data is the document as stored, including new row ids
  return res.json();
});
// #endregion
