import { useAgentChat } from '@cloudflare/ai-chat/react'
import { createFileRoute } from '@tanstack/react-router'
import { useAgent } from 'agents/react'
import type { UIMessage } from 'ai'
import { useMemo, useRef } from 'react'
import { ChatInterface } from '../components/ChatInterface'
import type { Message } from '../components/MessageBubble'

export const Route = createFileRoute('/chat')({ component: ChatPage })

function mapUIMessage(
  message: UIMessage,
  timestampMap: Map<string, Date>,
): Message | null {
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

  // Use or create a stable timestamp to avoid timestamps changing on re-renders
  let timestamp = timestampMap.get(message.id)
  if (!timestamp) {
    timestamp = new Date()
    timestampMap.set(message.id, timestamp)
  }

  return {
    id: message.id,
    role: message.role,
    content,
    timestamp,
  }
}

function ChatPage() {
  const agent = useAgent({ agent: 'ChatAgent' })
  const { messages, sendMessage, status, clearHistory } = useAgentChat({ agent })

  // Stable map to ensure timestamps don't change on re-renders
  const timestampMapRef = useRef<Map<string, Date>>(new Map())

  const mappedMessages = useMemo(
    () => messages.map((msg) => mapUIMessage(msg, timestampMapRef.current)).filter((message): message is Message => message !== null),
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
