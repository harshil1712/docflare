import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Button, InputArea, cn } from '@cloudflare/kumo'
import { MessageBubble, type Message } from './MessageBubble'
import { EmptyState } from './EmptyState'

interface ChatInterfaceProps {
	messages: Message[]
	isLoading?: boolean
	onSendMessage: (content: string) => void
	onClear?: () => void
	className?: string
}

export function ChatInterface({
	messages,
	isLoading = false,
	onSendMessage,
	onClear,
	className,
}: ChatInterfaceProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const [inputValue, setInputValue] = useState('')

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [messages, scrollToBottom])

	const handleSend = useCallback(() => {
		if (!inputValue.trim() || isLoading) {
			return
		}

		const content = inputValue.trim()

		setInputValue('')
		onSendMessage(content)

		if (inputRef.current) {
			inputRef.current.style.height = 'auto'
		}
	}, [inputValue, isLoading, onSendMessage])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSend()
			}
		},
		[handleSend]
	)

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value)
		e.target.style.height = 'auto'
		e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
	}, [])

	return (
		<div className={cn('flex flex-col h-full bg-[var(--color-archival-bg)] relative z-10', className)}>
			{messages.length === 0 ? (
				<EmptyState
					title="Query the Archive"
					description="Ask a question about your indexed documents. Upload and manage documents from the Documents route."
				/>
			) : (
				<div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 space-y-0">
					{messages.map((message) => (
						<MessageBubble key={message.id} message={message} />
					))}

					{isLoading && (
						<div className="w-full py-8 border-t border-[var(--color-archival-border)] animate-fade-slide-up">
							<div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 relative">
								<div className="md:w-32 shrink-0 flex flex-col gap-2">
									<div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-archival-ink)]/50 font-semibold">
										SYSTEM
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-mono text-sm text-[var(--color-archival-accent)]">
										[ GENERATING_RESPONSE ]
										<span className="thinking-cursor ml-2" />
									</div>
								</div>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} className="h-4" />
				</div>
			)}

				<div className="p-4 md:p-6 border-t border-[var(--color-archival-border)] bg-[var(--color-archival-bg)]">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-end gap-3 bg-[var(--color-archival-surface)] border border-[var(--color-archival-border)] focus-within:border-[var(--color-archival-ink)] transition-colors p-2">
							<div className="flex-1 relative">
								<InputArea
									ref={inputRef}
									value={inputValue}
									onChange={handleInputChange}
									onKeyDown={handleKeyDown}
									placeholder="Ask a question about indexed documents..."
									disabled={isLoading}
									className="w-full border-none bg-transparent text-[var(--color-archival-ink)] font-serif text-xl placeholder:text-[var(--color-archival-ink)]/30 min-h-[44px] max-h-[200px] resize-none focus:outline-none p-2 leading-relaxed shadow-none"
									rows={1}
								/>
							</div>

							<Button
								variant="ghost"
								shape="square"
								size="base"
								icon={ArrowRight}
								className={cn(
									"flex items-center justify-center w-12 h-12 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-archival-accent)] focus:ring-offset-2 mb-0.5 mr-0.5",
									inputValue.trim()
										? "bg-[var(--color-archival-accent)] text-[var(--color-archival-bg)] border-[var(--color-archival-accent)] hover:bg-[var(--color-archival-ink)] hover:border-[var(--color-archival-ink)]"
										: "bg-[var(--color-archival-surface)] text-[var(--color-archival-ink)]/30 border-[var(--color-archival-ink)]/10"
								)}
								onClick={handleSend}
								disabled={!inputValue.trim() || isLoading}
								aria-label="Send message"
								title={inputValue.trim() ? 'Execute Query' : 'Awaiting Input'}
							/>
						</div>

					<div className="mt-3 flex justify-between items-center px-1">
						<span className="font-mono text-[10px] text-[var(--color-archival-ink)]/40 uppercase tracking-widest">
							[AWAITING_COMMAND]
						</span>
						<div className="flex items-center gap-4">
							{messages.length > 0 && onClear && (
								<button
									onClick={onClear}
									className="font-mono text-[10px] text-[var(--color-archival-ink)]/40 uppercase tracking-widest hover:text-[var(--color-archival-accent)] transition-colors"
									type="button"
								>
									[CLEAR_HISTORY]
								</button>
							)}
							<span className="font-mono text-[10px] text-[var(--color-archival-ink)]/40">
								ENTER to execute // SHIFT+ENTER for newline
							</span>
						</div>
					</div>
					</div>
				</div>
			</div>
	)
}
