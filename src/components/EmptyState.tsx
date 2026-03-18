import { UploadSimple } from '@phosphor-icons/react'
import { Button } from '@cloudflare/kumo'

interface EmptyStateProps {
	onUploadClick?: () => void
	title?: string
	description?: string
}

export function EmptyState({
	onUploadClick,
	title = 'Docflare Index',
	description = 'Upload your dossier, contract, or technical brief. The system will parse and prepare the evidence for interrogation.',
}: EmptyStateProps) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-slide-up bg-[var(--color-archival-bg)]">
			<div className="max-w-2xl w-full text-center stagger-1">
				<h2 className="font-serif text-6xl md:text-8xl font-bold tracking-tight text-[var(--color-archival-ink)] mb-4 leading-none">
					{title}
				</h2>
				<p className="font-sans text-lg md:text-xl text-[var(--color-archival-ink)]/70 mb-12 max-w-xl mx-auto leading-relaxed">
					{description}
				</p>

				{onUploadClick && (
					<Button
						variant="ghost"
						size="lg"
						icon={UploadSimple}
						onClick={onUploadClick}
						className="group relative w-full max-w-md mx-auto !h-auto aspect-video flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[var(--color-archival-ink)]/30 hover:border-[var(--color-archival-accent)] hover:bg-[var(--color-archival-accent)]/5 transition-all duration-300 [&_svg]:size-12 [&_svg]:text-[var(--color-archival-ink)]/40 group-hover:[&_svg]:text-[var(--color-archival-accent)]"
					>
						<div className="absolute top-2 left-2 font-mono text-[10px] uppercase text-[var(--color-archival-ink)]/40 group-hover:text-[var(--color-archival-accent)] transition-colors">
							[ DROP_ZONE ]
						</div>
						<div className="absolute bottom-2 right-2 font-mono text-[10px] uppercase text-[var(--color-archival-ink)]/40 group-hover:text-[var(--color-archival-accent)] transition-colors">
							MAX: 50MB // PDF
						</div>
						
						<div className="flex flex-col items-center">
							<span className="font-sans font-bold text-[var(--color-archival-ink)] group-hover:text-[var(--color-archival-accent)] text-lg transition-colors">
								Select Document
							</span>
							<span className="font-mono text-xs text-[var(--color-archival-ink)]/50 mt-1 transition-colors">
								or drag and drop here
							</span>
						</div>
					</Button>
				)}
			</div>
		</div>
	)
}
