export const MODELS = {
  generation: "@cf/nvidia/nemotron-3-120b-a12b",
} as const;

/** AI Search instance name (configured in Cloudflare dashboard) */
export const AI_SEARCH_INSTANCE = "docsflare-search" as const;

/** R2 path prefixes */
export const R2_PATHS = {
  /** Original uploaded PDFs (excluded from AI Search indexing) */
  originals: "originals/",
  /** Extracted markdown files (indexed by AI Search) */
  documents: "documents/",
} as const;

/** Metadata keys for status tracking */
export const METADATA_PATH = "meta/";

/** Maximum file size per upload (50 MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of files per upload */
export const MAX_FILE_COUNT = 10;

/** AI Search configuration */
export const AI_SEARCH = {
  /** Maximum number of search results to retrieve */
  maxResults: 8,
  /** Minimum relevance score threshold (0.0 - 1.0) */
  scoreThreshold: 0.15,
  /** Maximum messages to persist in chat history */
  maxPersistedMessages: 200,
} as const;

/** Extraction configuration */
export const EXTRACTION = {
  /** Minimum content length (excluding metadata) to consider extraction successful */
  minContentLength: 50,
} as const;

/** Timeout configuration (in milliseconds) */
export const TIMEOUTS = {
  /** OCR sandbox execution timeout */
  ocr: 120_000,
  /** Document indexing window - how long to show "indexing" status */
  indexingWindowMs: 90_000,
  /** Delayed indexing window - when to mark as "delayed" */
  delayedWindowMs: 10 * 60_000,
  /** Document polling interval while documents are pending */
  documentPollIntervalMs: 30_000,
} as const;
