import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { features, type Edition } from "../src/features";
import { collectProperties } from "../src/lib/how-built";
import {
  HOW_CONTENT_DIR,
  HOW_README,
  MARKDOWN_LINK,
  EDITION_OPEN,
  EDITION_CLOSE,
  howFileName,
  howLinkKind,
  parseFrontMatter,
  parseQuoteMeta,
  repoPathFromLink,
  type HowQuote,
} from "../src/lib/how-content";
import { HOW_INDEX, howHref } from "../src/lib/routes";
import { allNavPages, type NavPage } from "../src/schemas/navigation";
import { getSchemaDefinition } from "../src/schemas";

/**
 * The explainers' Markdown, without a browser, in both editions.
 *
 * The first pass bought a guarantee with types: a how page cannot quote a
 * definition that no longer says that, link a file that is not there, or link a
 * route that does not exist. The words are prose now, so the guarantee is this
 * file instead — and it is the same guarantee, checked against the same
 * `collectProperties` walk the page is rendered from.
 *
 * It **passes** with TODOs and prints each one: a TODO is the honest state of a
 * sentence nobody has written, and failing a build over one would only invite
 * filler prose. Everything else here is a failure.
 */

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, HOW_CONTENT_DIR);

/** The hosts an external link in a how file may point at. Extend it with the reason, never silently. */
const LINK_HOSTS = ["surveyjs.io"];

/** The three HTML comments the contract allows; any other raw HTML is a failure. */
const ALLOWED_COMMENT = /^<!--\s*(edition:\s*(mit|full)|\/edition|TODO:[\s\S]*?)\s*-->$/;

interface Fence {
  readonly line: number;
  readonly info: string;
  readonly text: string;
  readonly edition?: Edition;
}

interface Link {
  readonly line: number;
  readonly href: string;
  readonly label: string;
  readonly edition?: Edition;
}

interface Scan {
  readonly fences: readonly Fence[];
  readonly links: readonly Link[];
  /** Every line outside a fenced block, with the edition block it sits in. */
  readonly prose: readonly { line: number; text: string; edition?: Edition }[];
  readonly headings: readonly string[];
  readonly todos: readonly { line: number; todo: string }[];
}

/**
 * The body, read the way the renderer reads it: fenced blocks with their info
 * strings, links with the edition block they sit in, and the prose in between.
 *
 * Deliberately a small line scanner rather than a Markdown parser: what it has
 * to agree with is the fence and the comment, and both are line-anchored by the
 * contract ("blocks wrap whole paragraphs or sections, never part of a line").
 */
function scan(body: string, where: string): Scan {
  const fences: Fence[] = [];
  const links: Link[] = [];
  const prose: { line: number; text: string; edition?: Edition }[] = [];
  const headings: string[] = [];
  const todos: { line: number; todo: string }[] = [];

  let edition: Edition | undefined;
  let fence: { marker: string; info: string; line: number; lines: string[] } | undefined;

  body.split("\n").forEach((line, index) => {
    const number = index + 1;

    if (fence) {
      if (line.trimEnd() === fence.marker) {
        fences.push({ line: fence.line, info: fence.info, text: fence.lines.join("\n"), edition });
        fence = undefined;
      } else {
        fence.lines.push(line);
      }
      return;
    }

    const open = /^(`{3,})(.*)$/.exec(line);
    if (open) {
      fence = { marker: open[1], info: open[2].trim(), line: number, lines: [] };
      return;
    }

    const start = EDITION_OPEN.exec(line);
    if (start) {
      expect(edition, `${where}:${number}: a nested edition marker`).toBeUndefined();
      edition = start[1] as Edition;
      return;
    }
    if (EDITION_CLOSE.test(line)) {
      expect(edition, `${where}:${number}: an edition marker closed but never opened`).toBeDefined();
      edition = undefined;
      return;
    }

    const todo = /<!--\s*TODO:\s*([\s\S]*?)-->/.exec(line);
    if (todo) todos.push({ line: number, todo: todo[1].trim() });

    const heading = /^(#{2,6})\s+(.*)$/.exec(line);
    if (heading) headings.push(heading[2].trim());

    prose.push({ line: number, text: line, edition });
    for (const match of line.matchAll(MARKDOWN_LINK)) {
      links.push({ line: number, label: match[1], href: match[2], edition });
    }
  });

  expect(fence, `${where}: a fenced block is never closed`).toBeUndefined();
  expect(edition, `${where}: an edition marker is never closed`).toBeUndefined();
  return { fences, links, prose, headings, todos };
}

interface HowFile {
  readonly nav: NavPage;
  readonly file: string;
  readonly summary: string;
  readonly keys: readonly string[];
  readonly body: string;
  readonly scan: Scan;
}

const FILES: HowFile[] = allNavPages.map((nav) => {
  const file = `${HOW_CONTENT_DIR}/${howFileName(nav.path)}`;
  // A missing file is the listing test's finding, with the name it is missing
  // under; reading it here would only throw at collection time instead.
  const full = path.join(ROOT, file);
  const source = existsSync(full) ? readFileSync(full, "utf8") : "";
  const { data, body } = parseFrontMatter(source);
  return {
    nav,
    file,
    summary: data.summary ?? "",
    keys: Object.keys(data),
    body,
    scan: scan(body, file),
  };
});

/** Whether something in a block for `edition` belongs to this repository at all. */
function here(edition: Edition | undefined): boolean {
  return edition === undefined || edition === features.edition;
}

test("every page has a file, and every file a page", () => {
  const onDisk = readdirSync(DIR)
    .filter((name) => name.endsWith(".md") && name !== HOW_README)
    .sort();
  const expected = allNavPages.map((nav) => howFileName(nav.path)).sort();
  expect(onDisk, `${HOW_CONTENT_DIR}/ and the sidebar disagree`).toEqual(expected);
  // The README is for whoever edits one; the loader ignores it.
  expect(existsSync(path.join(DIR, HOW_README))).toBe(true);
});

for (const entry of FILES) {
  test.describe(entry.file, () => {
    test("front matter is the two keys, and the summary is one sentence", () => {
      expect(existsSync(path.join(ROOT, entry.file)), `${entry.file} is not on disk`).toBe(true);
      expect([...entry.keys].sort(), "front matter keys").toEqual(["nav", "summary"]);
      expect(entry.nav.id, "front matter names another row").toBe(
        parseFrontMatter(readFileSync(path.join(ROOT, entry.file), "utf8")).data.nav,
      );
      expect(entry.summary.length, "the summary is over 200 characters").toBeLessThanOrEqual(200);
      expect(entry.summary.length, "the summary is empty").toBeGreaterThan(0);
      const terminators = entry.summary.match(/[.!?](\s|$)/g) ?? [];
      expect(terminators.length, "the summary is more than one sentence").toBe(1);
      expect(/[.!?]$/.test(entry.summary), "the summary does not end in a terminator").toBe(true);
      // The `<h1>` comes from the sidebar row, so the file must not carry one.
      expect(/^#\s/m.test(entry.body), "a level-one heading belongs to the page").toBe(false);
    });

    test("every repository link is a file in this repository", () => {
      const repoLinks = entry.scan.links.filter((link) => howLinkKind(strip(link.href)) === "repository");
      expect(repoLinks.length, "no repository link at all").toBeGreaterThan(0);
      for (const link of repoLinks) {
        // A block for the other edition names files that are not in this
        // repository; the loader de-links them and this does not look for them.
        if (!here(link.edition)) continue;
        const repoPath = repoPathFromLink(strip(link.href));
        expect(repoPath, `${entry.file}:${link.line}: ${link.href} escapes the repository`).toBeDefined();
        expect(
          existsSync(path.join(ROOT, repoPath!)),
          `${entry.file}:${link.line}: ${repoPath} is not on disk`,
        ).toBe(true);
      }
    });

    test("every route it links lands on a page.tsx", () => {
      for (const link of entry.scan.links) {
        if (howLinkKind(strip(link.href)) !== "route") continue;
        const target = strip(link.href).split("#")[0];
        const candidates =
          target === HOW_INDEX || target.endsWith("/how")
            ? [`src/app/(shell)${target}/page.tsx`]
            : [`src/app/(shell)${target}/page.tsx`, `src/app${target}/page.tsx`];
        expect(
          candidates.some((file) => existsSync(path.join(ROOT, file))),
          `${entry.file}:${link.line}: ${target} has no page.tsx`,
        ).toBe(true);
      }
    });

    test("every external link is https on a host we name", () => {
      for (const link of entry.scan.links) {
        if (howLinkKind(strip(link.href)) !== "external") continue;
        const href = strip(link.href);
        expect(href.startsWith("https://"), `${entry.file}:${link.line}: ${href} is not https`).toBe(true);
        expect(
          LINK_HOSTS.includes(new URL(href).host),
          `${entry.file}:${link.line}: ${new URL(href).host} is not an allow-listed host`,
        ).toBe(true);
      }
    });

    test("every quoted block says what the repository says", () => {
      const quoted = entry.scan.fences.flatMap((fenceEntry) => {
        const quote = parseQuoteMeta(fenceEntry.info);
        return quote ? [{ fence: fenceEntry, quote }] : [];
      });
      expect(quoted.length, "nothing is quoted at all").toBeGreaterThan(0);

      for (const { fence, quote } of quoted) {
        const at = `${entry.file}:${fence.line}`;
        if (quote.kind === "file") {
          expect(existsSync(path.join(ROOT, quote.path)), `${at}: ${quote.path} is not on disk`).toBe(true);
          expect(
            readFileSync(path.join(ROOT, quote.path), "utf8").includes(fence.text),
            `${at}: ${quote.path} no longer contains this block`,
          ).toBe(true);
          continue;
        }
        expect(entry.nav.schemaId, `${at}: quotes a definition, but the page renders no form`).toBeTruthy();
        // An element and a property do not identify one entry — a choice carries
        // its question's name — so any of them matching is the quotation holding.
        const values = collectProperties(getSchemaDefinition(entry.nav.schemaId!).json).filter(
          (property) => property.element === quote.element && property.property === quote.property,
        );
        expect(values.length, `${at}: ${describe(quote)} is not in the definition`).toBeGreaterThan(0);
        expect(
          values.some((property) => String(property.value) === fence.text),
          `${at}: ${describe(quote)} is ${values.map((v) => JSON.stringify(String(v.value))).join(" or ")}, not ${JSON.stringify(fence.text)}`,
        ).toBe(true);
      }
    });

    test("no raw HTML but the comments the contract allows", () => {
      for (const line of entry.scan.prose) {
        const text = line.text
          .replace(/`[^`]*`/g, "")
          .replace(/\]\(<[^>]*>\)/g, "](…)");
        for (const match of text.matchAll(/<!--[\s\S]*?-->/g)) {
          expect(
            ALLOWED_COMMENT.test(match[0]),
            `${entry.file}:${line.line}: ${match[0]} is not one of the two comment forms`,
          ).toBe(true);
        }
        const withoutComments = text.replace(/<!--[\s\S]*?-->/g, "");
        expect(
          /<\/?[a-zA-Z][^>]*>/.test(withoutComments),
          `${entry.file}:${line.line}: raw HTML — ${line.text.trim()}`,
        ).toBe(false);
      }
    });
  });
}

/** A `<…>` link destination is the pointy-bracket form; the brackets are not the path. */
function strip(href: string): string {
  return href.replace(/^<|>$/g, "");
}

function describe(quote: HowQuote): string {
  return quote.kind === "file" ? quote.path : `${quote.element} ${quote.property}`;
}

test("a feature heading is spelled one way", () => {
  const spellings = new Map<string, Set<string>>();
  for (const entry of FILES) {
    for (const heading of entry.scan.headings) {
      const key = heading.toLowerCase().replace(/\s*\*\(coming\)\*\s*$/, "").replace(/[^a-z0-9]+/g, " ").trim();
      const set = spellings.get(key) ?? new Set<string>();
      set.add(heading.replace(/\s*\*\(coming\)\*\s*$/, ""));
      spellings.set(key, set);
    }
  }
  const disagreeing = [...spellings.values()].filter((set) => set.size > 1);
  // An annotation, not a failure: consistency across files is a human's job,
  // and this is the note that tells them where to look.
  test.info().annotations.push({
    type: "how headings spelled two ways",
    description:
      disagreeing.length === 0
        ? "none"
        : disagreeing.map((set) => [...set].join(" / ")).join("\n"),
  });
  expect(spellings.size).toBeGreaterThan(0);
});

test("the TODOs, counted and named", () => {
  const notes = FILES.flatMap((entry) =>
    entry.scan.todos.map((todo) => `${entry.file}:${todo.line}: ${todo.todo}`),
  );
  test.info().annotations.push({
    type: "how-built TODOs",
    description: notes.length === 0 ? "none" : notes.join("\n"),
  });
  // Not an assertion about the count: a TODO is allowed, and is not filler.
  expect(notes.every((note) => note.trim().length > 0)).toBe(true);
});

test("an example this edition does not ship is still listed, and linked across", () => {
  const elsewhere = FILES.filter((entry) => !here(entry.nav.edition));
  for (const entry of elsewhere) {
    // The file is here, so the index can list it and link the other host.
    expect(existsSync(path.join(ROOT, entry.file))).toBe(true);
    expect(howHref(entry.nav.path)).toBe(`${entry.nav.path}/how`);
  }
  expect(elsewhere.map((entry) => entry.nav.id)).toEqual(
    features.edition === "mit" ? ["mySurveys"] : [],
  );
});
