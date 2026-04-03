# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5-mini for question generation, TTS for voice)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Smart Question Generator (`artifacts/question-generator`)
- React + Vite frontend at `/`
- Upload question images (drag & drop, paste, file picker) or type manually
- OCR via Tesseract.js extracts text from images
- AI generates 3–10 similar practice questions via `/api/questions/generate`
- Features: subject/difficulty filters, count slider, answer reveal, step-by-step solutions
- Export to PDF via print, copy to clipboard
- Voice read-aloud via `/api/questions/speak` (OpenAI TTS)
- History saved to localStorage

### API Server (`artifacts/api-server`)
- Express 5 backend
- Routes:
  - `GET /api/healthz` — health check
  - `POST /api/questions/generate` — generate similar questions (OpenAI gpt-5-mini)
  - `POST /api/questions/speak` — text-to-speech (OpenAI TTS)
- Powered by `@workspace/integrations-openai-ai-server`

## Libraries

- `lib/integrations-openai-ai-server` — server-side OpenAI client (chat completions, TTS, image)
- `lib/integrations-openai-ai-react` — React hooks for voice streaming
- `lib/api-client-react` — Orval-generated React Query hooks
- `lib/api-zod` — Orval-generated Zod schemas for validation
- `lib/api-spec` — OpenAPI 3.1 spec (`openapi.yaml`)
- `lib/db` — Drizzle ORM + PostgreSQL schema
