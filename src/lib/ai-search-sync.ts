import { AI_SEARCH_INSTANCE } from "./config";

interface SyncEnv {
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_SEARCH_API_TOKEN?: string;
}

export async function triggerAISearchSync(env: SyncEnv): Promise<void> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_SEARCH_API_TOKEN) {
    console.warn('AI Search sync skipped: missing CLOUDFLARE_ACCOUNT_ID or AI_SEARCH_API_TOKEN');
    return;
  }

  const syncUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai-search/instances/${AI_SEARCH_INSTANCE}/jobs`;

  const response = await fetch(syncUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AI_SEARCH_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI Search sync failed (${response.status}): ${body}`);
  }
}
