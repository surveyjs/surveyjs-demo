// Larkspur CRM — CRM Opportunity Records: Validate Responses (client)
// https://surveyjs.io/documentation/crm-opportunity-records#validate-responses

// #region sjs:crm.validate-response.client
survey.onComplete.add(async (sender) => {
  const res = await fetch(`/api/storage/results/leads/${record.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: sender.data, userId: activeUserId })
  });
  if (res.ok) return;

  // 422 { error, check: "response", first, count } — the form is still open
  const body = await res.json();
  showError(body.error); // "Not stored: Discounts above 20% need a manager (lineItems.discountPct)."
});
// #endregion
