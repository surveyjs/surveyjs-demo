// Larkspur CRM — CRM Opportunity Records: Start a new record from the session (server)
// https://surveyjs.io/documentation/crm-opportunity-records#start-a-new-record-from-the-session

// #region sjs:crm.new-record.server
newRecord: (_id, user) => ({
  owner: user?.id,                                         // owen.mercer or ines.moreau
  currency: typeof user?.currency === "string" ? user.currency : "USD",
  stage: "new",
})
// #endregion
