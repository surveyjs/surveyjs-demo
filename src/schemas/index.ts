export type {
  SurveyJSON,
  SurveyData,
  SurveyMode,
  SchemaDefinition,
  SurveyResult,
  SessionUser,
  SourceDocument,
} from "./types";

export { checkoutJson, checkoutSchema } from "./checkout";
export { clinicVisitJson, clinicVisitSchema } from "./clinic-visit";
export * from "./clinic-info";
export {
  customerSatisfactionJson,
  customerSatisfactionSchema,
} from "./customer-satisfaction";
export { encounterNoteJson, encounterNoteSchema } from "./encounter-note";
export { leadsJson, leadsSchema, LEAD_OWNERS } from "./leads";
export { planFinderJson, planFinderSchema } from "./plan-finder";
export {
  workOrderJson,
  workOrderSchema,
  WORK_ORDER_STATUSES,
  EQUIPMENT_TYPES,
  TECHNICIANS,
  OUTCOMES,
} from "./work-order";
export {
  patientRecordJson,
  CLINIC_PATIENTS,
  PATIENT_LANGUAGES,
} from "./patient-record";

export { checkoutSample } from "./data/checkout-seed";
export { clinicVisitSample } from "./data/clinic-visit-seed";
export { customerSatisfactionSample } from "./data/customer-satisfaction-seed";
export { planFinderSample } from "./data/plan-finder-seed";
export { encounterNoteSample } from "./data/encounter-note-seed";
export { leadsSeed } from "./data/leads-seed";
export { workOrderSeed } from "./data/work-order-seed";

export {
  recordCollections,
  getRecordCollection,
  sortRows,
  recordTitle,
  assignRowIds,
  type ColumnValue,
  type RecordColumns,
  type RecordColumn,
  type RecordRow,
  type StoredRecord,
  type RecordCollection,
} from "./records";

export {
  createSurveyModel,
  type CreateSurveyModelOptions,
  type SchemaInput,
} from "./createSurveyModel";

export {
  navGroups,
  navItems,
  navPages,
  isNavPage,
  opensInNewTab,
  navHref,
  getFormNavItem,
  getNavItem,
  isActiveRoute,
  type NavItem,
  type NavPage,
  type NavLink,
  type NavGroup,
  type NavId,
} from "./navigation";

import { checkoutSchema } from "./checkout";
import { clinicVisitSchema } from "./clinic-visit";
import { encounterNoteSchema } from "./encounter-note";
import { customerSatisfactionSchema } from "./customer-satisfaction";
import { leadsSchema } from "./leads";
import { planFinderSchema } from "./plan-finder";
import { workOrderSchema } from "./work-order";
import type { SchemaDefinition } from "./types";

export const schemaRegistry: Record<string, SchemaDefinition> = {
  [checkoutSchema.id]: checkoutSchema,
  [clinicVisitSchema.id]: clinicVisitSchema,
  [encounterNoteSchema.id]: encounterNoteSchema,
  [customerSatisfactionSchema.id]: customerSatisfactionSchema,
  [leadsSchema.id]: leadsSchema,
  [planFinderSchema.id]: planFinderSchema,
  [workOrderSchema.id]: workOrderSchema,
};

export function getSchemaDefinition(id: string): SchemaDefinition {
  const schema = schemaRegistry[id];
  if (!schema) throw new Error(`Unknown schema id: ${id}`);
  return schema;
}
