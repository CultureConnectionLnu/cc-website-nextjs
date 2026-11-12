# Culture Connection Website

This is the website for [Culture Connection](https://cultureconnection.se), a non-alcohol-focused student association at Linnaeus University. It combines a public marketing site with a member area: event listings, membership signup, achievements and badges, QR-based event check-in, a flag game, and an admin dashboard for managing content.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion, GSAP, Embla |
| Language | TypeScript and JavaScript (mixed) |
| Auth | Clerk (roles via `publicMetadata`) |
| Data | SQLite (`better-sqlite3`) + JSON files validated with Zod |
| Content | MDX (`@next/mdx`) for bylaws and code of conduct |
| Tooling | Biome (lint + format), `tsc --noEmit` |
| Runtime | Node.js 26, npm |
| Hosting | Railway (persistent volume for `data/`) |

## Getting started

### Prerequisites

- Node.js 26 (see `.nvmrc` / `mise.toml`)
- npm 10+

### Setup

```bash
nvm use          # or: mise install
npm install
./setup.sh       # creates data/ and the public/data symlink
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`setup.sh` is primarily for production (it bridges `./data` to the Railway volume mounted at `/data`), but it is safe to run locally and is the easiest way to get the storage layout right. Without it, `public/data` must point at `../data/public`.

You need the environment variables listed below before the app will start, because `src/env.ts` validates them at boot. For a quick local build without secrets, set `SKIP_ENV_VALIDATION=1`.

## Environment variables

Environment files are git-ignored (`.env*`). Create `.env.local` for development and set the same values in the Railway dashboard for production. Environment variables are parsed with zod and the schema should be updated if variables are changed.

`SKIP_ENV_VALIDATION=1` disables the `src/env.ts` check (used by CI).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Biome lint with autofix |
| `npm run lint-check` | Biome lint without writing |
| `npm run format` | Biome format with autofix |
| `npm run format-check` | Biome format check (CI) |
| `npm run typecheck` | `tsc --noEmit` |

There is no automated test suite; CI enforces build, formatting, and type checks.

## Project structure

```text
src/
├── app/                 # App Router pages and API routes
│   ├── admin/           # Admin dashboard (agendas, members, content)
│   ├── api/             # Route handlers (see below)
│   ├── claim/[token]/   # Membership claim flow
│   ├── flag-game/       # Browser game
│   ├── membership/      # Membership signup
│   └── ...              # about, achievements, bylaws, events, gallery, ...
├── components/          # UI, grouped by feature
├── lib/                 # auth, db, data store, badges, scoring
├── markdown/            # MDX content (bylaws, code of conduct)
├── env.ts               # Validated environment schema
└── proxy.ts             # Clerk middleware
data/                    # SQLite DB + JSON stores (git-ignored)
public/data -> ../data/public
setup.sh                 # Railway volume / data symlink bootstrap
```

### API areas

- `/api/main/*` — public content (cards, linktree, sponsors, contact)
- `/api/user/*` — profile, settings, favorites, card skin, identity tokens
- `/api/qr/*` — generate/scan event tokens, verify user tokens
- `/api/admin/*` — agendas, attendance templates, bylaws, cards, colors, guidelines, linktree, members, sponsors, users, One.com files
- `/api/events`, `/api/achievements`, `/api/memberships`, `/api/propositions`, `/api/slideImages`, `/api/game/score`

## Data storage

Two stores, both under `data/`:

1. **SQLite** — `data/achievements.db` via `better-sqlite3`. Holds achievements, per-user achievement status, favorites, and game scores. Tables are created on first use in `src/lib/db.ts`.
2. **JSON** — `data/public/*.json`, read/written through `DataStore` in `src/lib/dataStore.ts`. Each store has a Zod schema and writes atomically (temp file + rename). `public/data` is a symlink to `../data/public` so the files are served statically.

In production, Railway mounts a volume at `/data`; `setup.sh` links `./data` to it and seeds it from the image on first boot. Because of that, never replace `public/data` with a real directory.

## Auth and roles

Clerk handles authentication. Roles live in the user's Clerk `publicMetadata` as booleans:

```json
{ "admin": true, "committee": false, "member": true }
```

Use `withAuth({ roles: [...] })` for API routes, or `requireUser()` / `requireRole()` in server code — all from `src/lib/auth.ts`. `src/proxy.ts` runs Clerk middleware across pages and API routes. Admin endpoints typically accept `admin` (and sometimes `committee`) roles, declared per route.

## CI and deployment

`.github/workflows/wait-for-ci.yml` runs on every PR and on pushes to `main`:

```bash
npm ci
npm run build
npm run format-check
npm run typecheck
```

Linting is intentionally not enforced in CI yet. `main` is the Railway deploy branch. Railway runs `setup.sh` before build and start so the `/data` volume is linked before the app boots.

## Conventions

- Biome is the source of truth for formatting (tabs, double quotes) and linting.
- Import from `src` with the `@/` alias.
- Prefer `DataStore` for new JSON-backed content and keep its Zod schema next to the usage.
- Run `npm run format && npm run typecheck` before opening a PR.
- Prefer typescript for any new code, and migrate existing modules to typescript when making significant edits.