import handler from '@tanstack/react-start/server-entry'
import { routeAgentRequest } from 'agents'
import { ChatAgent } from './agent'

// Re-export Sandbox DO class so Wrangler can discover it
export { Sandbox } from '@cloudflare/sandbox'
export { ChatAgent }

declare module '@tanstack/react-router' {
  interface Register {
    server: {
      requestContext: {
        env: Env
      }
    }
  }
}

export default {
  async fetch(request, env, _ctx) {
    const agentResponse = await routeAgentRequest(request, env)
    if (agentResponse) {
      return agentResponse
    }

    // Delegate everything else to TanStack Start
    return handler.fetch(request, {
      context: {
        env,
      },
    })
  },
} satisfies ExportedHandler<Env>
