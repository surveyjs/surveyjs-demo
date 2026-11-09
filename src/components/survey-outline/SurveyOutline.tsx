"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
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
export function useSurveyOutline(enabled = true): void {
  // One attribute on <html> for as long as the caller is on screen; the outline
  // itself is in `globals.css`, keyed off the `data-survey-root` marker that
  // `SurveyCard` and `SurveyOutline` carry.
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.setAttribute("data-demo-outline", "");
    root.setAttribute("data-demo-highlight", "");
    return () => {
      root.removeAttribute("data-demo-outline");
      root.removeAttribute("data-demo-highlight");
    };
  }, [enabled]);
}

function subscribeToOutline(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-demo-outline", "data-demo-highlight"],
  });
  return () => observer.disconnect();
}

function getOutlineState() {
  const root = document.documentElement;
  if (!root.hasAttribute("data-demo-outline")) return "unavailable";
  return root.hasAttribute("data-demo-highlight") ? "visible" : "hidden";
}

/** The dock controls the same attributes that the page's outline hook owns. */
export function useSurveyOutlineControl() {
  const state = useSyncExternalStore(subscribeToOutline, getOutlineState, () => "unavailable");
  return {
    available: state !== "unavailable",
    visible: state === "visible",
    toggle: () => document.documentElement.toggleAttribute("data-demo-highlight"),
  };
}

/** The label and outer edge dismiss the highlight without covering the form. */
export function SurveyOutlineLabel() {
  return (
    <button
      type="button"
      data-survey-outline-dismiss=""
      aria-label="SurveyJS renders this. Hide SurveyJS Outlines"
      onClick={() => document.documentElement.removeAttribute("data-demo-highlight")}
      // The demo talking about the page, like the dock — English in every
      // locale, including inside a host site rendered in Spanish.
      lang="en"
    >
      <span data-survey-outline-edge="top" aria-hidden="true" />
      <span data-survey-outline-edge="right" aria-hidden="true" />
      <span data-survey-outline-edge="bottom" aria-hidden="true" />
      <span data-survey-outline-edge="left" aria-hidden="true" />
      <span data-survey-outline-label="">SurveyJS renders this</span>
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
  activate = false,
}: {
  className?: string;
  children: ReactNode;
  /** Activate the outline and its dock control when this boundary owns them. */
  activate?: boolean;
}) {
  useSurveyOutline(activate);

  return (
    <div data-survey-root="" className={mergeTailwindClasses("relative", className)}>
      <SurveyOutlineLabel />
      {children}
    </div>
  );
}
