#!/usr/bin/env node
/**
 * Keep this repository a copy of the MIT edition, except where it is allowed to differ.
 *
 *   node scripts/mit-sync.mjs check [--no-fetch]
 *   node scripts/mit-sync.mjs apply [--dry-run]
 *
 * This repository is a downstream of surveyjs-nextjs-demo-mit. The two have
 * unrelated git histories on purpose: they are never merged. Every path that is
 * not listed in `scripts/allowlist.txt` is a byte-for-byte copy of the same path
 * in `mit/main`, and `apply` is what makes that true again after the MIT edition
 * moves. Paths in `scripts/mit-only.txt` belong to the MIT edition alone and are
 * never copied here.
 *
 * Run it from the repository root, with a remote named `mit` pointing at
 * https://github.com/surveyjs/surveyjs-nextjs-demo-mit. It never commits.
 *
 * No dependencies, so it runs in CI right after checkout.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const MIT_REF = "mit/main";
const BASE_FILE = ".mit-base";

/** Extra dependencies this edition is allowed to carry. */
const COMMERCIAL_PACKAGES = [
  "survey-creator-core",
  "survey-creator-react",
  "survey-pdf",
  "survey-analytics",
];

// ---------------------------------------------------------------- git helpers

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure) return null;
    const stderr = (error.stderr || "").toString().trim();
    fail(`git ${args.join(" ")} failed${stderr ? `:\n${stderr}` : ""}`);
  }
}

function lines(output) {
  if (!output) return [];
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Run a git command over many paths without overflowing the command line. */
function gitBatched(prefix, paths, { chunk = 200 } = {}) {
  for (let i = 0; i < paths.length; i += chunk) {
    git([...prefix, ...paths.slice(i, i + chunk)]);
  }
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

// -------------------------------------------------------------- glob matching

/**
 * A minimal glob: `**` spans directories, `*` and `?` stay within one segment,
 * anything else is literal. Enough for a path allowlist, and nothing more.
 */
function globToRegExp(pattern) {
  let source = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        source += ".*";
        i += 1;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

function readPatterns(fileName) {
  const path = join(SCRIPT_DIR, fileName);
  if (!existsSync(path)) fail(`Missing ${fileName} next to this script.`);
  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => ({ pattern: line, regexp: globToRegExp(line) }));
}

function matches(patterns, path) {
  return patterns.some((entry) => entry.regexp.test(path));
}

// ------------------------------------------------------------------ the model

function loadLists() {
  const allowlist = readPatterns("allowlist.txt");
  const mitOnly = readPatterns("mit-only.txt");
  return {
    allowlist,
    mitOnly,
    /** A path this repository does not own: it must equal the MIT edition's. */
    isManaged: (path) => !matches(allowlist, path) && !matches(mitOnly, path),
  };
}

function requireMitRef() {
  const ref = git(["rev-parse", "--verify", `${MIT_REF}^{commit}`], {
    allowFailure: true,
  });
  if (!ref) {
    fail(
      `No ${MIT_REF} in this clone. Add the remote once and fetch it:\n` +
        "  git remote add mit https://github.com/surveyjs/surveyjs-nextjs-demo-mit\n" +
        "  git fetch mit",
    );
  }
  return ref.trim();
}

function fetchMit() {
  console.log(`Fetching ${MIT_REF}…`);
  git(["fetch", "mit"]);
}

function mitPaths() {
  return lines(git(["ls-tree", "-r", "--name-only", MIT_REF]));
}

function trackedPaths() {
  return lines(git(["ls-files"]));
}

function untrackedPaths() {
  return lines(git(["ls-files", "--others", "--exclude-standard"]));
}

/**
 * Every managed path that does not match the MIT edition, against the working
 * tree rather than HEAD: what is on disk is what the app runs.
 */
function drift(isManaged) {
  const found = [];

  for (const line of lines(git(["diff", "--name-status", "--no-renames", MIT_REF]))) {
    const [status, path] = line.split(/\t/);
    if (!path || !isManaged(path)) continue;
    found.push({ status: status[0], path });
  }

  for (const path of untrackedPaths()) {
    if (!isManaged(path)) continue;
    found.push({ status: "A", path });
  }

  return found.sort((a, b) => a.path.localeCompare(b.path));
}

// ----------------------------------------------------------- package.json gate

function readJsonFromRef(ref, path) {
  const raw = git(["show", `${ref}:${path}`], { allowFailure: true });
  return raw ? JSON.parse(raw) : null;
}

/**
 * This repository's package.json is allowlisted, so nothing forces it to stay in
 * step with the MIT edition's. It still has to: the two ship the same app, and a
 * dependency that drifts here is a difference nobody chose.
 */
function checkPackageJson() {
  const mine = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
  const theirs = readJsonFromRef(MIT_REF, "package.json");
  if (!theirs) return [];

  const notes = [];

  for (const field of ["dependencies", "devDependencies"]) {
    const ours = mine[field] || {};
    const base = theirs[field] || {};
    for (const [name, spec] of Object.entries(base)) {
      if (!(name in ours)) notes.push(`${field}: ${name} is in the MIT edition and missing here`);
      else if (ours[name] !== spec)
        notes.push(`${field}: ${name} is "${ours[name]}" here and "${spec}" in the MIT edition`);
    }
    for (const name of Object.keys(ours)) {
      if (name in base) continue;
      if (COMMERCIAL_PACKAGES.includes(name)) continue;
      notes.push(`${field}: ${name} is here and not in the MIT edition`);
    }
  }

  const ourScripts = JSON.stringify(mine.scripts || {});
  const theirScripts = JSON.stringify(theirs.scripts || {});
  if (ourScripts !== theirScripts) notes.push("scripts: the two package.json script blocks differ");

  return notes;
}

// --------------------------------------------------------------------- checks

function runCheck({ fetch }) {
  if (fetch) fetchMit();
  requireMitRef();

  const { isManaged } = loadLists();
  const offenders = drift(isManaged);
  const notes = checkPackageJson();

  if (notes.length) {
    console.log("\nWarnings (package.json is allowlisted, so these do not fail the check):");
    for (const note of notes) console.log(`  ! ${note}`);
  }

  if (offenders.length) {
    console.error(
      `\n${offenders.length} path(s) differ from ${MIT_REF} and are not allowlisted:\n`,
    );
    for (const { status, path } of offenders) console.error(`  ${status}  ${path}`);
    console.error(
      "\nA  only here      M  edited here      D  deleted here\n" +
        "\nShared code is edited in the MIT edition, not here. Either move the change\n" +
        "there and re-sync, or, if this path really belongs to this edition, add it to\n" +
        "scripts/allowlist.txt with the reason in the commit message.\n" +
        "\n  node scripts/mit-sync.mjs apply\n",
    );
    process.exit(1);
  }

  console.log("identity check passed");
}

// ---------------------------------------------------------------------- apply

function runApply({ dryRun }) {
  const { isManaged } = loadLists();

  const dirty = lines(git(["status", "--porcelain"]))
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3).replace(/^"|"$/g, "") }))
    .filter((entry) => entry.status !== "??" && isManaged(entry.path));

  if (dirty.length && !dryRun) {
    console.error("\nUncommitted changes to files this sync would overwrite:\n");
    for (const { status, path } of dirty) console.error(`  ${status}  ${path}`);
    fail("Commit or discard them first.");
  }

  if (!dryRun) fetchMit();
  const sha = requireMitRef();

  const inMit = mitPaths();
  const mitSet = new Set(inMit);

  const toCopy = inMit.filter(isManaged);
  const toRemove = trackedPaths().filter((path) => isManaged(path) && !mitSet.has(path));

  // What actually differs, so the summary is about changes rather than files.
  const changing = new Set(drift(isManaged).map((entry) => entry.path));

  console.log(`\n${MIT_REF} is at ${sha.slice(0, 12)}`);
  console.log(`${toCopy.length} managed path(s), of which ${changing.size} differ here.`);

  const copying = toCopy.filter((path) => changing.has(path));
  if (copying.length) {
    console.log("\nCopy from the MIT edition:");
    for (const path of copying) console.log(`  + ${path}`);
  }
  if (toRemove.length) {
    console.log("\nRemove (not in the MIT edition, not allowlisted):");
    for (const path of toRemove) console.log(`  - ${path}`);
  }
  if (!copying.length && !toRemove.length) console.log("\nNothing to copy or remove.");

  if (dryRun) {
    console.log("\n--dry-run: nothing was changed.");
    return;
  }

  if (toCopy.length) gitBatched(["checkout", sha, "--"], toCopy);
  if (toRemove.length) gitBatched(["rm", "-q", "--"], toRemove);

  writeFileSync(join(REPO_ROOT, BASE_FILE), `${sha}\n`, "utf8");
  console.log(`\nWrote ${BASE_FILE}.`);

  runCheck({ fetch: false });

  console.log(
    "\nNothing is committed. Review, then:\n" +
      `  git add -A && git commit -m "sync from mit@${sha.slice(0, 12)}"\n`,
  );
}

// ----------------------------------------------------------------------- main

const [command, ...flags] = process.argv.slice(2);

if (command === "check") {
  runCheck({ fetch: !flags.includes("--no-fetch") });
} else if (command === "apply") {
  runApply({ dryRun: flags.includes("--dry-run") });
} else {
  console.error(
    "Usage:\n" +
      "  node scripts/mit-sync.mjs check [--no-fetch]\n" +
      "  node scripts/mit-sync.mjs apply [--dry-run]\n",
  );
  process.exit(2);
}
