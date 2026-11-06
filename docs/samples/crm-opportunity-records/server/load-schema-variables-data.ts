// Larkspur CRM — CRM Opportunity Records: Load JSON Schemas, Variables, and Answers (server)
// https://surveyjs.io/documentation/crm-opportunity-records#load-json-schemas-variables-and-answers

// #region sjs:crm.load-schema-variables-data.server
// The records page, on the server. All four are in the HTML.
const rows = await listResults("leads");          // [{ id, columns }] — no documents
const schema = (await loadSurveyJson("leads")) ?? getSchemaDefinition("leads").json;
const record = rows[0] && (await getResult("leads", rows[0].id)); // { id, columns, data }
const users = await listSessionUsers("leads");     // in your app: getSession(), one user

// The client publishes the active user once: { user_id, user_name, user_role, user_currency }
const variables = toVariables(users[0]);
// #endregion
