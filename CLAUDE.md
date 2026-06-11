# Risk Manager — Codebase Guide

This document gives Claude Code the context needed to work in this repository without re-deriving architecture from scratch.

## Quick Reference

```bash
pnpm dev              # start dev server (http://localhost:5173)
pnpm build            # production build
pnpm typecheck        # react-router typegen + tsc
pnpm lint             # eslint
pnpm db:generate      # generate SQL migrations after schema changes
pnpm db:migrate       # apply migrations + seed system user
pnpm db:studio        # Drizzle Studio browser
pnpm storybook        # component explorer (port 6006)
```

## Code Style (enforced by ESLint)

- **Tabs** for indentation (not spaces)
- **Double quotes** for all strings
- **No semicolons** — omit unless syntactically required
- **No Prettier** — ESLint handles formatting-adjacent rules
- **React Compiler** is active — do NOT add `useMemo` / `useCallback` manually

## Architecture

### Framework
React Router v7 **framework mode** with SSR. Routes are defined in `app/routes.ts` using the code-based API (not file-system auto-discovery). Every route file exports `loader` (data loading) and/or `action` (mutations) + a default React component.

### Auth
WorkOS `authkit-react-router`. The `app/server/auth.ts` module exports:
- `requireUser(request)` — ensures user is signed in and pre-provisioned in the DB; redirects to `/login` otherwise
- `requireRole(request, Role.Admin)` — calls `requireUser` + checks bitmask flag
- `requireActiveTeam(request)` — for the `_app` layout: Supervisors/Admins always pass; Students need at least one active team

The `app.tsx` layout loader wraps `authkitLoader` for session refresh and calls `requireActiveTeam`. All child routes call `requireUser` again for their own guards.

### Database
Turso (libsql) + Drizzle ORM. Schema is in `app/server/schema.ts`. Query functions are organised by entity in `app/server/queries/`.

**Soft deletes** — never call SQL DELETE. Always update `deleted_at` + `deleted_by`. All queries filter `WHERE deleted_at IS NULL` by default.

**Audit columns** — every table except `audits` has `created_by`, `created_date`, `modified_by`, `modified_date`, `deleted_at`, `deleted_by`. Pass `actorId` through to all write functions.

The `system` user (id `'system'`) is seeded by `pnpm db:migrate` — use it for `createdBy`/`modifiedBy` in seed data or migrations.

### Roles (bitwise)
```ts
Role.Student    = 1
Role.Supervisor = 2
Role.Admin      = 4
```
Check: `hasRole(user.role, Role.Admin)` — imported from `app/lib/roles.ts`.

A user can hold multiple roles (e.g. `role = 6` = Supervisor + Admin). Always use `hasRole()` — never `user.role === Role.Admin`.

### State
- **Server data** → React Router loaders (primary path)
- **Client UI state** → TanStack Store (`app/store/index.ts`): sidebar, toasts, dark mode, inline edit state
- **Client-side polling** → TanStack Query (use sparingly — only for data that can't be loaded at route level)

### Theme
`colorScheme` in TanStack Store persists to `localStorage`. The `useColorScheme` hook in `app/hooks/useColorScheme.ts` swaps the `#primereact-theme` `<link>` element between lara-light-purple and lara-dark-purple, and toggles `class="dark"` on `<html>` for Tailwind. Do NOT add manual theme logic in components — use this hook or the `setColorScheme()` action.

## Adding a New Route

1. Create `app/routes/app.your-route.tsx` with `loader` / `action` / default component
2. Add it to `app/routes.ts` using `route("path", "routes/app.your-route.tsx")`
3. Run `pnpm typecheck` — route types are auto-generated into `.react-router/types/`
4. Use `import type { Route } from "./+types/app.your-route"` for typed `loader`/`action` args

## Adding a New Query

1. Add the function to the relevant file in `app/server/queries/`
2. Re-export it from `app/server/queries/index.ts`
3. All write functions should: accept `actorId: string`, update `modifiedBy`/`modifiedDate`, and call `appendAudit()`

## Storybook

Stories live next to their components: `RiskScoreBadge.tsx` + `RiskScoreBadge.stories.tsx`. Domain components must accept all data as props — they must not call route hooks or DB functions directly. The `ui/` components are thin PrimeReact wrappers; the `domain/` components are business-aware (risk scores, frameworks, statuses).

## Validation

All form action handlers parse `formData` with a Zod schema from `app/lib/schemas/`. If `safeParse` fails, return `data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })`. Never write to the DB without validating first.
