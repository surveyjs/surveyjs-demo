/**
 * The "how it's built" explainers, read from Markdown.
 *
 * One file per example in `how/` at the repository root, named after its route:
 * `/leads` → `how/leads.md`, `/embedded/chart` → `how/embedded-chart.md`. A
 * person opens that file, reads it top to bottom and edits it without knowing
 * TypeScript — on GitHub's own preview included, which is why the body is plain
 * GitHub-flavoured Markdown and the two conventions that are not (`definition=`
 * blocks and edition markers) are an info string and an HTML comment.
 *
 * What this module does, and all it does:
 *
 *  - reads the file and splits the two-key front matter off it;
 *  - applies the edition rule, **before** anything parses Markdown: a block for
 *    the other edition keeps its words, loses its repository links (those files
 *    are not in this repository) and gains a badge linking the same explainer on
 *    that host;
 *  - drops what renders as nothing (`<!-- TODO: … -->`);
 *  - offers the pure helpers the renderer and `e2e/how-integrity.spec.ts` share,
 *    so a link cannot be resolved one way on the page and another in the test.
 *
 * It reads with `fs`, so it must stay out of every client bundle. `server-only`
 * is not importable from Playwright, so the rule is kept by hand instead: never
 * import this module from a `"use client"` file, and let the build say so.
 *
 * No React.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { features } from "@/features";
import { allNavPages, type NavId, type NavPage } from "@/schemas/navigation";
import { howHref, otherEditionHref } from "@/lib/routes";
import { HOW_BUILT_TEXT } from "@/lib/how-built";

/** Where the Markdown lives, relative to the repository root. */
export const HOW_CONTENT_DIR = "how";

/** Not an example: the conventions, for whoever edits one. The loader skips it. */
export const HOW_README = "README.md";

export interface HowContent {
  readonly nav: NavPage;
  /** Front matter `summary`: the meta description, the lead paragraph and the index card. */
  readonly summary: string;
  /** The body, edition rule applied, ready for the Markdown renderer. */
  readonly body: string;
}

/** `/embedded/chart` → `embedded-chart.md`. Derived, so a route and a file cannot disagree. */
export function howFileName(navPath: string): string {
  return `${navPath.replace(/^\//, "").replace(/\//g, "-")}.md`;
}

/** The file for a route, as a repository path. */
export function howFilePath(navPath: string): string {
  return `${HOW_CONTENT_DIR}/${howFileName(navPath)}`;
}

/** The file for a route, on disk. `process.cwd()` is the repository root in a build and in a test. */
export function howFileFullPath(navPath: string): string {
  return path.join(process.cwd(), HOW_CONTENT_DIR, howFileName(navPath));
}

// ------------------------------------------------------------- front matter

export interface FrontMatter {
  readonly data: Readonly<Record<string, string>>;
  readonly body: string;
}

/**
 * The two `key: value` lines between the opening fences. Hand-parsed: a
 * dependency for two keys would be a dependency to keep up to date, and the
 * shape is checked by the integrity test rather than by a schema here.
 */
export function parseFrontMatter(source: string): FrontMatter {
  const text = source.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text.trim() };

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    if (line.trim() === "") continue;
    const split = line.indexOf(":");
    if (split === -1) continue;
    data[line.slice(0, split).trim()] = line.slice(split + 1).trim();
  }
  return { data, body: text.slice(match[0].length).trim() };
}

// ------------------------------------------------------------------- links

/** What a Markdown link in a how file points at. */
export type HowLinkKind = "repository" | "route" | "external";

export function howLinkKind(href: string): HowLinkKind {
  if (href.startsWith("/")) return "route";
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return "external";
  return "repository";
}

/**
 * A relative link resolved to a repository path.
 *
 * Written relative to the Markdown file, so `../src/schemas/leads.ts` from
 * `how/` is `src/schemas/leads.ts` — and the same link works in GitHub's preview
 * and in an editor, which is the point. A path with parentheses uses the `<…>`
 * link form, and the angle brackets are the renderer's, not part of the path.
 *
 * `undefined` when the link escapes the repository, which the integrity test
 * fails on.
 */
export function repoPathFromLink(href: string): string | undefined {
  const raw = decodeURI(href.replace(/^<|>$/g, "")).split("#")[0];
  const joined = path.posix.join(HOW_CONTENT_DIR, raw);
  const normalized = path.posix.normalize(joined);
  if (normalized.startsWith("../") || normalized === ".." || normalized.startsWith("/")) {
    return undefined;
  }
  return normalized;
}

// ------------------------------------------------------------ quoted blocks

/** A fenced block that quotes something this repository really says. */
export type HowQuote =
  | { readonly kind: "definition"; readonly element: string; readonly property: string }
  | { readonly kind: "file"; readonly path: string };

/**
 * A fenced block's info string, past the language.
 *
 * `definition=<element>.<property>` splits at the **first** dot: an element
 * never has one (`(survey)`, `lineItems › discountPct`) and a property often
 * does (`title.es`, `maskSettings.pattern`). The integrity test resolves what
 * comes out against the shipped definition, so a name that broke the rule would
 * fail there rather than render something wrong.
 */
export function parseQuoteMeta(meta: string | undefined): HowQuote | undefined {
  if (!meta) return undefined;
  const definition = /(?:^|\s)definition=(.+)$/.exec(meta.trim());
  if (definition) {
    const ref = definition[1].trim();
    const dot = ref.indexOf(".");
    if (dot <= 0 || dot === ref.length - 1) return undefined;
    return { kind: "definition", element: ref.slice(0, dot), property: ref.slice(dot + 1) };
  }
  const file = /(?:^|\s)file=(.+)$/.exec(meta.trim());
  if (file) return { kind: "file", path: file[1].trim() };
  return undefined;
}

// ----------------------------------------------------------------- editions

export const EDITION_OPEN = /^<!--\s*edition:\s*(mit|full)\s*-->\s*$/;
export const EDITION_CLOSE = /^<!--\s*\/edition\s*-->\s*$/;

/**
 * A Markdown link, in either the plain or the `<…>` destination form.
 *
 * The label may hold balanced brackets, because a repository path often does:
 * `[src/app/api/…/[id]/route.ts](<../src/app/api/…/[id]/route.ts>)`. Exported
 * so `e2e/how-integrity.spec.ts` reads a link exactly as the loader does.
 */
export const MARKDOWN_LINK = /\[((?:[^[\]]|\[[^\]]*\])*)\]\((<[^>\n]*>|[^)\s]*)\)/g;

/**
 * A block for the other edition: the words stay, the repository links go.
 *
 * The file named there is in the *other* repository, and `brand.sourceUrl` is
 * this one — so it is set in monospace and not linked, exactly as
 * `inThisEdition` used to decide it.
 */
function delinkRepositoryLinks(text: string): string {
  return text.replace(MARKDOWN_LINK, (whole, label: string, href: string) =>
    howLinkKind(href.replace(/^<|>$/g, "")) === "repository" ? `\`${label}\`` : whole,
  );
}

/** Every `<!-- TODO: … -->`, with the line it is on. The test counts and prints them. */
export function findTodos(body: string): { readonly line: number; readonly todo: string }[] {
  return body.split("\n").flatMap((line, index) => {
    const match = /<!--\s*TODO:\s*([\s\S]*?)-->/.exec(line);
    return match ? [{ line: index + 1, todo: match[1].trim() }] : [];
  });
}

/**
 * The edition rule, applied to the body before anything parses it.
 *
 * In this edition's own blocks the markers simply go. In the other edition's,
 * the block keeps its words — a feature this edition does not ship is a link
 * across, never a gap — loses its repository links, and gains the badge.
 *
 * Throws on an unclosed or a nested marker, which the integrity test also
 * checks: a swallowed block would quietly hide a paragraph.
 */
export function applyEditionRule(body: string, navPath: string): string {
  const badge = `[${HOW_BUILT_TEXT.otherEdition}](${otherEditionHowHref(navPath)})`;
  const out: string[] = [];
  let open: { edition: string; lines: string[] } | undefined;

  for (const [index, line] of body.split("\n").entries()) {
    const start = EDITION_OPEN.exec(line);
    if (start) {
      if (open) throw new Error(`${navPath}: nested edition marker on line ${index + 1}`);
      open = { edition: start[1], lines: [] };
      continue;
    }
    if (EDITION_CLOSE.test(line)) {
      if (!open) throw new Error(`${navPath}: edition marker closed but never opened, line ${index + 1}`);
      const text = open.lines.join("\n");
      out.push(
        open.edition === features.edition
          ? text
          : `${delinkRepositoryLinks(text).replace(/\s+$/, "")}\n\n${badge}`,
      );
      open = undefined;
      continue;
    }
    (open ? open.lines : out).push(line);
  }

  if (open) throw new Error(`${navPath}: an edition marker is never closed`);
  return out.join("\n");
}

/** The badge's link: the same explainer on the other edition's host. */
export function otherEditionHowHref(navPath: string): string {
  return otherEditionHref(features.brand.otherEdition.baseUrl, howHref(navPath));
}

// ------------------------------------------------------------------ loading

const cache = new Map<string, HowContent>();

/** The file as it is on disk, front matter and all. */
export function readHowSource(navPath: string): string {
  return readFileSync(howFileFullPath(navPath), "utf8");
}

function navById(navId: NavId): NavPage {
  const nav = allNavPages.find((item) => item.id === navId);
  if (!nav) throw new Error(`No sidebar row for ${navId}`);
  return nav;
}

/** One example's explainer: its row, its one sentence, and its body. */
export function getHowContent(navId: NavId): HowContent {
  const cached = cache.get(navId);
  if (cached) return cached;

  const nav = navById(navId);
  const { data, body } = parseFrontMatter(readHowSource(nav.path));
  if (data.nav !== navId) {
    throw new Error(`${howFilePath(nav.path)}: front matter says nav: ${data.nav ?? "(none)"}`);
  }
  if (!data.summary) throw new Error(`${howFilePath(nav.path)}: front matter has no summary`);

  const content: HowContent = {
    nav,
    summary: data.summary,
    // A TODO renders as nothing; it is a note to whoever edits the file.
    body: applyEditionRule(body, nav.path).replace(/^[^\S\n]*<!--\s*TODO:[\s\S]*?-->[^\S\n]*\n?/gm, ""),
  };
  cache.set(navId, content);
  return content;
}

/**
 * Every example, in sidebar order, from **both** editions' rows.
 *
 * An example this edition does not ship is still listed — as one the other
 * edition has, linked to that host — rather than silently missing, which is what
 * `/how` renders and what the index card for `/mysurveys` is in the MIT edition.
 */
export function listHowContent(): readonly HowContent[] {
  return allNavPages.map((nav) => getHowContent(nav.id));
}
