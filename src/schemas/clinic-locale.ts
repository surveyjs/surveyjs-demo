/**
 * The two languages the clinic demo speaks, and the one rule that decides which
 * one a visitor gets.
 *
 * It is deliberately tiny and dependency-free: the form definition, the lists
 * its choices are generated from, the page around it and the e2e suite all
 * import it, and it must stay loadable outside a bundler.
 *
 * `LocalizedText` is the shape survey-core reads for a localized string, so an
 * object of this type drops straight into a definition as a `title`, a
 * `description` or a choice's `text` — `default` is what every locale without a
 * translation falls back to, which here means English.
 */

export type ClinicLocale = "en" | "es";

export const CLINIC_LOCALES: readonly ClinicLocale[] = ["en", "es"];

export interface LocalizedText {
  readonly default: string;
  readonly es: string;
}

/** The one way a localized string is resolved outside survey-core. */
export function textFor(text: LocalizedText | string, locale: ClinicLocale): string {
  if (typeof text === "string") return text;
  return locale === "es" ? text.es : text.default;
}

/**
 * The locale a patient's chart asks for.
 *
 * `preferredLanguage` is a chart field, not a locale: it can say `vi`, `ru` or
 * `zh`, and this demo has no translation for any of them. Those patients get
 * the English form — honestly, rather than a half-translated one — which is why
 * everything but `es` maps to `en` instead of being passed through.
 */
export function chartLocale(preferredLanguage: unknown): ClinicLocale {
  return preferredLanguage === "es" ? "es" : "en";
}
