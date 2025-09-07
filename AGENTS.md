# Repository Guidelines

## Project Structure & Module Organization
- Source code lives in `src/`.
  - `src/api/` (HTTP routes) → `v1/*` defines public endpoints.
  - `src/services/` (business logic) and `src/schemas/` (Zod validation).
  - `src/drizzle/` (ORM) with `schema.ts`, `relations.ts`, and `generated/` outputs.
  - `src/lib/` (helpers: auth, utils, slugs, http errors), `src/middlewares/`.
- Type declarations are emitted to `dist/` via `tsconfig.types.json`.

## Build, Test, and Development Commands
- `bun run dev` — Run the server in watch mode (`src/index.ts`).
- `bun run build` — Produce a compiled binary at `build/server` (minified).
- `bun run start` — Start the compiled binary (`NODE_ENV=production`).
- `bun run build:types` — Emit TypeScript declarations to `dist/`.
- Drizzle (manual): `bunx drizzle-kit generate` then `bunx drizzle-kit migrate`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Runtime: Bun. Web framework: Elysia.
- Imports use `@/*` alias (see `tsconfig.json`). Prefer named exports.
- Indent 2 spaces; use semicolons and double quotes to match existing files.
- Keep modules cohesive: API → Services → Schemas → DB. Avoid circular deps.

## Testing Guidelines
- No test runner is configured. Prefer `bun test` or Vitest.
- Place tests under `src/**/__tests__/` or as `*.test.ts` near code.
- Test services, `lib/*`, and schema parsing logic. Mock DB where possible.
- Aim for meaningful coverage on core logic; avoid brittle route-level tests.

## Commit & Pull Request Guidelines
- Commit style follows Conventional Commits (e.g., `feat: ...`, `fix: ...`, `build: ...`).
- Write clear, imperative subjects; include scope when useful (`feat(api): ...`).
- PRs should include: summary, rationale, screenshots for API docs changes (if Swagger), and linked issues.
- Keep PRs focused and minimal; add migration notes when changing schemas.

## Security & Configuration Tips
- Required env vars: `DATABASE_URL`, `NODE_ENV`; optional `DEV_ORIGIN` for CORS.
- Update `allowedOrigins` in `src/index.ts` if domains change.
- Never commit `.env` or database credentials. Rotate keys when needed.
- For DB changes, use Drizzle migrations and review generated SQL before applying.

