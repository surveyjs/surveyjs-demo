import type { SessionUser } from "@/schemas";

export type { SessionUser };

/**
 * The third seam between this template and your storage: who the page is
 * rendered for. Its siblings are `survey-json.ts`, the survey definitions, and
 * `survey-results.ts`, the answers.
 *
 * A records page reads this on the server and hands the first user to the form
 * as the `user` variable, so the definition can read `{user.role}`. In your app
 * the body is `getSession()`, and the list has exactly one entry; the template
 * keeps several per page so a reviewer can switch between them and watch the
 * same record change for someone else.
 *
 * Keyed by scope — a page's collection id. No page has users yet.
 */
const SESSION_USERS: Readonly<Record<string, readonly SessionUser[]>> = {};

/**
 * The users a page lets a reviewer sign in as, first one signed in. In your app
 * this is `getSession()`, and there is exactly one. A page with nobody to switch
 * between gets an empty list.
 */
export async function listSessionUsers(scope: string): Promise<readonly SessionUser[]> {
  return SESSION_USERS[scope] ?? [];
}
