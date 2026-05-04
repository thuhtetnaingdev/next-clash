# AGENTS.md

## Commands

- `pnpm dev` - Start dev server (Next.js 16)
- `pnpm build` - Build (suppresses TypeScript errors - see quirk below)
- `pnpm start` - Production server
- `pnpm lint` - ESLint (no config file - uses Next.js built-in)
- `pnpm db:push` - Push Drizzle schema to database (`drizzle-kit push`)

No test framework configured. No CI workflows.

## Architecture

- **App Router** (`app/`) - Pages and API routes follow Next.js 16 conventions
- **API Routes** - JWT auth required via `auth_token` cookie (jose library, not jsonwebtoken)
- **Middleware** (`middleware.ts`) - Protects `/dashboard/*` routes, redirects logged-in users from `/`
- **Database** - PostgreSQL via Drizzle ORM, schema in `lib/db/schema.ts`, migrations in `drizzle/`
- **Components** - shadcn/ui (New York style), path alias `@/components/ui`

## Path Aliases

`@/*` maps to `./*` (e.g., `@/lib/db/schema` → `lib/db/schema.ts`)

## Quirks

- **TypeScript errors ignored in build**: `next.config.mjs` sets `typescript.ignoreBuildErrors: true`. TypeScript strict mode is on, but build won't fail on errors.
- **Auth credentials from env**: `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env.local` are the single source of truth. User is auto-created in DB on first login via `lib/auth.ts`.
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin, no `tailwind.config.js`. Global CSS uses oklch colors and `@theme inline` syntax.
- **Vercel Analytics**: Auto-injected in production (`NODE_ENV=production`) via `@vercel/analytics/next`.
- **No `.env.local` in repo**: Gitignored. Copy `.env.example` to `.env.local` and configure.

## Database Setup

Requires PostgreSQL. After configuring `DATABASE_URL` in `.env.local`:
```bash
pnpm db:push
```

Tables: `users`, `configs`, `subscriptions`, `config_versions`
