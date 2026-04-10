# Acquittance

Next.js (App Router) + shadcn/ui + Better Auth (v1.6).

## Local setup

1) Install deps

```bash
pnpm install
```

2) Create `.env.local` (you can copy from `.env.example`)

```bash
# Required (32+ chars)
BETTER_AUTH_SECRET="change-me-change-me-change-me-change-me"

# Required (for cookie + link generation)
BETTER_AUTH_URL="http://localhost:3000"

# Optional (defaults to a local file DB)
TURSO_DATABASE_URL="file:./.data/auth.db"
# TURSO_AUTH_TOKEN="..." # only for remote Turso/libsql

# AI (Groq via AI SDK)
GROQ_API_KEY="..."
AI_CHAT_DEFAULT_PROFILE="kisan-vakil" # or "default"

# Optional: Upstash Redis (for caching)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

3) Initialize the DB schema

```bash
pnpm drizzle-kit push
```

4) Run

```bash
pnpm dev
```

## Routes

- `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/two-factor`
- `/dashboard` (requires session)
- Better Auth handler: `/api/sessions/[...all]` (alias: `/api/auth/[...all]`)

## Notes on Better Auth 1.6

- Session `freshAge` is now aligned to `createdAt` (not `updatedAt`). If you start using session freshness checks, this can make sensitive actions require re-auth more often.
