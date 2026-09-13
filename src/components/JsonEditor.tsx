"use client";

import { useEffect, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import type { LintMarker } from "@/components/lint/StaticAnalysisBar";

// Monaco is bundled with the app instead of pulled from the default CDN, so the
// demo works offline and in CI.
if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      return label === "json"
        ? new Worker(
            new URL(
              "monaco-editor/esm/vs/language/json/json.worker.js",
              import.meta.url,
            ),
          )
        : new Worker(
            new URL(
              "monaco-editor/esm/vs/editor/editor.worker.js",
              import.meta.url,
            ),
          );
    },
  };
  loader.config({ monaco });
  (window as unknown as { monaco: typeof monaco }).monaco = monaco;
}

export interface JsonEditorApi {
  revealLine: (line: number) => void;
}

export function JsonEditor({
  value,
  onChange,
  dark,
  markers = [],
  highlightLine = null,
  onReady,
  onMarkerActivate,
}: {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
  /** Static-analysis findings to mark in the gutter. */
  markers?: readonly LintMarker[];
  /** The line of the finding selected elsewhere, highlighted across the row. */
  highlightLine?: number | null;
  onReady?: (api: JsonEditorApi) => void;
  /** The caret moved onto a marked line — the other half of the panel/editor link. */
  onMarkerActivate?: (path: string) => void;
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(
    null,
  );
  const markersRef = useRef<readonly LintMarker[]>(markers);
  markersRef.current = markers;

  const activateRef = useRef(onMarkerActivate);
  activateRef.current = onMarkerActivate;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const collection =
      decorationsRef.current ?? editor.createDecorationsCollection();
    decorationsRef.current = collection;
    collection.set(
      markers.map((marker) => ({
        range: new monaco.Range(marker.line, 1, marker.line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: `lint-glyph lint-glyph-${marker.severity}`,
          glyphMarginHoverMessage: { value: marker.message },
          linesDecorationsClassName: `lint-line lint-line-${marker.severity}`,
          className:
            highlightLine === marker.line ? "lint-line-highlight" : undefined,
        },
      })),
    );
  }, [markers, highlightLine]);

  return (
    <Editor
      language="json"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      theme={dark ? "vs-dark" : "light"}
      onMount={(editor) => {
        editorRef.current = editor;
        onReady?.({
          revealLine: (line) => {
            editor.revealLineInCenter(line);
            editor.setPosition({ lineNumber: line, column: 1 });
            editor.focus();
          },
        });
        editor.onDidChangeCursorPosition((event) => {
          const hit = markersRef.current.find(
            (marker) => marker.line === event.position.lineNumber,
          );
          if (hit) activateRef.current?.(hit.path);
        });
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        glyphMargin: true,
      }}
    />
  );
}

export default JsonEditor;
