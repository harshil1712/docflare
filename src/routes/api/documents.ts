import { createFileRoute } from '@tanstack/react-router'
import { R2_PATHS } from '../../lib/config'
import { formatFileSize } from '../../lib/documents'

const INDEXING_WINDOW_MS = 90_000
const DELAYED_WINDOW_MS = 10 * 60_000

function stripPrefix(value: string, prefix: string): string {
	return value.startsWith(prefix) ? value.slice(prefix.length) : value
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
	if (elapsed < INDEXING_WINDOW_MS) {
		return 'indexing'
	}

	if (elapsed > DELAYED_WINDOW_MS) {
		return 'delayed'
	}

	return 'indexed'
}

export const Route = createFileRoute('/api/documents')({
	server: {
		handlers: {
			GET: async ({ context }: any) => {
				const env = context?.env as Env | undefined
				if (!env) {
					return Response.json({ documents: [] })
				}

				const listed = await (env as any).DOCS_BUCKET.list({
					prefix: R2_PATHS.documents,
					include: ['customMetadata'],
				})

				const documents = (listed.objects as any[])
					.map((object: any) => {
						const metadata = object.customMetadata ?? {}
						const uploadedAtRaw = metadata.uploadedAt
						const uploadedAt = uploadedAtRaw ? Number.parseInt(uploadedAtRaw, 10) : Date.now()
						const bytesRaw = metadata.originalBytes
						const bytes = bytesRaw ? Number.parseInt(bytesRaw, 10) : object.size
						const status = resolveStatus(metadata.status, uploadedAt)

						return {
							id: object.key,
							name: metadata.originalName ?? stripPrefix(object.key, R2_PATHS.documents).replace(/\.md$/i, ''),
							size: formatFileSize(bytes),
							bytes,
							key: object.key,
							status,
							statusUpdatedAt: uploadedAt,
						}
					})
					.sort((a: { statusUpdatedAt: number }, b: { statusUpdatedAt: number }) => b.statusUpdatedAt - a.statusUpdatedAt)

				return Response.json({ documents })
			},
		},
	},
})
