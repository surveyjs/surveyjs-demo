// Larkspur CRM — CRM Opportunity Records: Use Relational Storage (client)
// https://surveyjs.io/documentation/crm-opportunity-records#use-relational-storage

// #region sjs:crm.relational-storage.client
// The list never asks for documents. Opening a row asks for one.
const rows = await fetch("/api/leads").then((r) => r.json());
// [{ id: "LEAD-0001", columns: { accountName, ownerName, stage, dealValue, nextStepDate, currency, expectedClose } }]

const record = await fetch("/api/leads/LEAD-0001").then((r) => r.json());
// { id, columns, data } — data is the whole response
// #endregion
