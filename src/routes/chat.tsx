import { useAgentChat } from '@cloudflare/ai-chat/react'
import { createFileRoute } from '@tanstack/react-router'
import { useAgent } from 'agents/react'
import type { UIMessage } from 'ai'
import { useMemo } from 'react'
import { ChatInterface } from '../components/ChatInterface'
import type { Message } from '../components/MessageBubble'

export const Route = createFileRoute('/chat')({ component: ChatPage })

function mapUIMessage(message: UIMessage): Message | null {
	if (message.role !== 'user' && message.role !== 'assistant') {
		return null
	}

	const content = message.parts
		.filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
		.map((part) => part.text)
		.join('\n')
		.trim()

	if (!content) {
		return null
	}

	return {
		id: message.id,
		role: message.role,
		content,
		timestamp: new Date(),
	}
}

function ChatPage() {
	const agent = useAgent({ agent: 'ChatAgent' })
	const { messages, sendMessage, status, clearHistory } = useAgentChat({ agent })

	const mappedMessages = useMemo(
		() => messages.map(mapUIMessage).filter((message): message is Message => message !== null),
		[messages]
	)

	const isLoading = status === 'submitted' || status === 'streaming'

	return (
		<div className="flex-1 min-h-0">
			<ChatInterface
				messages={mappedMessages}
				isLoading={isLoading}
				onSendMessage={(content) => {
					sendMessage({ text: content })
				}}
				onClear={clearHistory}
			/>
		</div>
	)
}
