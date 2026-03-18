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
