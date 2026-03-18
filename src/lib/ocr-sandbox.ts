/**
 * OCR via RapidOCR (ONNX Runtime) running in a Cloudflare Sandbox container.
 *
 * Writes the PDF to the sandbox filesystem, runs the RapidOCR CLI script,
 * and parses the JSON output from stdout. Uses the same PaddleOCR models
 * (PP-OCRv3/v4) converted to ONNX format for lighter resource usage.
 */

import { getSandbox, type Sandbox } from "@cloudflare/sandbox";

export interface OCRPage {
  page: number;
  text: string;
}

export interface OCRResult {
  pages: OCRPage[];
  error?: string;
}

/**
 * Run RapidOCR on a PDF via the Sandbox container.
 *
 * @param sandboxNs - The Sandbox DurableObject namespace binding
 * @param pdfBytes - Raw PDF file bytes
 * @returns Structured OCR result with text per page
 */
export async function ocrPDF(
  sandboxNs: DurableObjectNamespace<Sandbox>,
  pdfBytes: ArrayBuffer,
): Promise<OCRResult> {
  const sandbox = getSandbox(sandboxNs, "ocr");

  // Convert PDF bytes to base64 and write to the sandbox filesystem
  const base64 = arrayBufferToBase64(pdfBytes);
  await sandbox.writeFile("/workspace/input.pdf", base64, {
    encoding: "base64",
  });

  // Run RapidOCR
  const result = await sandbox.exec(
    "python3 /app/ocr.py /workspace/input.pdf",
    { timeout: 120_000 }, // 2 min timeout for large PDFs
  );

  if (!result.success) {
    return {
      pages: [],
      error: `OCR failed (exit ${result.exitCode}): ${result.stderr}`,
    };
  }

  // Parse JSON from stdout
  try {
    const parsed = JSON.parse(result.stdout) as OCRResult;
    return parsed;
  } catch {
    return {
      pages: [],
      error: `Failed to parse OCR output: ${result.stdout.slice(0, 500)}`,
    };
  }
}

/**
 * Convert an ArrayBuffer to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
