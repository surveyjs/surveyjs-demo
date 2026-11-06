// Larkspur CRM — CRM Opportunity Records: Use Relational Storage (server)
// https://surveyjs.io/documentation/crm-opportunity-records#use-relational-storage

// #region sjs:crm.relational-storage.server
function toColumns(_id: string, data: SurveyData) {
  return {
    accountName: text(data.accountName),
    ownerName: LEAD_OWNERS.find((owner) => owner.id === data.owner)?.name ?? null,
    stage: text(data.stage),
    dealValue: dealValueOf(data),       // recomputed from lineItems, never copied
    nextStepDate: text(data.nextStepDate),
    currency: text(data.currency),       // stored, not shown; the money column reads it
    expectedClose: text(data.expectedClose), // stored, not shown; the sort reads it
  };
}
// #endregion
