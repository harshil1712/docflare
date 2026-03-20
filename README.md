# Docflare

Chat with your documents. Upload PDFs, ask questions, and get AI-generated answers grounded in your document content.

Built on TanStack Start + Cloudflare Workers with a two-strategy PDF extraction pipeline (fast text extraction for text-layer PDFs, OCR fallback for scanned documents), RAG via Cloudflare AI Search, and streaming chat responses.

## Features

- **Two-strategy PDF extraction**: Fast `env.AI.toMarkdown()` for text-layer PDFs, RapidOCR in a Sandbox container for scanned/image PDFs
- **RAG pipeline**: Chunking, embedding, indexing, and retrieval handled by Cloudflare AI Search
- **Streaming responses**: Real-time AI answers via WebSocket with the Vercel AI SDK
- **Multi-document support**: Upload multiple PDFs and query across all of them
- **Persistent storage**: Original PDFs and extracted text stored in R2, surviving across sessions
- **Multilingual**: Supports documents in English, German, and other languages

## Tech Stack

| Layer          | Technology                                                |
| -------------- | --------------------------------------------------------- |
| Framework      | TanStack Start (React 19, file-based routing)             |
| Runtime        | Cloudflare Workers                                        |
| Chat Agent     | `AIChatAgent` Durable Object from `@cloudflare/ai-chat`   |
| AI SDK         | Vercel AI SDK + `workers-ai-provider`                     |
| PDF Extraction | Workers AI `toMarkdown()` + RapidOCR in Sandbox container |
| Storage        | Cloudflare R2                                             |
| RAG            | Cloudflare AI Search (chunking, embedding, retrieval)     |
| Generation     | Workers AI (`@cf/nvidia/nemotron-3-120b-a12b`)            |
| Styling        | Tailwind CSS v4 + `@cloudflare/kumo`                      |
| Icons          | `@phosphor-icons/react`                                   |

## Prerequisites

- Node.js 20+
- Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed
- An R2 bucket created for document storage
- An AI Search instance configured for your R2 bucket

## Setup

### 1. Clone and install

```bash
git clone https://github.com/harshil1712/docflare.git
cd docflare
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

| Variable                | Where to find                                                               |
| ----------------------- | --------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard (right sidebar on any page)                            |
| `AI_SEARCH_API_TOKEN`   | Create an AI Search instance → Generate API token with AI Search read/write |

### 3. Create Cloudflare resources

**Create R2 bucket:**
```bash
npx wrangler r2 bucket create docflare-docs
```

**Create AI Search instance:**
1. Go to Cloudflare Dashboard → AI Search
2. Create an instance named `docflare-search` (or update `src/lib/config.ts`)
3. Connect it to your `docflare-docs` R2 bucket
4. Configure path filter: include `documents/**` (excludes original PDFs from indexing)
5. Generate an API token and add it to `.env`

### 4. Regenerate types

```bash
npm run cf-typegen
```

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Deploy

```bash
npm run deploy
```

## Architecture

### Upload Flow

1. User uploads PDF via drag-and-drop or file picker
2. Original PDF stored in R2: `originals/{fileName}`
3. Text extracted using two-strategy approach
4. Extracted markdown stored in R2: `documents/{fileName}.md`
5. AI Search indexes the markdown file (automatic sync)

### Query Flow

1. User asks a question in chat
2. ChatAgent queries AI Search for relevant document chunks
3. Retrieved chunks + conversation history sent to Workers AI
4. Streaming response returned to user

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React)                        │
│  Documents Page (/)   →   Chat Page (/chat)                   │
│  Upload PDF              Ask questions                        │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                Cloudflare Worker (server.ts)                  │
│  TanStack Start routes  +  ChatAgent Durable Object           │
└────────────────────────┬───────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
  ┌─────────────┐               ┌─────────────────┐
  │ R2 Storage  │               │ AI Search       │
  │ originals/  │               │ (RAG pipeline)  │
  │ documents/  │               └─────────────────┘
  └─────────────┘                        │
                                         ▼
                                 ┌─────────────────┐
                                 │ Workers AI      │
                                 │ LLM generation  │
                                 └─────────────────┘
```

## Environment Variables

See `.env.example` for the full template.

| Variable                | Required | Description                                         |
| ----------------------- | -------- | --------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Yes      | Your Cloudflare account ID                          |
| `AI_SEARCH_API_TOKEN`   | Yes      | API token for AI Search with read/write permissions |

## Scripts

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Start development server on port 3000             |
| `npm run build`      | Build for production                              |
| `npm run preview`    | Preview production build locally                  |
| `npm run deploy`     | Deploy to Cloudflare Workers                      |
| `npm run test`       | Run Vitest tests                                  |
| `npm run cf-typegen` | Regenerate Cloudflare types from `wrangler.jsonc` |

## Configuration

Update `src/lib/config.ts` to change:

- AI model for generation
- AI Search instance name
- R2 path prefixes

## Troubleshooting

**PDF not searchable immediately after upload**
- AI Search has a short indexing delay. The app shows a status indicator while indexing is in progress.

**Scanned PDF returns no text**
- The OCR fallback (RapidOCR in Sandbox) handles this. First upload will take 5-10 seconds as the Sandbox cold starts.

**AI Search API errors**
- Verify your `AI_SEARCH_API_TOKEN` has the correct permissions (AI Search:read and AI Search:write)
- Check that your AI Search instance is connected to the correct R2 bucket

## Security

This application does not implement application-level authentication. It is designed to run behind [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/), which handles authentication at the network layer before requests reach the Worker.

If you deploy this without Cloudflare Access (or an equivalent auth proxy), all endpoints — including document upload, document listing, and the chat agent — will be publicly accessible.

## License

MIT
