import { createFileRoute } from '@tanstack/react-router'
import { R2_PATHS, METADATA_PATH, TIMEOUTS } from '../../lib/config'
import { formatFileSize } from '../../lib/documents'

function stripPrefix(value: string, prefix: string): string {
	return value.startsWith(prefix) ? value.slice(prefix.length) : value
}

async function getMetadata(env: Env, documentKey: string): Promise<Record<string, string> | undefined> {
	const metadataKey = `${METADATA_PATH}${documentKey.replace(R2_PATHS.documents, '')}.json`
	try {
		const metaObj = await env.DOCS_BUCKET.get(metadataKey)
		if (metaObj) {
			const text = await metaObj.text()
			return JSON.parse(text)
		}
	} catch {
		// Metadata key doesn't exist, fall through to customMetadata
	}
	return undefined
}

function resolveStatus(
	storedStatus: string | undefined,
	uploadedAt: number,
): 'indexing' | 'indexed' | 'delayed' | 'failed' {
	// If explicitly failed, show failed
	if (storedStatus === 'failed') {
		return 'failed'
	}

	// If explicitly indexed, show indexed
	if (storedStatus === 'indexed') {
		return 'indexed'
	}

	// If still indexing (or no status - backwards compatibility), use time-based heuristic
	const elapsed = Date.now() - uploadedAt

	// If explicitly indexing and within window, stay indexing
	if (storedStatus === 'indexing') {
		if (elapsed < TIMEOUTS.indexingWindowMs) {
			return 'indexing'
		}
		// Beyond the window, it's likely indexed or delayed
		if (elapsed > TIMEOUTS.delayedWindowMs) {
			return 'delayed'
		}
		return 'indexed'
	}

	// Fallback: no explicit status, use time heuristic
	if (elapsed < TIMEOUTS.indexingWindowMs) {
		return 'indexing'
	}

	if (elapsed > TIMEOUTS.delayedWindowMs) {
		return 'delayed'
	}

	return 'indexed'
}

// Authentication is handled by Cloudflare Access at the network layer.
// All requests reaching this endpoint have already been authenticated.

export const Route = createFileRoute('/api/documents')({
	server: {
		handlers: {
			GET: async ({ context }) => {
				// Type-safe access to the request context
				type ServerContext = { cf: { env: Env } }
				const typedContext = context as unknown as ServerContext | undefined
				const env = typedContext?.cf?.env

				if (!env) {
					return Response.json(
						{ error: 'Missing worker env in request context' },
						{ status: 500 },
					)
				}

				const listed = await env.DOCS_BUCKET.list({
					prefix: R2_PATHS.documents,
					include: ['customMetadata'],
				})

				const documents = await Promise.all(
					listed.objects.map(async (object) => {
						const metadata = object.customMetadata ?? {}
						const uploadedAtRaw = metadata.uploadedAt
						const uploadedAt = uploadedAtRaw ? Number.parseInt(uploadedAtRaw, 10) : Date.now()
						const bytesRaw = metadata.originalBytes
						const bytes = bytesRaw ? Number.parseInt(bytesRaw, 10) : object.size

						// Check separate metadata key for latest status
						const metaFromKey = await getMetadata(env, object.key)
						const effectiveStatus = metaFromKey?.status ?? metadata.status
						const status = resolveStatus(effectiveStatus, uploadedAt)

						return {
							id: object.key,
							name: metadata.originalName ?? stripPrefix(object.key, R2_PATHS.documents).replace(/\.md$/i, ''),
							size: formatFileSize(bytes),
							bytes,
							key: object.key,
							status,
							statusUpdatedAt: uploadedAt,
						}
					}),
				)

				documents.sort((a, b) => b.statusUpdatedAt - a.statusUpdatedAt)

				return Response.json({ documents })
			},
		},
	},
})
