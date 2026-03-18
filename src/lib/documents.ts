import type { DocumentStatus } from '../components/Sidebar'

export interface IndexedDocument {
	id: string
	name: string
	size: string
	bytes: number
	key: string
	status: DocumentStatus
	statusUpdatedAt: number
}

export interface DocumentsResponse {
	documents: IndexedDocument[]
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
