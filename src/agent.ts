import { AIChatAgent } from '@cloudflare/ai-chat'
import { convertToModelMessages, pruneMessages, streamText, type UIMessage } from 'ai'
import { createWorkersAI } from 'workers-ai-provider'
import { AI_SEARCH_INSTANCE, MODELS } from './lib/config'

interface RetrievedChunk {
	filename?: string
	score?: number
	content?: Array<{
		type?: string
		text?: string
	}>
}

function getLastUserMessageText(messages: UIMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index]
		if (message.role !== 'user') {
			continue
		}

		const textParts = message.parts
			.filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
			.map((part) => part.text.trim())
			.filter(Boolean)

		if (textParts.length > 0) {
			return textParts.join('\n').trim()
		}
	}

	return ''
}

function buildContext(chunks: RetrievedChunk[]): string {
	if (chunks.length === 0) {
		return ''
	}

	return chunks
		.map((chunk, index) => {
			const lines = (chunk.content ?? [])
				.filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
				.map((entry) => entry.text?.trim() ?? '')
				.filter(Boolean)

			if (lines.length === 0) {
				return null
			}

			const source = chunk.filename ?? `Document ${index + 1}`
			const confidence = chunk.score ? ` (score ${chunk.score.toFixed(2)})` : ''
			return `[${source}${confidence}]\n${lines.join('\n')}`
		})
		.filter((entry): entry is string => Boolean(entry))
		.join('\n\n')
}

function plainTextResponse(text: string): Response {
	return new Response(text, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
		},
	})
}

export class ChatAgent extends AIChatAgent<Env> {
	maxPersistedMessages = 200

	async onChatMessage(_onFinish?: unknown, options?: { abortSignal?: AbortSignal }): Promise<Response> {
		const query = getLastUserMessageText(this.messages)

		if (!query) {
			return plainTextResponse(
				'I can help you query indexed documents. Ask a question when your documents are ready.'
			)
		}

		let chunks: RetrievedChunk[] = []
		try {
			const searchResponse = (await this.env.AI.autorag(AI_SEARCH_INSTANCE).search({
				query,
				rewrite_query: true,
				max_num_results: 8,
				ranking_options: {
					score_threshold: 0.15,
				},
			})) as { data?: RetrievedChunk[] }

			chunks = searchResponse.data ?? []
		} catch (error) {
			console.error('AI Search query failed', error)
			return plainTextResponse(
				'I could not reach the search index right now. Please try again in a moment.'
			)
		}

		const contextText = buildContext(chunks)
		if (!contextText) {
			return plainTextResponse(
				'I could not find relevant information in the indexed documents for that question. Try refining your query or upload more documents first.'
			)
		}

		const workersAI = createWorkersAI({ binding: this.env.AI })
		const modelMessages = pruneMessages({
			messages: await convertToModelMessages(this.messages),
			reasoning: 'before-last-message',
		})

		const result = streamText({
			model: workersAI(MODELS.generation),
			abortSignal: options?.abortSignal,
			system: [
				'You are Docflare, a retrieval assistant for indexed PDF documents.',
				'Answer only with information grounded in the retrieved context.',
				'If context is insufficient, say so directly.',
				'Include the source file names in your answer when possible.',
				'',
				'Retrieved context:',
				contextText,
			].join('\n'),
			messages: modelMessages,
		})

		return result.toUIMessageStreamResponse()
	}
}
