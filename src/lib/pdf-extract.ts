/**
 * PDF text extraction with two strategies:
 *
 * 1. Primary: env.AI.toMarkdown() — works for text-layer PDFs (free, fast)
 * 2. Fallback: RapidOCR (ONNX Runtime) via Sandbox container — for scanned
 *    PDFs where toMarkdown returns empty content. Accurate character-level
 *    OCR with no LLM hallucination.
 */

import type { Sandbox } from "@cloudflare/sandbox";
import { EXTRACTION } from "./config";
import { ocrPDF } from "./ocr-sandbox";

export interface PDFExtractionResult {
  fileName: string;
  markdown: string;
  /** Number of characters in the extracted text */
  length: number;
  /** Whether the extraction returned meaningful content */
  hasContent: boolean;
  /** Which extraction strategy was used */
  method: "toMarkdown" | "ocr-fallback";
}

/**
 * Extract text from a PDF. Tries toMarkdown() first (fast, free).
 * Falls back to RapidOCR in a Sandbox container for scanned PDFs.
 */
export async function extractTextFromPDF(
  env: { AI: Ai; Sandbox: DurableObjectNamespace<Sandbox> },
  pdfBytes: ArrayBuffer,
  fileName: string,
): Promise<PDFExtractionResult> {
  // Strategy 1: Try toMarkdown() directly on the PDF
  const directResult = await tryDirectExtraction(env.AI, pdfBytes, fileName);

  if (directResult && hasSubstantialContent(directResult)) {
    return {
      fileName,
      markdown: directResult,
      length: directResult.length,
      hasContent: true,
      method: "toMarkdown",
    };
  }

  // Strategy 2: OCR via RapidOCR in Sandbox container
  const ocrResult = await ocrPDF(env.Sandbox, pdfBytes);

  if (ocrResult.error) {
    // Log only truncated error to avoid leaking sensitive filesystem paths from sandbox stderr
    const safeError = ocrResult.error.slice(0, 200);
    console.error(`OCR error for ${fileName}: ${safeError}`);
  }

  const markdown = formatOCRResult(fileName, ocrResult.pages);

  return {
    fileName,
    markdown,
    length: markdown.length,
    hasContent: markdown.trim().length > 0,
    method: "ocr-fallback",
  };
}

/**
 * Try direct PDF-to-markdown via toMarkdown().
 * Returns null if it fails, returns the markdown string otherwise.
 */
async function tryDirectExtraction(
  ai: Ai,
  pdfBytes: ArrayBuffer,
  fileName: string,
): Promise<string | null> {
  try {
    const results = await ai.toMarkdown([
      {
        name: fileName,
        blob: new Blob([pdfBytes], { type: "application/pdf" }),
      },
    ]);

    const result = results[0];
    if (!result || result.format === "error") {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

/**
 * Check if toMarkdown() returned substantial content beyond just metadata.
 * Strips the metadata section and checks remaining content length.
 */
function hasSubstantialContent(markdown: string): boolean {
  // Remove the metadata section that toMarkdown always includes
  const contentsMatch = markdown.match(/## Contents\s*\n([\s\S]*)/);
  const contentsSection = contentsMatch?.[1] ?? "";

  // Strip whitespace and page headers like "### Page 1\n\n"
  const stripped = contentsSection.replace(/###\s+Page\s+\d+/g, "").trim();

  return stripped.length >= EXTRACTION.minContentLength;
}

/**
 * Format OCR page results into a markdown document.
 */
function formatOCRResult(
  fileName: string,
  pages: { page: number; text: string }[],
): string {
  const nonEmpty = pages.filter((p) => p.text.trim().length > 0);

  if (nonEmpty.length === 0) {
    return "";
  }

  const pageTexts = nonEmpty.map(
    (p) => `### Page ${p.page}\n\n${p.text}`,
  );

  return `# ${fileName}\n\n## Contents\n\n${pageTexts.join("\n\n")}`;
}
