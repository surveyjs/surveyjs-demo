import { sanitizeResponse, type Rejection } from "@/lib/checks/check-response";
import type { SurveyData, SurveyJSON } from "@/schemas";

/**
 * What `/api/extract` does with a reading once the provider has answered.
 *
 * A model is not a client of this application and cannot be trusted to answer
 * within the form: it can name a question that does not exist, pick a choice
 * that is not on the list, or put a string where a matrix expects rows. So the
 * reading goes through the same shape check the write routes use, against the
 * same definition they will use, and whatever does not fit is dropped and
 * **named**. One off-list value then costs one field, not the whole reading —
 * and what comes back is storable by the record route by construction.
 *
 * It lives beside the handler rather than inside it for two reasons: a Next.js
 * route file may export nothing but its handlers, and `e2e/extract.spec.ts`
 * stubs the whole route with `page.route`, which replaces exactly the code worth
 * testing. This is callable from a spec with no provider key and no browser.
 */
export function takeFromDocument(
  definition: SurveyJSON,
  reading: SurveyData,
): { data: SurveyData; rejected: readonly Rejection[] } {
  const { data, rejections } = sanitizeResponse(definition, reading);
  return { data, rejected: rejections };
}
