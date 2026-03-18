import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DocumentStatus, SidebarDocument } from '../components/Sidebar'
import type { DocumentsResponse, IndexedDocument } from './documents'

interface UseDocumentsResult {
	documents: IndexedDocument[]
	sidebarDocuments: SidebarDocument[]
	isLoading: boolean
	error: string | null
	refreshDocuments: () => Promise<void>
}

function hasPendingDocuments(documents: IndexedDocument[]): boolean {
	return documents.some((doc) => doc.status === 'indexing' || doc.status === 'delayed')
}

function normalizeStatus(value: unknown): DocumentStatus {
	if (value === 'indexing' || value === 'indexed' || value === 'failed' || value === 'delayed') {
		return value
	}

	return 'indexed'
}

export function useDocuments(): UseDocumentsResult {
	const [documents, setDocuments] = useState<IndexedDocument[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const refreshDocuments = useCallback(async () => {
		try {
			const response = await fetch('/api/documents')
			if (!response.ok) {
				throw new Error(`Could not load documents (${response.status})`)
			}

			const payload = (await response.json()) as DocumentsResponse
			setDocuments(
				(payload.documents ?? []).map((doc) => ({
					...doc,
					status: normalizeStatus(doc.status),
				}))
			)
			setError(null)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Could not load documents'
			setError(message)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		void refreshDocuments()
	}, [refreshDocuments])

	useEffect(() => {
		if (!hasPendingDocuments(documents)) {
			return
		}

		const interval = window.setInterval(() => {
			void refreshDocuments()
		}, 30_000)

		return () => {
			window.clearInterval(interval)
		}
	}, [documents, refreshDocuments])

	const sidebarDocuments = useMemo<SidebarDocument[]>(
		() =>
			documents.map((doc) => ({
				id: doc.id,
				name: doc.name,
				size: doc.size,
				status: doc.status,
				statusUpdatedAt: doc.statusUpdatedAt,
			})),
		[documents]
	)

	return {
		documents,
		sidebarDocuments,
		isLoading,
		error,
		refreshDocuments,
	}
}
