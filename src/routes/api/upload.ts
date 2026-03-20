import type { Sandbox } from "@cloudflare/sandbox";
import { createFileRoute } from "@tanstack/react-router";
import { triggerAISearchSync } from "../../lib/ai-search-sync";
import {
  R2_PATHS,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
  METADATA_PATH,
} from "../../lib/config";
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

// Authentication is handled by Cloudflare Access at the network layer.
// All requests reaching this endpoint have already been authenticated.

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/gu, "-").replace(/-+/g, "-");
}

function buildDocumentKey(fileName: string, suffix: string): string {
  const safeName = sanitizeFileName(fileName);
  return `${Date.now()}-${crypto.randomUUID()}-${safeName}${suffix}`;
}

async function processSingleFile(
  file: File,
  env: Env & { AI: Ai; Sandbox: DurableObjectNamespace<Sandbox> },
): Promise<UploadResult> {
  const statusUpdatedAt = Date.now();
  const originalKey = `${R2_PATHS.originals}${buildDocumentKey(file.name, "")}`;
  const markdownKey = `${R2_PATHS.documents}${buildDocumentKey(file.name, ".md")}`;

  try {
    const bytes = await file.arrayBuffer();

    await env.DOCS_BUCKET.put(originalKey, bytes, {
      httpMetadata: {
        contentType: "application/pdf",
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: String(statusUpdatedAt),
      },
    });

    const extraction = await extractTextFromPDF(env, bytes, file.name);

    if (!extraction.hasContent || extraction.markdown.trim().length === 0) {
      return {
        id: markdownKey,
        name: file.name,
        size: formatFileSize(file.size),
        bytes: file.size,
        key: markdownKey,
        status: "failed",
        statusUpdatedAt,
        error: "No readable text extracted from PDF.",
      };
    }

    await env.DOCS_BUCKET.put(markdownKey, extraction.markdown, {
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
    });

    return {
      id: markdownKey,
      name: file.name,
      size: formatFileSize(file.size),
      bytes: file.size,
      key: markdownKey,
      status: "indexing",
      statusUpdatedAt,
      method: extraction.method,
    };
  } catch (error) {
    return {
      id: markdownKey,
      name: file.name,
      size: formatFileSize(file.size),
      bytes: file.size,
      key: markdownKey,
      status: "failed",
      statusUpdatedAt,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        // Type-safe access to the request context
        type ServerContext = { cf: { env: Env } };
        const typedContext = context as unknown as ServerContext | undefined;
        const env = typedContext?.cf?.env;

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

        // Validate file count
        if (files.length > MAX_FILE_COUNT) {
          return Response.json(
            {
              error: `Maximum ${MAX_FILE_COUNT} files per upload. Received ${files.length}.`,
            },
            { status: 400 },
          );
        }

        // Validate file sizes
        for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
            return Response.json(
              {
                error: `File "${file.name}" exceeds ${formatFileSize(MAX_FILE_SIZE)} limit (size: ${formatFileSize(file.size)}).`,
              },
              { status: 413 },
            );
          }
        }

        // Process files concurrently for better performance
        const filePromises = files.map((file) =>
          processSingleFile(file, env as Env & { AI: Ai; Sandbox: DurableObjectNamespace<Sandbox> }),
        );

        const settled = await Promise.allSettled(filePromises);

        const results: UploadResult[] = settled.map((result) => {
          if (result.status === "fulfilled") {
            return result.value;
          }
          // This shouldn't happen since processSingleFile always returns or throws
          return {
            id: `error-${crypto.randomUUID()}`,
            name: "Unknown",
            size: "0 B",
            bytes: 0,
            key: "",
            status: "failed",
            statusUpdatedAt: Date.now(),
            error: result.reason instanceof Error ? result.reason.message : "Processing failed",
          };
        });

        let syncStatus: "triggered" | "skipped" | "failed" = "skipped";
        const indexingResults = results.filter(
          (result) => result.status === "indexing",
        );
        if (indexingResults.length > 0) {
          try {
            await triggerAISearchSync(
              env as Env & {
                CLOUDFLARE_ACCOUNT_ID?: string;
                AI_SEARCH_API_TOKEN?: string;
              },
            );
            syncStatus = "triggered";

            // Update metadata via separate key to avoid race conditions
            await Promise.all(
              indexingResults.map(async (result) => {
                try {
                  const metadataKey = `${METADATA_PATH}${result.id.replace(R2_PATHS.documents, "")}.json`;
                  await env.DOCS_BUCKET.put(
                    metadataKey,
                    JSON.stringify({
                      status: "indexed",
                      indexedAt: Date.now(),
                      uploadedAt: result.statusUpdatedAt,
                    }),
                    {
                      httpMetadata: {
                        contentType: "application/json",
                      },
                    },
                  );
                  // Update result status in response
                  result.status = "indexed";
                } catch (updateError) {
                  // Log only error message to avoid leaking sensitive data
                  console.error(
                    `Failed to update metadata for ${result.key}:`,
                    updateError instanceof Error ? updateError.message : 'Unknown error',
                  );
                  // Don't fail the entire request if metadata update fails
                }
              }),
            );
          } catch (error) {
            // Log only error message to avoid leaking sensitive data
            console.error(
              "Failed to trigger AI Search sync:",
              error instanceof Error ? error.message : 'Unknown error',
            );
            syncStatus = "failed";
          }
        }

        return Response.json({ results, syncStatus });
      },
    },
  },
});
