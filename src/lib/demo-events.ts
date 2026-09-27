/**
 * The one event the demo's own chrome listens for: somebody finished a form.
 *
 * Emitted where the finishing happens — an embedded survey's `onComplete`, a
 * submission that was stored, a record that was saved — and heard by the
 * dock's "See next" card. A window event rather than a context, so an emitter
 * needs no provider and the card needs no prop from any of them. No React.
 */

export const DEMO_COMPLETED = "demo:completed";

export function announceCompleted(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_COMPLETED));
}
