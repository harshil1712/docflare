import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Button, cn } from "@cloudflare/kumo";
import { UploadSimple } from "@phosphor-icons/react";
import { formatFileSize } from "../lib/documents";
import { useDocuments } from "../lib/use-documents";

interface UploadApiResult {
  id: string;
  name: string;
  size: string;
  status: "indexing" | "failed";
  error?: string;
}

interface UploadApiResponse {
  results: UploadApiResult[];
  syncStatus: 'triggered' | 'skipped' | 'failed';
}

export const Route = createFileRoute("/")({ component: DocumentsPage });

function DocumentsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { documents, isLoading, error, refreshDocuments } = useDocuments();

  const processUpload = useCallback(
    async (files: File[]) => {
      const pdfFiles = files.filter((file) => file.type === "application/pdf");
      if (pdfFiles.length === 0) {
        setUploadNotice("Only PDF files are supported.");
        return;
      }

      setIsUploading(true);
      setUploadNotice(null);

      try {
        const formData = new FormData();
        for (const file of pdfFiles) {
          formData.append("files", file);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(
            payload.error ?? `Upload failed (${response.status})`,
          );
        }

        const payload = (await response.json()) as UploadApiResponse;
        const failed = payload.results.filter(
          (result) => result.status === "failed",
        );
        if (failed.length > 0) {
          setUploadNotice(`${failed.length} file(s) failed during extraction.`);
        } else {
          setUploadNotice(
            `${payload.results.length} document(s) uploaded. Indexing has started.`,
          );
        }

        await refreshDocuments();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadNotice(message);
      } finally {
        setIsUploading(false);
      }
    },
    [refreshDocuments],
  );

  const handleInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";
      await processUpload(selectedFiles);
    },
    [processUpload],
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(event.dataTransfer.files);
      await processUpload(droppedFiles);
    },
    [processUpload],
  );

  return (
    <main className="flex-1 overflow-y-auto px-6 md:px-12 py-8">
      <section
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed p-8 md:p-12 transition-colors mb-8",
          isDragging
            ? "border-archival-accent bg-archival-accent/5"
            : "border-archival-border bg-archival-surface",
        )}
      >
        <div className="max-w-2xl mx-auto text-center">
          <div className="font-serif text-4xl md:text-6xl tracking-tight text-archival-ink mb-4">
            Build the Index
          </div>
          <p className="font-sans text-base md:text-lg text-archival-ink/70 mb-8">
            Upload PDFs to your document repository. Once indexing finishes,
            switch to Chat and ask questions.
          </p>
          <Button
            variant="outline"
            size="lg"
            icon={UploadSimple}
            className="mx-auto inline-flex border-archival-ink text-archival-ink hover:bg-archival-ink hover:text-archival-bg"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Processing..." : "Select PDFs"}
          </Button>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-archival-ink/45">
            Drop files here or use the picker
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />
      </section>

      {uploadNotice && (
        <div className="mb-8 border border-[var(--color-archival-border)] bg-[var(--color-archival-surface)] px-4 py-3 font-mono text-xs text-[var(--color-archival-ink)]/80 uppercase tracking-wide">
          {uploadNotice}
        </div>
      )}

      <section className="border border-[var(--color-archival-border)] bg-[var(--color-archival-bg)]">
        <div className="px-4 py-3 border-b border-[var(--color-archival-border)] font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-archival-ink)]/60">
          Document Registry
        </div>
        {isLoading ? (
          <div className="px-4 py-6 font-mono text-xs text-[var(--color-archival-ink)]/50">
            Loading documents...
          </div>
        ) : error ? (
          <div className="px-4 py-6 font-mono text-xs text-[#b03a2e]">
            {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="px-4 py-6 font-mono text-xs text-[var(--color-archival-ink)]/50">
            No documents indexed yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-archival-border)]">
            {documents.map((document) => (
              <div
                key={document.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 md:gap-4 px-4 py-3"
              >
                <div>
                  <div className="font-mono text-xs text-[var(--color-archival-ink)]">
                    {document.name}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--color-archival-ink)]/40 mt-1">
                    {document.key}
                  </div>
                </div>
                <div className="font-mono text-xs text-[var(--color-archival-ink)]/60">
                  {document.size || formatFileSize(document.bytes)}
                </div>
                <div className="font-mono text-xs uppercase tracking-wide">
                  <span
                    className={cn(
                      document.status === "indexed" &&
                        "text-[var(--color-archival-accent)]",
                      document.status === "indexing" &&
                        "text-[var(--color-archival-ink)]/70",
                      document.status === "delayed" && "text-[#a87b23]",
                      document.status === "failed" && "text-[#b03a2e]",
                    )}
                  >
                    {document.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
