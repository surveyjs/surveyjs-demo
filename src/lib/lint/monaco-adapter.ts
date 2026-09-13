export interface JsonPosition {
  /** 1-based, matching what an editor shows in its gutter. */
  readonly line: number;
  readonly column: number;
}

/**
 * Maps the dotted/bracketed paths the linter reports ("pages[0].elements[2].visibleIf")
 * onto positions in the JSON text they were read from.
 *
 * The linter analyses a parsed object and has no notion of source offsets, and
 * JSON.parse throws its own away, so the text is scanned once more here. The scan
 * records the position of a member's *key*, which is the line an editor should
 * point at.
 */
export function buildPathIndex(text: string): Map<string, JsonPosition> {
  const index = new Map<string, JsonPosition>();
  let i = 0;
  let line = 1;
  let lineStart = 0;

  const positionAt = (offset: number): JsonPosition => ({
    line,
    column: offset - lineStart + 1,
  });

  const fail = () => {
    // Malformed input is expected while someone is typing: give up and keep
    // whatever was indexed so far rather than throwing at the caller.
    i = text.length;
  };

  const skipWhitespace = () => {
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\n") {
        i++;
        line++;
        lineStart = i;
      } else if (ch === " " || ch === "\t" || ch === "\r") {
        i++;
      } else {
        break;
      }
    }
  };

  const readString = (): string | null => {
    if (text[i] !== "\"") return null;
    i++;
    let out = "";
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\\") {
        const next = text[i + 1];
        if (next === "u") {
          out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
          i += 6;
        } else {
          const escapes: Record<string, string> = {
            "\"": "\"", "\\": "\\", "/": "/", b: "\b",
            f: "\f", n: "\n", r: "\r", t: "\t",
          };
          out += escapes[next] ?? next;
          i += 2;
        }
      } else if (ch === "\"") {
        i++;
        return out;
      } else {
        if (ch === "\n") {
          line++;
          lineStart = i + 1;
        }
        out += ch;
        i++;
      }
    }
    return null;
  };

  const skipPrimitive = () => {
    while (i < text.length && !",}] \t\r\n".includes(text[i])) i++;
  };

  const readValue = (path: string) => {
    skipWhitespace();
    const ch = text[i];
    if (ch === "{") {
      i++;
      readMembers(path);
    } else if (ch === "[") {
      i++;
      readItems(path);
    } else if (ch === "\"") {
      readString();
    } else if (ch === undefined) {
      fail();
    } else {
      skipPrimitive();
    }
  };

  const readMembers = (path: string) => {
    for (;;) {
      skipWhitespace();
      if (i >= text.length) return fail();
      if (text[i] === "}") {
        i++;
        return;
      }
      if (text[i] === ",") {
        i++;
        continue;
      }
      const keyStart = i;
      const keyPosition = positionAt(keyStart);
      const key = readString();
      if (key === null) return fail();
      const childPath = path ? `${path}.${key}` : key;
      index.set(childPath, keyPosition);
      skipWhitespace();
      if (text[i] !== ":") return fail();
      i++;
      readValue(childPath);
    }
  };

  const readItems = (path: string) => {
    let itemIndex = 0;
    for (;;) {
      skipWhitespace();
      if (i >= text.length) return fail();
      if (text[i] === "]") {
        i++;
        return;
      }
      if (text[i] === ",") {
        i++;
        continue;
      }
      const childPath = `${path}[${itemIndex}]`;
      index.set(childPath, positionAt(i));
      readValue(childPath);
      itemIndex++;
    }
  };

  readValue("");
  return index;
}

/**
 * The position of `path`, falling back to its closest indexed ancestor. A rule can
 * report a property the text does not spell out — `page/empty` points at a page
 * whose `elements` key is absent — and pointing at the container beats not moving.
 */
export function locatePath(
  index: Map<string, JsonPosition>,
  path: string,
): JsonPosition | null {
  let candidate = path;
  for (;;) {
    const hit = index.get(candidate);
    if (hit) return hit;
    const cut = Math.max(candidate.lastIndexOf("."), candidate.lastIndexOf("["));
    if (cut <= 0) return null;
    candidate = candidate.slice(0, cut);
  }
}
