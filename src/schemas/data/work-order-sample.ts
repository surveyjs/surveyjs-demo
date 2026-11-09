import type { SurveyData } from "../types";

// Keep the new job number, draft status and labor rate; a sample never signs for a customer.
export const workOrderSample: SurveyData = {
  visitDate: "2026-11-05",
  arrivalTime: "09:00",
  departureTime: "11:30",
  customerName: "Cedar Grove Software",
  purchaseOrder: "CG-PO-1024",
  contactName: "Alex Morgan",
  contactPhone: "(503) 555-0162",
  siteAddress: "240 Oak Street, Portland, OR 97205",
  equipmentType: "airConditioning",
  warranty: false,
  manufacturer: "Aerolyne",
  modelNumber: "AS-36C",
  serialNumber: "A36-220603-1258",
  installedOn: "2022-06-03",
  faultReported: "The office air conditioner runs but does not cool the meeting rooms.",
  workPerformed: "Replaced the failed run capacitor and both filters. Tested the unit under load.",
  outcome: "resolved",
  parts: [
    { partNumber: "CAP-455", description: "Run capacitor, 45/5 MFD", quantity: 1, unitPrice: 22.8 },
    { partNumber: "FLT-2025", description: "Pleated filter, 20 x 25 x 1", quantity: 2, unitPrice: 9.6 },
  ],
  laborHours: 2.5,
  technicianName: "gracePellerin",
  signedByName: "Alex Morgan",
};
