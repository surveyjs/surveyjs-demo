import type { ReactNode } from "react";
import type { Element, ElementContent, Nodes } from "hast";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeftIcon, ArrowRightIcon, ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { allNavPages, navPages, opensInNewTab, type NavId } from "@/schemas";
import { HOW_BUILT_TEXT } from "@/lib/how-built";
import {
  getHowContent,
  howLinkKind,
  otherEditionHowHref,
  parseQuoteMeta,
  repoPathFromLink,
} from "@/lib/how-content";
import { HOW_INDEX, howHref, sourceHref } from "@/lib/routes";
import { mergeTailwindClasses } from "@/lib/utils";

/** Every string in a hast subtree, in order. */
function hastText(node: Nodes | ElementContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

function isElement(node: ElementContent | undefined, tagName: string): node is Element {
  return node?.type === "element" && node.tagName === tagName;
}

/** `language-json` → `json`, for the `data-lang` the snippets carried before. */
function languageOf(node: Element): string | undefined {
  const classes = node.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [];
  return list.find((name) => name.startsWith("language-"))?.slice("language-".length);
}

/**
 * A paragraph that is nothing but links and the separators between them —
 * the "Variables · Conditional logic" row under a sentence. It reads as a row of
 * links rather than as prose, and is set like one.
 */
function isLinkRow(node: Element): boolean {
  const children = node.children.filter(
    (child) => !(child.type === "text" && child.value.trim() === ""),
  );
  if (children.length < 1) return false;
  return children.every(
    (child) =>
      isElement(child, "a") || (child.type === "text" && /^[\s·,]+$/.test(child.value)),
  );
}

/** A list whose every item is one link: source files, and what your server does. */
function isLinkList(node: Element): boolean {
  const items = node.children.filter((child) => isElement(child, "li"));
  if (items.length === 0) return false;
  return items.every((item) => {
    const inner = (item as Element).children.filter(
      (child) => !(child.type === "text" && child.value.trim() === ""),
    );
    const only = inner.length === 1 ? inner[0] : undefined;
    return isElement(only, "a") || (isElement(only, "p") && isLinkRow(only));
  });
}

/**
 * The renderer for one explainer's Markdown.
 *
 * The components map is the whole of what this template adds to GitHub-flavoured
 * Markdown, and it is deliberately small: three kinds of link, and a fenced
 * block that quotes something the repository really says. No `rehype-raw`, so
 * the two comment forms the contract allows (`<!-- edition: … -->`,
 * `<!-- TODO: … -->`) render as nothing even where the loader leaves one behind.
 */
function markdownComponents(navPath: string): Components {
  const badgeHref = otherEditionHowHref(navPath);

  return {
    h1: ({ children }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>,

    h2: ({ children }) => (
      <h2 className="text-muted-foreground mt-8 border-t pt-6 text-xs font-semibold tracking-wide uppercase">
        {children}
      </h2>
    ),

    h3: ({ children }) => <h3 className="mt-6 text-sm font-medium">{children}</h3>,

    h4: ({ children }) => <h4 className="mt-4 text-sm font-medium">{children}</h4>,

    p: ({ node, children }) =>
      node && isLinkRow(node) ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">{children}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">{children}</p>
      ),

    ul: ({ node, children }) => (
      <ul
        className={
          node && isLinkList(node)
            ? "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
            : "text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm"
        }
      >
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5 text-sm">{children}</ol>
    ),

    li: ({ children }) => <li>{children}</li>,

    blockquote: ({ children }) => (
      <blockquote className="text-muted-foreground mt-3 border-l-2 pl-4 text-sm">
        {children}
      </blockquote>
    ),

    hr: () => <hr className="mt-6" />,

    table: ({ children }) => (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b px-2 py-1.5 font-medium">{children}</th>,
    td: ({ children }) => <td className="border-b px-2 py-1.5 align-top">{children}</td>,

    /**
     * Three kinds of link, and the loader's badge.
     *
     * A relative destination is a file in this repository, written relative to
     * the Markdown file so the same link works in GitHub's preview; `/…` is a
     * route in this application; anything else is documentation.
     */
    a: ({ href = "", children }) => {
      if (href === badgeHref) {
        return (
          <a href={href} className="underline-offset-4">
            <Badge
              variant="outline"
              className="text-muted-foreground hover:text-foreground font-normal"
            >
              {children}
            </Badge>
          </a>
        );
      }

      const kind = howLinkKind(href);
      if (kind === "route") {
        return (
          <a href={href} className="text-primary underline-offset-4 hover:underline">
            {children}
          </a>
        );
      }
      if (kind === "external") {
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            {children} ↗
          </a>
        );
      }

      const repoPath = repoPathFromLink(href);
      return (
        <a
          href={repoPath ? sourceHref(repoPath) : href}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-mono text-xs underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    },

    /** Inline code only: a fenced block arrives through `pre`, which reads the fence. */
    code: ({ node, className, children, ...props }) => {
      const block = className?.includes("language-");
      if (block) return <code {...props}>{children}</code>;
      return (
        <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]" {...props}>
          {children}
        </code>
      );
    },

    /**
     * A fenced block, and the one place the info string matters: `definition=`
     * and `file=` say what this block quotes, and the element and the property
     * are printed above it exactly as the page did before the move to Markdown.
     * The text itself is what the file says — `e2e/how-integrity.spec.ts` is
     * what keeps it equal to what the repository says.
     */
    pre: ({ node }) => {
      const code = node?.children.find((child) => isElement(child, "code"));
      if (!isElement(code, "code")) return null;
      const text = hastText(code).replace(/\n$/, "");
      const meta = typeof code.data?.meta === "string" ? code.data.meta : undefined;
      const quote = parseQuoteMeta(meta);

      return (
        <div className="mt-2">
          {quote && (
            <p className="mb-1 text-xs">
              <span className="font-mono font-medium">
                {quote.kind === "definition" ? quote.element : quote.path}
              </span>
              {quote.kind === "definition" && (
                <span className="text-muted-foreground font-mono"> {quote.property}</span>
              )}
            </p>
          )}
          <pre
            data-lang={languageOf(code)}
            className="bg-muted text-foreground overflow-x-auto rounded-md px-3 py-2 font-mono text-xs leading-relaxed"
          >
            <code>{text}</code>
          </pre>
        </div>
      );
    },
  };
}

function HeaderLink({
  href,
  children,
  newTab,
}: {
  href: string;
  children: ReactNode;
  newTab?: boolean;
}) {
  return (
    <Button asChild size="sm" className="gap-2">
      <a href={href} {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    </Button>
  );
}

/**
 * One example's explainer: everything this template says about how that example
 * is built, read out of `how/<route>.md`.
 *
 * A server component. The file is read at build time, so an edit to the Markdown
 * needs a rebuild, exactly like every other page here — and nothing about an
 * example is written in TypeScript any more, which is the point of the
 * directory: a person opens the file, reads it top to bottom and edits it.
 */
export function HowPage({ navId }: { navId: NavId }) {
  const nav = allNavPages.find((item) => item.id === navId);
  if (!nav) throw new Error(`No sidebar row for ${navId}`);
  const { summary, body } = getHowContent(navId);

  const inOrder = navPages;
  const here = inOrder.findIndex((item) => item.id === navId);
  const previous = here > 0 ? inOrder[here - 1] : undefined;
  const next = here >= 0 && here < inOrder.length - 1 ? inOrder[here + 1] : undefined;

  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">{nav.label} — how it&apos;s built</h1>
        <p className="text-muted-foreground text-sm">{summary}</p>
        {/* The way back to the example. The way out to the rest of them is the
            top bar's own link, beside it on every page of the shell. */}
        <div className="flex flex-wrap items-center gap-2">
          <HeaderLink href={nav.path} newTab={opensInNewTab(nav)}>
            {HOW_BUILT_TEXT.openExample}
            {opensInNewTab(nav) ? <ExternalLinkIcon /> : <ArrowRightIcon />}
          </HeaderLink>
        </div>
      </header>

      <div className={mergeTailwindClasses("mt-2")}>
        <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents(nav.path)}>
          {body}
        </Markdown>
      </div>

      <nav
        aria-label="More examples"
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm"
      >
        <span className="flex items-center gap-4">
          {previous && (
            <a
              href={howHref(previous.path)}
              className="text-primary flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <ArrowLeftIcon className="size-3.5" />
              {previous.label}
            </a>
          )}
          {next && (
            <a
              href={howHref(next.path)}
              className="text-primary flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {next.label}
              <ArrowRightIcon className="size-3.5" />
            </a>
          )}
        </span>
        <a href={HOW_INDEX} className="text-muted-foreground underline-offset-4 hover:underline">
          {HOW_BUILT_TEXT.allExamples}
        </a>
      </nav>
    </article>
  );
}
