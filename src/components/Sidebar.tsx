import { Button, Tooltip, cn } from '@cloudflare/kumo'
import {
	FileText,
	Folder,
	List,
	Chats,
	UploadSimple,
	X,
} from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'

export type DocumentStatus = 'indexing' | 'indexed' | 'failed' | 'delayed'

export interface SidebarDocument {
	id: string
	name: string
	size: string
	status?: DocumentStatus
	statusUpdatedAt?: number
}

interface SidebarProps {
	isOpen: boolean
	onClose: () => void
	onNavigate?: () => void
	documents: SidebarDocument[]
	currentPath: string
}

export function Sidebar({
	isOpen,
	onClose,
	onNavigate,
	documents,
	currentPath,
}: SidebarProps) {
	const navigate = useNavigate()

	const getDocumentStatus = (status?: DocumentStatus) => {
		switch (status) {
			case 'indexing':
				return {
					label: 'INDEXING',
					dotClassName: 'bg-[var(--color-archival-accent)] animate-pulse',
				}
			case 'failed':
				return {
					label: 'FAILED',
					dotClassName: 'bg-[#b03a2e]',
				}
			case 'delayed':
				return {
					label: 'DELAYED',
					dotClassName: 'bg-[#a87b23]',
				}
			case 'indexed':
			default:
				return {
					label: 'INDEXED',
					dotClassName: 'bg-[var(--color-archival-ink)]/60',
				}
		}
	}

	const formatStatusTime = (timestamp?: number) => {
		if (!timestamp) {
			return ''
		}

		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<>
			<aside
				className={cn(
					'fixed top-0 left-0 h-full w-80 bg-[var(--color-archival-bg)] border-r border-[var(--color-archival-border)] z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col font-sans',
					isOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				<div className="flex items-center justify-between px-6 py-4 min-h-[73px] border-b border-[var(--color-archival-border)]">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-[var(--color-archival-ink)] flex items-center justify-center text-[var(--color-archival-bg)]">
							<FileText size={18} weight="fill" />
						</div>
						<span className="font-serif text-3xl font-bold tracking-tight leading-none">
							Docflare
						</span>
					</div>
					<Button
						variant="ghost"
						shape="square"
						size="base"
						icon={X}
						className="text-[var(--color-archival-ink)] hover:text-[var(--color-archival-accent)] transition-colors"
						onClick={onClose}
						aria-label="Close sidebar"
						title="Close sidebar"
					/>
				</div>

				<div className="p-4 border-b border-[var(--color-archival-border)]">
					<div className="space-y-[1px] bg-[var(--color-archival-border)]">
						<button
							type="button"
							onClick={() => {
								onNavigate?.()
								void navigate({ to: '/' })
							}}
							className={cn(
								'flex items-center gap-3 w-full px-4 py-3 bg-[var(--color-archival-bg)] font-mono text-xs uppercase tracking-[0.16em] transition-colors',
								currentPath === '/'
									? 'text-[var(--color-archival-bg)] bg-[var(--color-archival-ink)]'
									: 'text-[var(--color-archival-ink)] hover:bg-[var(--color-archival-surface)]'
							)}
						>
							<UploadSimple size={15} />
							<span>Documents</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onNavigate?.()
								void navigate({ to: '/chat' })
							}}
							className={cn(
								'flex items-center gap-3 w-full px-4 py-3 bg-[var(--color-archival-bg)] font-mono text-xs uppercase tracking-[0.16em] transition-colors',
								currentPath === '/chat'
									? 'text-[var(--color-archival-bg)] bg-[var(--color-archival-ink)]'
									: 'text-[var(--color-archival-ink)] hover:bg-[var(--color-archival-surface)]'
							)}
						>
							<Chats size={15} />
							<span>Chat</span>
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					<div className="py-4">
						<div className="flex items-center justify-between px-5 mb-3">
							<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-archival-ink)]/60 font-semibold">
								Index // Routes
							</span>
							<List size={14} className="text-[var(--color-archival-ink)]/40" />
						</div>
						<div className="px-5 py-3">
							<span className="font-mono text-xs text-[var(--color-archival-ink)]/50">
								[ DOCUMENTS FIRST // CHAT SECOND ]
							</span>
						</div>
					</div>

					<div className="py-4 border-t border-[var(--color-archival-border)]">
						<div className="flex items-center justify-between px-5 mb-3">
							<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-archival-ink)]/60 font-semibold">
								Index // Docs
							</span>
							<Folder size={14} className="text-[var(--color-archival-ink)]/40" />
						</div>
						{documents.length === 0 ? (
							<div className="px-5 py-3">
								<span className="font-mono text-xs text-[var(--color-archival-ink)]/50">
									[ NO EXHIBITS ATTACHED ]
								</span>
							</div>
						) : (
							<div className="space-y-[1px] bg-[var(--color-archival-border)]">
								{documents.map((doc) => {
									const status = getDocumentStatus(doc.status)
									const statusTime = formatStatusTime(doc.statusUpdatedAt)

									return (
										<div
											key={doc.id}
											className="flex items-center gap-3 p-3 bg-[var(--color-archival-surface)]"
										>
											<FileText size={18} className="text-[var(--color-archival-ink)]/60" weight="duotone" />
											<div className="flex-1 min-w-0">
												<div className="truncate font-mono text-xs text-[var(--color-archival-ink)]">
													{doc.name}
												</div>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<div className="font-mono text-[10px] text-[var(--color-archival-ink)]/50">
													[{doc.size}]
												</div>
												<Tooltip
													content={statusTime ? `${status.label} // ${statusTime}` : status.label}
												>
													<div className="w-2.5 h-2.5 rounded-full border border-[var(--color-archival-ink)]/20 flex items-center justify-center">
														<div className={cn('w-1.5 h-1.5 rounded-full', status.dotClassName)} />
													</div>
												</Tooltip>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>

				<div className="p-4 border-t border-[var(--color-archival-border)] bg-[var(--color-archival-bg)]">
					<div className="flex items-center justify-between font-mono text-[10px] uppercase text-[var(--color-archival-ink)]/50">
						<span>SYSTEM_V.1.0</span>
						<span>DOCFLARE</span>
					</div>
				</div>
			</aside>

			{isOpen && (
				<div
					className="fixed inset-0 bg-[var(--color-archival-ink)]/10 backdrop-blur-[2px] z-30 lg:hidden transition-opacity duration-300"
					onClick={onClose}
				/>
			)}
		</>
	)
}
