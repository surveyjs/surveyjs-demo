import type { SurveyData } from "@/schemas";

/**
 * A claim, printed onto the paper form it came from.
 *
 * The generic "save this survey as a PDF" export draws the questionnaire; a
 * claim needs the opposite - the CMS-1500 (02/12) itself, because that is the
 * document a payer accepts and the one a biller checks against. So this fills
 * the blank form that ships in `public/samples`: every answer has a spot on the
 * page, measured once in PDF points from the bottom-left corner, and the values
 * are drawn over the blank with pdf-lib.
 *
 * The blank is the NUCC sample sheet, watermarked SAMPLE - a template should
 * not hand anybody a document that could be mistaken for a claim ready to
 * submit. Swap the file for your own licensed form and the coordinates below
 * still hold, as long as the sheet is the 02/12 revision.
 *
 * Everything is loaded on demand: pdf-lib and the 250 KB blank reach the
 * browser only when somebody asks for a file.
 */

const BLANK = "/samples/archive/cms-1500/cms-1500-blank.pdf";

/** Body text, in points. */
const SIZE = 7.5;

/** Where each answer is printed: [x, y] in PDF points from the bottom left. */
const POS: Record<string, readonly [number, number]> = {
  insuredIdNumber: [420, 710],
  patientName: [66, 688],
  patientDobMonth: [270, 688],
  patientDobDay: [296, 688],
  patientDobYear: [320, 688],
  insuredName: [420, 688],
  patientAddress: [66, 666],
  insuredAddress: [420, 666],
  patientCity: [66, 641],
  patientState: [247, 641],
  insuredCity: [420, 641],
  insuredState: [617, 641],
  patientZip: [66, 618],
  patientPhoneArea: [165, 618],
  patientPhoneNumber: [192, 618],
  insuredZip: [420, 618],
  insuredPhoneArea: [519, 618],
  insuredPhoneNumber: [546, 618],
  otherInsuredName: [66, 592],
  insuredPolicyGroup: [420, 592],
  otherInsuredPolicyGroup: [66, 569],
  insuredDobMonth: [452, 570],
  insuredDobDay: [478, 570],
  insuredDobYear: [502, 570],
  otherClaimId: [420, 545],
  autoAccidentState: [396, 547],
  insurancePlanName: [420, 521],
  otherInsurancePlanName: [66, 497],
  claimCodes: [300, 497],
  patientSignature: [110, 452],
  patientSignatureDate: [272, 452],
  insuredSignature: [478, 452],
  currentIllnessMonth: [72, 425],
  currentIllnessDay: [98, 425],
  currentIllnessYear: [122, 425],
  currentIllnessQual: [232, 425],
  otherDateQual: [258, 425],
  otherDateMonth: [302, 425],
  otherDateDay: [330, 425],
  otherDateYear: [356, 425],
  unableFromMonth: [455, 425],
  unableFromDay: [481, 425],
  unableFromYear: [505, 425],
  unableToMonth: [560, 425],
  unableToDay: [586, 425],
  unableToYear: [610, 425],
  referringProviderQual: [97, 404],
  referringProviderName: [120, 404],
  referringProviderNpi: [312, 404],
  hospFromMonth: [455, 404],
  hospFromDay: [481, 404],
  hospFromYear: [505, 404],
  hospToMonth: [560, 404],
  hospToDay: [586, 404],
  hospToYear: [610, 404],
  additionalClaimInfo: [66, 381],
  outsideLabCharges: [545, 381],
  icdIndicator: [398, 361],
  resubmissionCode: [420, 340],
  originalRefNo: [530, 340],
  priorAuthorization: [420, 326],
  federalTaxId: [66, 140],
  patientAccountNo: [222, 140],
  totalCharge: [430, 140],
  amountPaid: [510, 140],
  providerSignature: [70, 82],
  providerSignatureDate: [168, 84],
  facilityName: [222, 118],
  facilityAddress: [222, 108],
  facilityCityStateZip: [222, 98],
  facilityNpi: [232, 80],
  billingName: [420, 118],
  billingAddress: [420, 108],
  billingCityStateZip: [420, 98],
  billingPhoneArea: [538, 122],
  billingPhoneNumber: [562, 122],
  billingNpi: [430, 80],
};

/** Box 21: twelve lettered slots, four to a row. */
const DIAGNOSIS_SLOTS: Record<string, readonly [number, number]> = {
  A: [80, 350],
  B: [196, 350],
  C: [272, 350],
  D: [370, 350],
  E: [80, 339],
  F: [196, 339],
  G: [272, 339],
  H: [370, 339],
  I: [80, 326],
  J: [196, 326],
  K: [272, 326],
  L: [370, 326],
};

/** The X that marks a checkbox, per question and per answer. */
const MARKS: Record<string, Record<string, readonly [number, number]>> = {
  insuranceProgram: {
    medicare: [66, 712],
    medicaid: [120, 712],
    tricare: [174, 712],
    champva: [231, 712],
    groupHealthPlan: [284, 712],
    fecaBlkLung: [337, 712],
    other: [391, 712],
  },
  patientSex: { M: [358, 690], F: [396, 690] },
  patientRelationshipToInsured: {
    self: [293, 665],
    spouse: [328, 665],
    child: [361, 665],
    other: [396, 665],
  },
  insuredSex: { M: [572, 568], F: [598, 568] },
  conditionEmployment: { yes: [311, 570], no: [349, 570] },
  conditionAutoAccident: { yes: [311, 545], no: [349, 545] },
  conditionOtherAccident: { yes: [311, 520], no: [349, 520] },
  anotherHealthBenefitPlan: { yes: [432, 495], no: [469, 495] },
  outsideLab: { yes: [432, 379], no: [469, 379] },
  federalTaxIdType: { ssn: [178, 136], ein: [193, 136] },
  acceptAssignment: { yes: [327, 136], no: [355, 136] },
};

/** Box 24: the x of every column, and the y of each of the six rows. */
const LINE_X = {
  fromMonth: 68,
  fromDay: 92,
  fromYear: 114,
  toMonth: 140,
  toDay: 164,
  toYear: 186,
  placeOfService: 208,
  emg: 232,
  cptHcpcs: 252,
  modifier: 300,
  diagnosisPointer: 400,
  charges: 432,
  units: 500,
  epsdt: 520,
  renderingProviderNpi: 560,
} as const;
const LINE_Y = [288, 264, 240, 216, 192, 168];

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** `(503) 555-0142` as the form prints it: area code in its own little box. */
function phoneParts(value: unknown): { area: string; number: string } {
  const match = /\((\d{3})\)\s*(.+)/.exec(text(value));
  return match
    ? { area: match[1], number: match[2] }
    : { area: "", number: text(value) };
}

/** `2026-03-12` as the form prints it: MM DD YY in three little boxes. */
function splitDate(value: unknown): { m: string; d: string; y: string } {
  const iso = text(value);
  if (!iso) return { m: "", d: "", y: "" };
  const [y, m, d] = iso.split("-");
  return { m: m ?? "", d: d ?? "", y: (y ?? "").slice(2) };
}

/** A signature date, printed the way the form prints it: MM/DD/YYYY. */
function signatureDate(value: unknown): string {
  const iso = text(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : iso;
}

/** `248` printed as the form wants it, with the cents spelled out. */
function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : text(value);
}

function fullName(
  last: unknown,
  first: unknown,
  middle: unknown,
): string {
  const lead = [text(last), text(first)].filter(Boolean).join(", ");
  return [lead, text(middle)].filter(Boolean).join(" ");
}

function fileNameFor(claimNumber: unknown): string {
  const slug = text(claimNumber)
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-|-$/g, "");
  return `cms-1500-${slug || "claim"}.pdf`;
}

/**
 * Fill the CMS-1500 with one claim and hand the browser the file.
 *
 * `data` is the survey's own answers, keyed by question name - the same object
 * the extractor produces and the records list stores, which is the point: one
 * definition, read from paper and printed back onto it.
 */
export async function exportClaimToCms1500(data: SurveyData): Promise<void> {
  const [{ PDFDocument, StandardFonts, rgb }, blank] = await Promise.all([
    import("pdf-lib"),
    fetch(BLANK).then((response) => {
      if (!response.ok) throw new Error(`Could not load the blank CMS-1500.`);
      return response.arrayBuffer();
    }),
  ]);

  const doc = await PDFDocument.load(blank);
  const page = doc.getPage(0);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);
  const ink = rgb(0.06, 0.09, 0.16);

  const put = (key: string, value: unknown, size = SIZE) => {
    const body = text(value);
    const spot = POS[key];
    if (!body || !spot) return;
    page.drawText(body, { x: spot[0], y: spot[1], size, font: mono, color: ink });
  };

  const mark = (group: string, value: string | null) => {
    const spot = value ? MARKS[group]?.[value] : undefined;
    if (!spot) return;
    page.drawText("X", {
      x: spot[0],
      y: spot[1],
      size: 8,
      font: monoBold,
      color: ink,
    });
  };

  const yesNo = (value: unknown): string | null =>
    value === true ? "yes" : value === false ? "no" : null;

  mark("insuranceProgram", text(data.insuranceProgram) || null);
  put("insuredIdNumber", data.insuredIdNumber);
  put(
    "patientName",
    fullName(data.patientLastName, data.patientFirstName, data.patientMiddleInitial),
  );
  const patientDob = splitDate(data.patientDob);
  put("patientDobMonth", patientDob.m);
  put("patientDobDay", patientDob.d);
  put("patientDobYear", patientDob.y);
  mark("patientSex", text(data.patientSex) || null);
  put(
    "insuredName",
    fullName(data.insuredLastName, data.insuredFirstName, data.insuredMiddleInitial),
  );
  put("patientAddress", data.patientAddress);
  put("insuredAddress", data.insuredAddress);
  put("patientCity", data.patientCity);
  put("patientState", data.patientState);
  put("insuredCity", data.insuredCity);
  put("insuredState", data.insuredState);
  put("patientZip", data.patientZip);
  put("patientPhoneArea", phoneParts(data.patientPhone).area);
  put("patientPhoneNumber", phoneParts(data.patientPhone).number);
  put("insuredZip", data.insuredZip);
  put("insuredPhoneArea", phoneParts(data.insuredPhone).area);
  put("insuredPhoneNumber", phoneParts(data.insuredPhone).number);
  mark(
    "patientRelationshipToInsured",
    text(data.patientRelationshipToInsured) || null,
  );
  put("otherInsuredName", data.otherInsuredName);
  put("insuredPolicyGroup", data.insuredPolicyGroup);
  put("otherInsuredPolicyGroup", data.otherInsuredPolicyGroup);
  const insuredDob = splitDate(data.insuredDob);
  put("insuredDobMonth", insuredDob.m);
  put("insuredDobDay", insuredDob.d);
  put("insuredDobYear", insuredDob.y);
  mark("insuredSex", text(data.insuredSex) || null);
  mark("conditionEmployment", yesNo(data.conditionEmployment));
  mark("conditionAutoAccident", yesNo(data.conditionAutoAccident));
  put("autoAccidentState", data.autoAccidentState);
  mark("conditionOtherAccident", yesNo(data.conditionOtherAccident));
  put("otherClaimId", data.otherClaimId);
  put("insurancePlanName", data.insurancePlanName);
  put("otherInsurancePlanName", data.otherInsurancePlanName);
  put("claimCodes", data.claimCodes);
  mark("anotherHealthBenefitPlan", yesNo(data.anotherHealthBenefitPlan));

  put("patientSignature", data.patientSignature);
  put("patientSignatureDate", signatureDate(data.patientSignatureDate));
  put("insuredSignature", data.insuredSignature);

  const illness = splitDate(data.currentIllnessDate);
  put("currentIllnessMonth", illness.m);
  put("currentIllnessDay", illness.d);
  put("currentIllnessYear", illness.y);
  put("currentIllnessQual", data.currentIllnessQual);
  put("otherDateQual", data.otherDateQual);
  const otherDate = splitDate(data.otherDate);
  put("otherDateMonth", otherDate.m);
  put("otherDateDay", otherDate.d);
  put("otherDateYear", otherDate.y);
  const unableFrom = splitDate(data.unableToWorkFrom);
  put("unableFromMonth", unableFrom.m);
  put("unableFromDay", unableFrom.d);
  put("unableFromYear", unableFrom.y);
  const unableTo = splitDate(data.unableToWorkTo);
  put("unableToMonth", unableTo.m);
  put("unableToDay", unableTo.d);
  put("unableToYear", unableTo.y);
  put("referringProviderQual", data.referringProviderQual);
  put("referringProviderName", data.referringProviderName);
  put("referringProviderNpi", data.referringProviderNpi);
  const hospFrom = splitDate(data.hospitalizationFrom);
  put("hospFromMonth", hospFrom.m);
  put("hospFromDay", hospFrom.d);
  put("hospFromYear", hospFrom.y);
  const hospTo = splitDate(data.hospitalizationTo);
  put("hospToMonth", hospTo.m);
  put("hospToDay", hospTo.d);
  put("hospToYear", hospTo.y);

  put("additionalClaimInfo", data.additionalClaimInfo);
  mark("outsideLab", yesNo(data.outsideLab));
  put("outsideLabCharges", money(data.outsideLabCharges));
  put("icdIndicator", data.icdIndicator);

  // Box 21 keeps its lettered slots: a row says which letter it belongs in, so
  // the pointers in box 24E still line up with what is printed here.
  const diagnoses = Array.isArray(data.diagnoses) ? data.diagnoses : [];
  diagnoses.forEach((row, index) => {
    const entry = row as { pointer?: unknown; code?: unknown };
    const letter =
      text(entry.pointer).toUpperCase() || Object.keys(DIAGNOSIS_SLOTS)[index];
    const spot = DIAGNOSIS_SLOTS[letter];
    const code = text(entry.code);
    if (!spot || !code) return;
    page.drawText(code, {
      x: spot[0],
      y: spot[1],
      size: SIZE,
      font: mono,
      color: ink,
    });
  });

  put("resubmissionCode", data.resubmissionCode);
  put("originalRefNo", data.originalRefNo);
  put("priorAuthorization", data.priorAuthorization);

  const lines = Array.isArray(data.serviceLines) ? data.serviceLines : [];
  lines.forEach((row, index) => {
    const y = LINE_Y[index];
    if (y === undefined) return;
    const line = row as Record<string, unknown>;
    const cell = (column: keyof typeof LINE_X, value: unknown, at = y) => {
      const body = text(value);
      if (!body) return;
      page.drawText(body, {
        x: LINE_X[column],
        y: at,
        size: 7,
        font: mono,
        color: ink,
      });
    };
    const from = splitDate(line.dateFrom);
    const to = splitDate(line.dateTo);
    cell("fromMonth", from.m);
    cell("fromDay", from.d);
    cell("fromYear", from.y);
    cell("toMonth", to.m);
    cell("toDay", to.d);
    cell("toYear", to.y);
    cell("placeOfService", line.placeOfService);
    cell("emg", line.emg);
    cell("cptHcpcs", line.cptHcpcs);
    cell("modifier", line.modifier);
    cell("diagnosisPointer", line.diagnosisPointer);
    cell("charges", money(line.charges));
    cell("units", line.units);
    cell("epsdt", line.epsdt);
    // The NPI is printed on the lower of the row's two lines.
    cell("renderingProviderNpi", line.renderingProviderNpi, y - 13);
  });

  put("federalTaxId", data.federalTaxId);
  mark("federalTaxIdType", text(data.federalTaxIdType) || null);
  put("patientAccountNo", data.patientAccountNo);
  mark("acceptAssignment", yesNo(data.acceptAssignment));
  put("totalCharge", money(data.totalCharge));
  put("amountPaid", money(data.amountPaid));
  put("providerSignature", data.providerSignature);
  put("providerSignatureDate", signatureDate(data.providerSignatureDate));
  put("facilityName", data.facilityName);
  put("facilityAddress", data.facilityAddress);
  put("facilityCityStateZip", data.facilityCityStateZip);
  put("facilityNpi", data.facilityNpi);
  put("billingName", data.billingName);
  put("billingAddress", data.billingAddress);
  put("billingCityStateZip", data.billingCityStateZip);
  put("billingPhoneArea", phoneParts(data.billingPhone).area);
  put("billingPhoneNumber", phoneParts(data.billingPhone).number);
  put("billingNpi", data.billingNpi);

  const bytes = await doc.save();
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileNameFor(data.claimNumber);
  link.click();
  URL.revokeObjectURL(url);
}
