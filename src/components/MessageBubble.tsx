import { FileText } from '@phosphor-icons/react'
import { cn } from '@cloudflare/kumo'

export interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	files?: Array<{
		name: string
		size: string
	}>
	timestamp: Date
}

interface MessageBubbleProps {
	message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === 'user'

	return (
		<div
			className={cn(
				'w-full py-8 border-t border-[var(--color-archival-border)] first:border-t-0 animate-fade-slide-up group'
			)}
		>
			<div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 relative">
				<div className="md:w-32 shrink-0 flex flex-col gap-2">
					<div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-archival-ink)]/50 font-semibold">
						{isUser ? 'QUERY' : 'RESPONSE'}
					</div>
					<div className="font-mono text-[10px] text-[var(--color-archival-ink)]/30">
						{message.timestamp.toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
							second: '2-digit'
						})}
					</div>
				</div>

				<div className="flex-1 min-w-0">
					{isUser ? (
						<div className="font-serif text-3xl md:text-4xl text-[var(--color-archival-ink)] leading-tight tracking-tight">
							{message.content}
						</div>
					) : (
						<div className="font-sans text-[15px] md:text-base text-[var(--color-archival-ink)]/90 leading-relaxed max-w-3xl prose prose-neutral prose-p:my-2 prose-ul:my-2 prose-li:my-0">
							{message.content.split('\n').map((line, i) => {
								if (line.startsWith('- ')) {
									return <li key={i} className="ml-4 list-disc">{line.substring(2)}</li>
								}
								if (line.trim() === '') {
									return <br key={i} />
								}
								// Simple markdown bold parsing for the mock text
								const formattedLine = line.split('**').map((part, j) => 
									j % 2 === 1 ? <strong key={j} className="font-bold text-[var(--color-archival-ink)]">{part}</strong> : part
								);
								return <p key={i}>{formattedLine}</p>
							})}
						</div>
					)}

					{message.files && message.files.length > 0 && (
						<div className="mt-6 flex flex-wrap gap-2">
							{message.files.map((file, index) => (
								<div key={index} className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-archival-ink)]/20 bg-[var(--color-archival-surface)] text-[var(--color-archival-ink)] text-xs font-mono">
									<FileText size={14} className="opacity-60" />
									<span className="truncate max-w-[200px] font-semibold">{file.name}</span>
									<span className="opacity-50">[{file.size}]</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
