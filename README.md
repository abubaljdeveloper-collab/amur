# Instagram AI Agent — MVP Scaffold

An AI agent that manages an Instagram Professional Account: generates and publishes
content, monitors and replies to comments/DMs, escalates sensitive cases to the human
owner, and tracks analytics — all gated by a Decision Engine that requires policy,
safety, and (by default) human approval before anything touches Instagram.

This is a **full-breadth scaffold**: every piece is wired end-to-end but shallow. See
`packages/decision-engine/src/index.ts` for the safety-critical core.

## Prerequisites

- Node.js 20+ (this repo was set up with nvm — `nvm use --lts`)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- PostgreSQL 16 and Redis running locally (or via Docker: `docker-compose up -d`)
- An Anthropic API key (required — the AI Gateway is wired to the real Claude API, not stubbed)

## Setup

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY at minimum
# generate secrets:
openssl rand -base64 32   # -> AUTH_SECRET
openssl rand -base64 32   # -> ENCRYPTION_KEY

pnpm db:generate
pnpm db:migrate
pnpm db:seed   # creates a demo user (owner@example.com) + mock-connected Instagram account
```

## Running

```bash
pnpm dev:web      # Next.js dashboard on http://localhost:3000
pnpm dev:worker   # BullMQ workers (webhooks, scheduling, analytics, token refresh)
```

Both must be running for the full pipeline (webhook -> queue -> agent -> Decision
Engine -> Instagram) to work.

## Instagram integration: mock vs real

`INSTAGRAM_CLIENT_MODE` in `.env` controls everything:

- **`mock` (default)** — no Meta app needed. `packages/instagram-client/src/mock.ts`
  fakes the entire Graph API (OAuth, publishing, comments, DMs, insights) so you can
  exercise the full product locally. Use the "🧪 محاكاة" panel on the dashboard, or
  `POST /api/dev/simulate-event`, to push signed webhook events through the real
  webhook route -> queue -> worker -> agent -> Decision Engine pipeline without ngrok.
- **`real`** — calls the actual Meta Graph API via `packages/instagram-client/src/graph.ts`.

### Going live with real Instagram (manual steps, not code)

1. Create a Meta App at developers.facebook.com, add the **Instagram** product.
2. Configure **Instagram Business Login** and set the OAuth redirect URI to
   `<your domain>/api/instagram/oauth/callback` (must match `INSTAGRAM_REDIRECT_URI`).
3. Set the webhook callback URL to `<your domain>/api/webhooks/instagram` and the
   verify token to match `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`.
4. Subscribe the webhook to the `comments`, `messages`, and `mentions` fields.
5. Request these permissions and submit for App Review:
   `instagram_business_basic`, `instagram_business_content_publish`,
   `instagram_business_manage_comments`, `instagram_business_manage_messages`,
   `instagram_business_manage_insights`.
6. Set `INSTAGRAM_CLIENT_MODE=real`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` in `.env`.

No code changes are needed — `packages/instagram-client/src/factory.ts` swaps
implementations based on `INSTAGRAM_CLIENT_MODE` alone.

## What's not built yet (by design)

Flagged as follow-up work, not part of this scaffold: AI image/video generation
(owner uploads media manually for now), A/B testing, multi-account dashboard UI,
vector-embedding knowledge-base retrieval (currently keyword match), and tuning
autonomy Level 4 as a real default (the enforcement logic exists; the safe default
stays Level 2 — approval required for every Instagram-facing action).

See `.claude/plans/prd-effervescent-book.md` (or wherever this session's plan was
saved) for the full build-order rationale.
