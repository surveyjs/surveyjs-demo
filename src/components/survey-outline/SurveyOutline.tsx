"use client";

import { useEffect, type ReactNode } from "react";
import { mergeTailwindClasses } from "@/lib/utils";

/**
 * The "SurveyJS renders this" outline: a pulsing ring around the element SurveyJS
 * draws, and a corner label that names it.
 *
 * Two attributes do all of it, and the ring, the pulse and the label are CSS in
 * `globals.css`. `data-demo-highlight` on `<html>` turns the outline on for as
 * long as a page that wants it is on screen; `data-survey-root` marks the
 * boundary of what the library drew. Everything outside that boundary is the
 * page's own markup: the mock site on an embedded demo, the application's
 * heading and actions on a records page.
 */

/**
 * Turns the outline on while the calling component is mounted. The embedded
 * demos call it through `useDemo`; the records pages call it directly.
 */
export function useSurveyOutline(): void {
  // One attribute on <html> for as long as the caller is on screen; the outline
  // itself is in `globals.css`, keyed off the `data-survey-root` marker that
  // `SurveyCard` and `SurveyOutline` carry.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-demo-highlight", "");
    return () => root.removeAttribute("data-demo-highlight");
  }, []);
}

/**
 * Drops the outline until the page remounts. One-way on purpose: nothing brings
 * the ring back, and switching records does not either.
 */
export function hideSurveyOutline(): void {
  document.documentElement.removeAttribute("data-demo-highlight");
}

/**
 * The corner label. It is a button rather than a pseudo-element because it is
 * also the way out: whoever has seen where the form is drawn dismisses the ring
 * from the ring itself, which is where they are already looking. Hidden by CSS
 * unless the outline is on.
 */
export function SurveyOutlineLabel() {
  return (
    <button
      type="button"
      data-survey-outline-label=""
      title="Hide the outline and look at the page as a visitor would"
      onClick={hideSurveyOutline}
    >
      SurveyJS renders this (hide selection)
    </button>
  );
}

/**
 * The boundary of what SurveyJS draws, with its label, and nothing else: no card,
 * no border. For a container that already has its own look, render
 * `data-survey-root` on it and `SurveyOutlineLabel` inside, as `SurveyCard` does.
 */
export function SurveyOutline({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-survey-root="" className={mergeTailwindClasses("relative", className)}>
      <SurveyOutlineLabel />
      {children}
    </div>
  );
}
