# ProductPulse

A competitive intelligence app that automatically monitors competitors' changelogs, release notes, and pricing pages, detects changes, and uses AI to explain what changed and why it matters. Portfolio/learning project in the spirit of Crayon Intelligence — AI-native, focused purely on product signals rather than broad market intel.

## Stack

Next.js 16, Drizzle ORM 0.45, Neon Postgres, Tailwind 4 / shadcn/ui, deployed on Vercel.

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env   # fill in your Neon connection strings
npx drizzle-kit push   # applies the schema to your Neon database
npx next dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon connection string (host contains `-pooler`). Used by the app at runtime via `drizzle-orm/neon-http`. |
| `DATABASE_URL_UNPOOLED` | Direct (unpooled) Neon connection string. Used **only** by `drizzle-kit` for schema push/generate/migrate — never run `drizzle-kit push` in CI or on Vercel; it's a local dev-machine operation. |

## Expected behavior

- **Cold start / autosuspend**: Neon's free tier suspends the compute after 5 minutes of inactivity. The first request after idle takes roughly 0.5–2s while it wakes up — this is expected and not a bug; no keep-alive pinger is used.

## Security note

This is a single-user portfolio demo with **no authentication** by design. Mutation endpoints (add/edit/delete competitor) are publicly reachable. Inputs are validated with zod, including an SSRF host denylist that blocks internal/private addresses. This is an accepted risk for a demo-scale build — revisit before any multi-user use.

## Tests

```bash
npx vitest run
```
