import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react";

import {
  MAX_HTML_BYTES,
  MAX_HTML_SIZE_LABEL,
  getHtmlByteLength,
  validateHtml,
} from "../shared/html";
import { buildCurlCommand, resolveShareEndpoint, shareHtml } from "./share-page/api";
import { isHtmlFile } from "./share-page/html-file";

type ShareState =
  | { kind: "idle" }
  | { kind: "sharing" }
  | { kind: "shared"; url: string }
  | { kind: "error"; message: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function App() {
  const [html, setHtml] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [shareState, setShareState] = useState<ShareState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const byteLength = useMemo(() => getHtmlByteLength(html), [html]);

  const configuration = useMemo(() => {
    try {
      return {
        shareEndpoint: resolveShareEndpoint(
          import.meta.env,
          window.location.origin,
        ),
        error: null,
      };
    } catch (error) {
      return { shareEndpoint: null, error: getErrorMessage(error) };
    }
  }, []);

  function updateHtml(value: string, sourceFileName: string | null = null) {
    setHtml(value);
    setFileName(sourceFileName);
    setCopyMessage(null);
    setShareState({ kind: "idle" });
  }

  async function loadFile(file: File) {
    if (!isHtmlFile(file)) {
      setShareState({ kind: "error", message: "Drop an .html or .htm file." });
      return;
    }
    if (file.size > MAX_HTML_BYTES) {
      setShareState({
        kind: "error",
        message: `That file is too large. The limit is ${MAX_HTML_SIZE_LABEL}.`,
      });
      return;
    }

    try {
      updateHtml(await file.text(), file.name);
    } catch {
      setShareState({ kind: "error", message: "The file could not be read." });
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void loadFile(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (event.dataTransfer.files.length > 1) {
      setShareState({ kind: "error", message: "Drop one HTML file at a time." });
      return;
    }
    const file = event.dataTransfer.files[0];
    if (file) {
      void loadFile(file);
    }
  }

  async function handleShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateHtml(html);
    if (!validation.ok) {
      setShareState({ kind: "error", message: validation.message });
      return;
    }
    if (!configuration.shareEndpoint) {
      setShareState({
        kind: "error",
        message: configuration.error ?? "Convex is not configured.",
      });
      return;
    }

    setShareState({ kind: "sharing" });
    try {
      const page = await shareHtml(configuration.shareEndpoint, html);
      setCopyMessage(null);
      setShareState({ kind: "shared", url: page.url });
    } catch (error) {
      setShareState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  async function copyUrl() {
    if (shareState.kind !== "shared") {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareState.url);
      setCopyMessage("Copied.");
    } catch {
      setCopyMessage("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <main className="shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="shtml home">
          shtml
        </a>
        <span className="definition">share html</span>
      </header>

      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <h1 id="page-title">Paste HTML. Get a link.</h1>
          <p>No account. Links are six characters and use this domain.</p>
        </div>

        <form onSubmit={handleShare}>
          <div
            className={`editor ${isDragging ? "editor--dragging" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="drop-overlay" aria-hidden="true">
                Drop HTML file
              </div>
            )}
            <div className="editor__bar">
              <label htmlFor="html-input">HTML</label>
              <div className="editor__actions">
                {fileName && <span className="file-name">{fileName}</span>}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </button>
                {html && (
                  <button
                    className="text-button text-button--muted"
                    type="button"
                    onClick={() => updateHtml("")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="html-input"
              value={html}
              onChange={(event) => updateHtml(event.target.value)}
              placeholder="<!doctype html>"
              spellCheck={false}
              autoCapitalize="off"
              aria-describedby="html-size"
            />
            <div className="editor__footer">
              <span>Drop an .html file here, or paste into the editor.</span>
              <span
                id="html-size"
                className={byteLength > MAX_HTML_BYTES ? "size size--over" : "size"}
              >
                {formatBytes(byteLength)} / {MAX_HTML_SIZE_LABEL}
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".html,.htm,text/html"
            onChange={handleFileChange}
            tabIndex={-1}
          />

          <div className="submit-row">
            <button
              className="share-button"
              type="submit"
              disabled={shareState.kind === "sharing" || byteLength > MAX_HTML_BYTES}
            >
              {shareState.kind === "sharing" ? "Sharing…" : "Share"}
            </button>
            {shareState.kind === "error" && (
              <p className="message message--error" role="alert">
                {shareState.message}
              </p>
            )}
          </div>
        </form>

        {shareState.kind === "shared" && (
          <div className="result" aria-live="polite">
            <label htmlFor="share-url">Your link</label>
            <div className="result__controls">
              <input
                id="share-url"
                type="url"
                value={shareState.url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <button type="button" onClick={() => void copyUrl()}>
                Copy
              </button>
              <a href={shareState.url} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
            {copyMessage && (
              <p className="result__message" role="status">
                {copyMessage}
              </p>
            )}
          </div>
        )}

        <aside className="curl" aria-labelledby="curl-title">
          <div>
            <h2 id="curl-title">curl</h2>
            <p>The response is JSON with the page ID, slug, and URL.</p>
          </div>
          <code>
            {configuration.shareEndpoint
              ? buildCurlCommand(configuration.shareEndpoint)
              : "Run `npx convex dev` to get the endpoint."}
          </code>
        </aside>
      </section>

      <footer>
        Pages are public, immutable, and run without a browser sandbox.
      </footer>
    </main>
  );
}

export default App;
