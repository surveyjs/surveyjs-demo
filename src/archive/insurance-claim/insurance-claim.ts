import type { SchemaDefinition, SurveyJSON } from "../../schemas/types";

/**
 * The CMS-1500 (02/12) claim, as a survey.
 *
 * Two audiences read this definition, and each gets its own half of every
 * question. A person reads `title`, so the titles are plain English and never
 * mention box numbers. The model reads `aiHint`, which is where the paper form
 * lives: which numbered box the answer comes from, how that box is printed, and
 * what the traps are. `aiHint` is never rendered, so the form stays readable
 * while the extraction prompt stays precise.
 */
export const insuranceClaimJson: SurveyJSON = {
  title: "Health Insurance Claim (CMS-1500)",
  description: "Create or edit a claim record, box by box as the paper form.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  aiHint:
    "The document is a CMS-1500 (02/12) Health Insurance Claim Form, the standard US professional claim. Every question below names the numbered box it comes from in its hint, and each box is labelled with that number on the form - read the value out of that box and nowhere else. Never carry a value over from a neighbouring box, and never repeat a value you have already used for a different question unless the form really prints it twice. Checkbox geometry matters and is not uniform: in boxes 3, 6 and 11a the little square sits to the RIGHT of the word it belongs to (so an X between 'Self' and 'Spouse' belongs to Self), while in boxes 10a-10c, 11d, 20 and 27 the square sits to the LEFT of its YES or NO label. Dates are printed as MM DD YY in three adjacent little boxes; return them as YYYY-MM-DD, reading a two-digit year 00-40 as 20xx and 41-99 as 19xx. Money is printed as dollars and cents in two adjacent columns with no decimal point, so '145 00' means 145.00. Diagnosis codes are printed with the decimal point left out: return the code with the point put back where the ICD-10 standard has it, so 'M5451' becomes M54.51 and 'E785' becomes E78.5. The left half of the form is about the patient and any secondary policy, the right half about the insured and the payer. When a box on the form is blank, or the question is not on the form at all, return null for it - not an empty string. Never invent a value.",
  pages: [
    {
      name: "record",
      title: "Record",
      elements: [
        {
          type: "panel",
          name: "recordMeta",
          title: "Record",
          description: "Internal to this app - not part of the paper form.",
          elements: [
            {
              type: "text",
              name: "claimNumber",
              title: "Claim number",
              isRequired: true,
              maskType: "pattern",
              maskSettings: { pattern: "CLM-9999-9999" },
              placeholder: "CLM-____-____",
              aiHint:
                "Not on the CMS-1500 form. This app assigns it, so return null.",
            },
            {
              type: "dropdown",
              name: "status",
              title: "Status",
              isRequired: true,
              startWithNewLine: false,
              defaultValue: "draft",
              choices: [
                { value: "draft", text: "Draft" },
                { value: "submitted", text: "Submitted" },
                { value: "in_review", text: "In review" },
                { value: "approved", text: "Approved" },
                { value: "denied", text: "Denied" },
              ],
              aiHint:
                "Not on the CMS-1500 form - it is this app's own workflow state. Return null.",
            },
          ],
        },
        {
          type: "panel",
          name: "carrier",
          title: "Insurance program",
          elements: [
            {
              type: "radiogroup",
              name: "insuranceProgram",
              title: "Program",
              colCount: 4,
              choices: [
                { value: "medicare", text: "Medicare" },
                { value: "medicaid", text: "Medicaid" },
                { value: "tricare", text: "TRICARE" },
                { value: "champva", text: "CHAMPVA" },
                { value: "groupHealthPlan", text: "Group health plan" },
                { value: "fecaBlkLung", text: "FECA black lung" },
                { value: "other", text: "Other" },
              ],
              aiHint:
                "Box 1 is the row across the top of the form: seven program names printed on the upper line, and under each one a little square followed by its (ID#) note. The square belongs to the program name printed above it. Exactly one square carries an X; return that program. Do not answer other unless the X is under the word OTHER at the right-hand end of the row.",
            },
            {
              type: "text",
              name: "insuredIdNumber",
              title: "Insured's ID number",
              aiHint:
                "Box 1a, top right of the form, immediately right of the box 1 checkbox row. It is the member number the payer in box 11c issued, so its letter prefix often abbreviates that plan name.",
            },
          ],
        },
        {
          type: "panel",
          name: "patient",
          title: "Patient",
          elements: [
            {
              type: "text",
              name: "patientLastName",
              title: "Last name",
              isRequired: true,
              aiHint:
                "Box 2 holds one line printed as 'Last, First Middle-Initial'. Return only the last name, without the comma.",
            },
            {
              type: "text",
              name: "patientFirstName",
              title: "First name",
              isRequired: true,
              startWithNewLine: false,
              aiHint: "Box 2, the part after the comma. First name only.",
            },
            {
              type: "text",
              name: "patientMiddleInitial",
              title: "MI",
              startWithNewLine: false,
              maxLength: 1,
              aiHint:
                "Box 2, the single letter after the first name. Empty if box 2 has no middle initial.",
            },
            {
              type: "text",
              name: "patientDob",
              title: "Date of birth",
              inputType: "date",
              aiHint:
                "Box 3, printed as MM DD YY in three small boxes. Return YYYY-MM-DD.",
            },
            {
              type: "radiogroup",
              name: "patientSex",
              title: "Sex",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "M", text: "Male" },
                { value: "F", text: "Female" },
              ],
              aiHint:
                "Box 3, right of the birth date, under the word SEX: an M with its square to the right of it, then an F with its square to the right of it. The answer is the letter immediately to the LEFT of the marked square.",
            },
            {
              type: "text",
              name: "patientAddress",
              title: "Street address",
              aiHint: "Box 5, the first line only (number and street).",
            },
            {
              type: "text",
              name: "patientCity",
              title: "City",
              aiHint: "Box 5, the CITY field on the line below the street.",
            },
            {
              type: "text",
              name: "patientState",
              title: "State",
              startWithNewLine: false,
              maxLength: 2,
              aiHint: "Box 5, the two-letter STATE field right of the city.",
            },
            {
              type: "text",
              name: "patientZip",
              title: "ZIP",
              startWithNewLine: false,
              aiHint: "Box 5, the ZIP CODE field on the bottom line.",
            },
            {
              type: "text",
              name: "patientPhone",
              title: "Phone",
              startWithNewLine: false,
              aiHint:
                "Box 5, TELEPHONE. The area code sits inside the pre-printed parentheses; return the whole number as (999) 999-9999.",
            },
            {
              type: "radiogroup",
              name: "patientRelationshipToInsured",
              title: "Relationship to insured",
              colCount: 4,
              choices: [
                { value: "self", text: "Self" },
                { value: "spouse", text: "Spouse" },
                { value: "child", text: "Child" },
                { value: "other", text: "Other" },
              ],
              aiHint:
                "Box 6, in the middle column: four words - Self, Spouse, Child, Other - each followed by its own square to its RIGHT. So an X standing between Self and Spouse is Self ticked, not Spouse; the answer is the word immediately to the LEFT of the marked square.",
            },
          ],
        },
        {
          type: "panel",
          name: "insured",
          title: "Insured and policy",
          elements: [
            {
              type: "text",
              name: "insuredLastName",
              title: "Last name",
              aiHint:
                "Box 4, printed 'Last, First Middle-Initial'. Last name only. Often the same person as box 2.",
            },
            {
              type: "text",
              name: "insuredFirstName",
              title: "First name",
              startWithNewLine: false,
              aiHint: "Box 4, the part after the comma.",
            },
            {
              type: "text",
              name: "insuredMiddleInitial",
              title: "MI",
              startWithNewLine: false,
              maxLength: 1,
              aiHint: "Box 4, the single letter after the first name.",
            },
            {
              type: "text",
              name: "insuredAddress",
              title: "Street address",
              aiHint: "Box 7, first line (number and street).",
            },
            {
              type: "text",
              name: "insuredCity",
              title: "City",
              aiHint: "Box 7, CITY.",
            },
            {
              type: "text",
              name: "insuredState",
              title: "State",
              startWithNewLine: false,
              maxLength: 2,
              aiHint: "Box 7, STATE.",
            },
            {
              type: "text",
              name: "insuredZip",
              title: "ZIP",
              startWithNewLine: false,
              aiHint: "Box 7, ZIP CODE.",
            },
            {
              type: "text",
              name: "insuredPhone",
              title: "Phone",
              startWithNewLine: false,
              aiHint: "Box 7, TELEPHONE. Return as (999) 999-9999.",
            },
            {
              type: "text",
              name: "insuredPolicyGroup",
              title: "Policy group or FECA number",
              aiHint: "Box 11, right column, above the insured's date of birth.",
            },
            {
              type: "text",
              name: "insuredDob",
              title: "Date of birth",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 11a, printed MM DD YY. Return YYYY-MM-DD.",
            },
            {
              type: "radiogroup",
              name: "insuredSex",
              title: "Sex",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "M", text: "Male" },
                { value: "F", text: "Female" },
              ],
              aiHint:
                "Box 11a, right of the insured date of birth: an M with its square to the right of it, then an F with its square. The answer is the letter immediately to the LEFT of the marked square. It is the insured, so it need not match box 3.",
            },
            {
              type: "text",
              name: "otherClaimId",
              title: "Other claim ID",
              aiHint: "Box 11b, 'OTHER CLAIM ID (Designated by NUCC)'.",
            },
            {
              type: "text",
              name: "insurancePlanName",
              title: "Insurance plan or program name",
              aiHint:
                "Two boxes on this form carry the wording INSURANCE PLAN NAME OR PROGRAM NAME and they hold DIFFERENT insurers, so locate box 11c by the row it shares: it is the plan name printed at the RIGHT-HAND end of the row whose left-hand end reads c. OTHER ACCIDENT?. The other one, one row lower and at the LEFT-HAND end of the row that reads IS THERE ANOTHER HEALTH BENEFIT PLAN, is box 9d and must not be returned here. Box 11c is the payer this claim is addressed to - the carrier printed in the block at the very top of the form, which issued the member ID in box 1a.",
            },
            {
              type: "boolean",
              name: "anotherHealthBenefitPlan",
              title: "Another health benefit plan?",
              aiHint:
                "Box 11d, right column, the line that reads IS THERE ANOTHER HEALTH BENEFIT PLAN. Each square sits to the LEFT of its YES or NO label. true when the square before YES is marked, false when the square before NO is. Cross-check it: when boxes 9, 9a and 9d carry text the answer is true, and when that whole left-hand stack is blank the answer is false.",
            },
          ],
        },
        {
          type: "panel",
          name: "otherInsured",
          title: "Other insurance",
          description: "A second policy that also covers the patient.",
          elements: [
            {
              type: "text",
              name: "otherInsuredName",
              title: "Other insured's name",
              aiHint:
                "Box 9, the top of the stack in the LEFT column, directly below box 2 and 5. It names the subscriber of a SECOND policy that also covers the patient, printed Last, First Middle-Initial. It is filled whenever box 11d says YES, and blank when 11d says NO.",
            },
            {
              type: "text",
              name: "otherInsuredPolicyGroup",
              title: "Policy or group number",
              aiHint:
                "Box 9a, in the LEFT column directly below box 9. The policy or group number of that second policy. Filled whenever box 9 has a name.",
            },
            {
              type: "text",
              name: "otherInsurancePlanName",
              title: "Insurance plan or program name",
              aiHint:
                "Two boxes on this form carry the wording INSURANCE PLAN NAME OR PROGRAM NAME and they hold DIFFERENT insurers, so locate box 9d by the row it shares: it is the plan name printed at the LEFT-HAND end of the row whose right-hand end reads IS THERE ANOTHER HEALTH BENEFIT PLAN with its YES and NO boxes. The other one, one row higher and at the RIGHT-HAND end of the row that begins c. OTHER ACCIDENT?, is box 11c and must not be returned here. Box 9d names the secondary policy from boxes 9 and 9a, never the payer this claim is sent to.",
            },
          ],
        },
        {
          type: "panel",
          name: "condition",
          title: "Is the condition related to",
          elements: [
            {
              type: "boolean",
              name: "conditionEmployment",
              title: "Employment (current or previous)",
              aiHint:
                "Box 10a, middle column, the line EMPLOYMENT? (Current or Previous). Each square sits to the LEFT of its YES or NO label. true when the square before YES is marked.",
            },
            {
              type: "boolean",
              name: "conditionAutoAccident",
              title: "Auto accident",
              aiHint:
                "Box 10b, middle column, the line AUTO ACCIDENT?, directly below box 10a. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "autoAccidentState",
              title: "Accident state",
              visibleIf: "{conditionAutoAccident} = true",
              maxLength: 2,
              aiHint:
                "Box 10b, the small PLACE (State) field right of the auto-accident checkboxes.",
            },
            {
              type: "boolean",
              name: "conditionOtherAccident",
              title: "Other accident",
              aiHint:
                "Box 10c, middle column, the line OTHER ACCIDENT?, directly below box 10b. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "claimCodes",
              title: "Claim codes",
              aiHint: "Box 10d, 'CLAIM CODES (Designated by NUCC)'.",
            },
          ],
        },
        {
          type: "panel",
          name: "signatures",
          title: "Signatures",
          elements: [
            {
              type: "text",
              name: "patientSignature",
              title: "Patient's signature",
              aiHint:
                "Box 12, on the SIGNED line. Often printed as the words SIGNATURE ON FILE rather than a real signature - return the text as printed.",
            },
            {
              type: "text",
              name: "patientSignatureDate",
              title: "Signed on",
              inputType: "date",
              startWithNewLine: false,
              aiHint:
                "Box 12, the DATE beside the patient's signature. Usually printed MM/DD/YYYY; return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "insuredSignature",
              title: "Insured's signature",
              aiHint: "Box 13, the SIGNED line in the right column.",
            },
          ],
        },
        {
          type: "panel",
          name: "dates",
          title: "Dates and referral",
          elements: [
            {
              type: "text",
              name: "currentIllnessDate",
              title: "Current illness, injury or pregnancy began",
              inputType: "date",
              aiHint:
                "Box 14 is on the row that begins '14. DATE OF CURRENT ILLNESS, INJURY, or PREGNANCY (LMP)', immediately below the signature band in the left half of the form. It is the date the current problem started - never the patient's date of birth from box 3. Printed MM DD YY; return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "currentIllnessQual",
              title: "Qualifier",
              startWithNewLine: false,
              maxLength: 3,
              aiHint:
                "Box 14, the three-character QUAL code right of the date (431 = onset of current symptoms, 484 = last menstrual period).",
            },
            {
              type: "text",
              name: "otherDate",
              title: "Other date",
              inputType: "date",
              aiHint: "Box 15, printed MM DD YY. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "otherDateQual",
              title: "Qualifier",
              startWithNewLine: false,
              maxLength: 3,
              aiHint: "Box 15, the QUAL code left of the date.",
            },
            {
              type: "text",
              name: "unableToWorkFrom",
              title: "Unable to work from",
              inputType: "date",
              aiHint: "Box 16, the FROM date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "unableToWorkTo",
              title: "Unable to work to",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 16, the TO date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "referringProviderName",
              title: "Referring provider",
              aiHint:
                "Box 17, the provider's name. Printed 'Last, First Middle-Initial' - return it as printed.",
            },
            {
              type: "text",
              name: "referringProviderQual",
              title: "Qualifier",
              startWithNewLine: false,
              maxLength: 2,
              aiHint:
                "Box 17, the two-letter qualifier in the small field left of the name (DN = referring, DK = ordering, DQ = supervising).",
            },
            {
              type: "text",
              name: "referringProviderNpi",
              title: "Referring provider NPI",
              startWithNewLine: false,
              aiHint: "Box 17b, the ten-digit NPI right of the NPI label.",
            },
            {
              type: "text",
              name: "hospitalizationFrom",
              title: "Hospitalized from",
              inputType: "date",
              aiHint: "Box 18, the FROM date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "hospitalizationTo",
              title: "Hospitalized to",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 18, the TO date. Return YYYY-MM-DD.",
            },
          ],
        },
        {
          type: "panel",
          name: "diagnosis",
          title: "Diagnosis and authorization",
          elements: [
            {
              type: "comment",
              name: "additionalClaimInfo",
              title: "Additional claim information",
              rows: 2,
              aiHint: "Box 19, a single free-text line across the form.",
            },
            {
              type: "boolean",
              name: "outsideLab",
              title: "Outside lab?",
              aiHint:
                "Box 20, right column, the line OUTSIDE LAB?. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "outsideLabCharges",
              title: "Outside lab charges",
              inputType: "number",
              startWithNewLine: false,
              visibleIf: "{outsideLab} = true",
              aiHint:
                "Box 20, the $ CHARGES field right of the YES/NO boxes. Dollars and cents in adjacent columns; return a number such as 45.00, or null when the field is blank.",
            },
            {
              type: "text",
              name: "icdIndicator",
              title: "ICD indicator",
              maxLength: 1,
              aiHint:
                "Box 21, the single digit in the small ICD Ind. box (0 = ICD-10-CM, 9 = ICD-9-CM).",
            },
            {
              // Twelve lettered slots on paper, a table here: the letters are
              // what the service lines point at, so they are a column rather
              // than twelve question names to keep in step.
              type: "matrixdynamic",
              name: "diagnoses",
              title: "Diagnosis codes",
              rowCount: 1,
              minRowCount: 0,
              maxRowCount: 12,
              addRowText: "Add diagnosis",
              aiHint:
                "Box 21 is the block headed DIAGNOSIS OR NATURE OF ILLNESS OR INJURY. It has twelve slots, each printed with its own letter from A to L and laid out in three rows of four, read left to right: A B C D, then E F G H, then I J K L. Return one object per slot that has a code in it, in that order, and skip the empty ones. Put the printed letter in the pointer column - it is what box 24E refers to - and the code in the code column. The codes are printed without a decimal point; return them with the point restored, so M5451 becomes M54.51.",
              columns: [
                {
                  name: "pointer",
                  title: "Pointer",
                  cellType: "dropdown",
                  choices: [
                    "A",
                    "B",
                    "C",
                    "D",
                    "E",
                    "F",
                    "G",
                    "H",
                    "I",
                    "J",
                    "K",
                    "L",
                  ],
                },
                { name: "code", title: "ICD-10-CM code", cellType: "text" },
              ],
            },
            {
              type: "text",
              name: "resubmissionCode",
              title: "Resubmission code",
              aiHint: "Box 22, the code left of ORIGINAL REF. NO.",
            },
            {
              type: "text",
              name: "originalRefNo",
              title: "Original ref. no.",
              startWithNewLine: false,
              aiHint: "Box 22, the ORIGINAL REF. NO. field.",
            },
            {
              type: "text",
              name: "priorAuthorization",
              title: "Prior authorization number",
              startWithNewLine: false,
              aiHint: "Box 23, below box 22 in the right column.",
            },
          ],
        },
        {
          type: "panel",
          name: "services",
          title: "Services",
          elements: [
            {
              type: "matrixdynamic",
              name: "serviceLines",
              title: "Service lines",
              rowCount: 1,
              minRowCount: 0,
              maxRowCount: 6,
              addRowText: "Add service line",
              aiHint:
                "Box 24 is the six-row service table in the middle of the form. Return one object per row that has any printing in it, in the order they appear, and skip the empty rows; a row is empty when its date columns are blank. Read the columns strictly by their printed headings, left to right: 24A DATE(S) OF SERVICE is two dates, From then To, each MM DD YY - return both as YYYY-MM-DD; 24B PLACE OF SERVICE is a two-digit code such as 11 or 23; 24C EMG is usually blank, so leave it empty unless a letter is really printed; 24D is the five-character CPT/HCPCS code, and MODIFIER is the separate narrow column to its right, blank on most lines; 24E DIAGNOSIS POINTER is one or more LETTERS between A and L pointing at box 21 (never a number, and never the same text as the modifier); 24F $ CHARGES is dollars and cents in adjacent columns, so 145 00 is 145.00; 24G DAYS OR UNITS is a small number; 24H EPSDT is usually blank; 24J RENDERING PROVIDER ID is the ten-digit NPI printed on the lower of the row two lines, to the right of the pre-printed NPI label. Return numbers for charges and units, not strings.",
              columns: [
                {
                  name: "dateFrom",
                  title: "From",
                  cellType: "text",
                  inputType: "date",
                },
                {
                  name: "dateTo",
                  title: "To",
                  cellType: "text",
                  inputType: "date",
                },
                { name: "placeOfService", title: "Place", cellType: "text" },
                { name: "emg", title: "EMG", cellType: "text" },
                { name: "cptHcpcs", title: "CPT/HCPCS", cellType: "text" },
                { name: "modifier", title: "Modifier", cellType: "text" },
                {
                  name: "diagnosisPointer",
                  title: "Pointer",
                  cellType: "text",
                },
                {
                  name: "charges",
                  title: "Charges",
                  cellType: "text",
                  inputType: "number",
                },
                {
                  name: "units",
                  title: "Units",
                  cellType: "text",
                  inputType: "number",
                },
                { name: "epsdt", title: "EPSDT", cellType: "text" },
                {
                  name: "renderingProviderNpi",
                  title: "Rendering NPI",
                  cellType: "text",
                },
              ],
            },
          ],
        },
        {
          type: "panel",
          name: "billing",
          title: "Billing",
          elements: [
            {
              type: "text",
              name: "federalTaxId",
              title: "Federal tax ID",
              aiHint: "Box 25, bottom left of the form.",
            },
            {
              type: "radiogroup",
              name: "federalTaxIdType",
              title: "Tax ID type",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "ssn", text: "SSN" },
                { value: "ein", text: "EIN" },
              ],
              aiHint:
                "Box 25, two small checkboxes labelled SSN and EIN right of the tax ID.",
            },
            {
              type: "text",
              name: "patientAccountNo",
              title: "Patient's account no.",
              aiHint: "Box 26, the provider's own reference for the patient.",
            },
            {
              type: "boolean",
              name: "acceptAssignment",
              title: "Accept assignment?",
              startWithNewLine: false,
              aiHint:
                "Box 27, bottom of the form, ACCEPT ASSIGNMENT?. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "totalCharge",
              title: "Total charge",
              inputType: "number",
              aiHint:
                "Box 28, dollars and cents in adjacent columns. '315 00' means 315.00.",
            },
            {
              type: "text",
              name: "amountPaid",
              title: "Amount paid",
              inputType: "number",
              startWithNewLine: false,
              aiHint: "Box 29, same dollars-and-cents layout as box 28.",
            },
            {
              type: "text",
              name: "providerSignature",
              title: "Provider signature",
              aiHint:
                "Box 31, on the SIGNED line. Often printed as SOF or SIGNATURE ON FILE.",
            },
            {
              type: "text",
              name: "providerSignatureDate",
              title: "Signed on",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 31, the DATE beside the signature. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "facilityName",
              title: "Service facility",
              aiHint: "Box 32, the first line of the service facility block.",
            },
            {
              type: "text",
              name: "facilityAddress",
              title: "Address",
              aiHint: "Box 32, the street line.",
            },
            {
              type: "text",
              name: "facilityCityStateZip",
              title: "City, state, ZIP",
              aiHint: "Box 32, the last line, as printed.",
            },
            {
              type: "text",
              name: "facilityNpi",
              title: "Facility NPI",
              aiHint:
                "Box 32a, the small field labelled a. immediately under the box 32 address block, left of the pre-printed NPI watermark. Ten digits.",
            },
            {
              type: "text",
              name: "billingName",
              title: "Billing provider",
              aiHint: "Box 33, the first line of the billing provider block.",
            },
            {
              type: "text",
              name: "billingAddress",
              title: "Address",
              aiHint: "Box 33, the street line.",
            },
            {
              type: "text",
              name: "billingCityStateZip",
              title: "City, state, ZIP",
              aiHint: "Box 33, the last line, as printed.",
            },
            {
              type: "text",
              name: "billingPhone",
              title: "Phone",
              aiHint:
                "Box 33, the PH # beside the heading. The area code sits inside the pre-printed parentheses; return (999) 999-9999.",
            },
            {
              type: "text",
              name: "billingNpi",
              title: "Billing NPI",
              aiHint:
                "Box 33a, the small field labelled a. immediately under the box 33 address block, at the bottom right of the form. Ten digits - it is printed even when it repeats box 32a.",
            },
          ],
        },
      ],
    },
  ],
  completedHtml: "<h4>Claim saved.</h4>",
};

export const insuranceClaimSchema: SchemaDefinition = {
  id: "insurance-claim",
  title: "Health Insurance Claim (CMS-1500)",
  description:
    "The standard US professional claim, box by box, with per-field extraction hints.",
  json: insuranceClaimJson,
};
