import type { Sandbox } from "@cloudflare/sandbox";
import { createFileRoute } from "@tanstack/react-router";
import { triggerAISearchSync } from "../../lib/ai-search-sync";
import { R2_PATHS } from "../../lib/config";
import { formatFileSize } from "../../lib/documents";
import { extractTextFromPDF } from "../../lib/pdf-extract";

interface UploadResult {
  id: string;
  name: string;
  size: string;
  bytes: number;
  key: string;
  status: "indexing" | "indexed" | "failed";
  statusUpdatedAt: number;
  method?: "toMarkdown" | "ocr-fallback";
  error?: string;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function buildDocumentKey(fileName: string, suffix: string): string {
  const safeName = sanitizeFileName(fileName);
  return `${Date.now()}-${crypto.randomUUID()}-${safeName}${suffix}`;
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request, context }: any) => {
        const env = context?.env as Env | undefined;
        if (!env) {
          return Response.json(
            { error: "Missing worker env in request context" },
            { status: 500 },
          );
        }
        const formData = await request.formData();
        const inputFiles = formData.getAll("files");

        const files = inputFiles.filter(
          (entry: FormDataEntryValue): entry is File =>
            entry instanceof File && entry.type === "application/pdf",
        );

        if (files.length === 0) {
          return Response.json(
            { error: "Upload at least one PDF using the files field." },
            { status: 400 },
          );
        }

        const results: UploadResult[] = [];

        for (const file of files) {
          const statusUpdatedAt = Date.now();
          const originalKey = `${R2_PATHS.originals}${buildDocumentKey(file.name, "")}`;
          const markdownKey = `${R2_PATHS.documents}${buildDocumentKey(file.name, ".md")}`;

          try {
            const bytes = await file.arrayBuffer();

            await (env as any).DOCS_BUCKET.put(originalKey, bytes, {
              httpMetadata: {
                contentType: "application/pdf",
              },
              customMetadata: {
                originalName: file.name,
                uploadedAt: String(statusUpdatedAt),
              },
            });

            const extraction = await extractTextFromPDF(
              env as {
                AI: Ai;
                Sandbox: DurableObjectNamespace<Sandbox>;
              },
              bytes,
              file.name,
            );

            if (
              !extraction.hasContent ||
              extraction.markdown.trim().length === 0
            ) {
              results.push({
                id: markdownKey,
                name: file.name,
                size: formatFileSize(file.size),
                bytes: file.size,
                key: markdownKey,
                status: "failed",
                statusUpdatedAt,
                error: "No readable text extracted from PDF.",
              });
              continue;
            }

            await (env as any).DOCS_BUCKET.put(
              markdownKey,
              extraction.markdown,
              {
                httpMetadata: {
                  contentType: "text/markdown; charset=utf-8",
                },
                customMetadata: {
                  originalName: file.name,
                  uploadedAt: String(statusUpdatedAt),
                  status: "indexing",
                  method: extraction.method,
                  originalBytes: String(file.size),
                },
              },
            );

            results.push({
              id: markdownKey,
              name: file.name,
              size: formatFileSize(file.size),
              bytes: file.size,
              key: markdownKey,
              status: "indexing",
              statusUpdatedAt,
              method: extraction.method,
            });
          } catch (error) {
            results.push({
              id: markdownKey,
              name: file.name,
              size: formatFileSize(file.size),
              bytes: file.size,
              key: markdownKey,
              status: "failed",
              statusUpdatedAt,
              error: error instanceof Error ? error.message : "Upload failed",
            });
          }
        }

        let syncStatus: 'triggered' | 'skipped' | 'failed' = 'skipped';
        const indexingResults = results.filter((result) => result.status === "indexing");
        if (indexingResults.length > 0) {
          try {
            await triggerAISearchSync(
              env as Env & {
                CLOUDFLARE_ACCOUNT_ID?: string;
                AI_SEARCH_API_TOKEN?: string;
              },
            );
            syncStatus = 'triggered';

            // Update metadata to "indexed" after successful sync trigger
            // R2 requires re-putting the object to update metadata
            for (const result of indexingResults) {
              try {
                const obj = await (env as any).DOCS_BUCKET.get(result.key);
                if (obj) {
                  const content = await obj.arrayBuffer();
                  const metadata = obj.customMetadata ?? {};
                  await (env as any).DOCS_BUCKET.put(result.key, content, {
                    httpMetadata: obj.httpMetadata,
                    customMetadata: {
                      ...metadata,
                      status: "indexed",
                      indexedAt: String(Date.now()),
                    },
                  });
                  // Update result status in response
                  result.status = "indexed";
                }
              } catch (updateError) {
                console.error(`Failed to update metadata for ${result.key}:`, updateError);
                // Don't fail the entire request if metadata update fails
              }
            }
          } catch (error) {
            console.error("Failed to trigger AI Search sync", error);
            syncStatus = 'failed';
          }
        }

        return Response.json({ results, syncStatus });
      },
    },
  },
});
