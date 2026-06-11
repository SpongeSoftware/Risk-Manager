# Risk Manager

[![MIT License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

A full-stack web application for conducting and managing risk assessments aligned with **ISO 27001 (2022)** and **SOC 2** standards. Built for university teaching — students work in teams to identify, evaluate, and treat risks, with supervisors providing feedback and admins managing the platform.

---

## Features

- **Risk Assessments** — Create assessments against ISO 27001, SOC 2, or both frameworks
- **5×5 Risk Matrix** — Likelihood × Impact scoring with automatic criticality levels (Low · Medium · High · Critical)
- **Team Management** — Students grouped into teams per semester; supervisors allocated to one or more teams
- **Role-Based Access** — Bitwise role flags (Student · Supervisor · Admin) with granular, server-enforced permissions
- **Supervisor Feedback** — Supervisors can leave comments on any risk assessment
- **Full Audit Trail** — Every change is logged with before/after values; supervisors see team audits, admins see everything
- **On-Screen Reports** — Print-friendly per-team risk summary with totals and criticality breakdown
- **Dark / Light / System Theme** — PrimeReact lara-purple with seamless toggle in the navigation bar
- **Semester Lifecycle** — Teams are tied to semesters; inactive semesters make assessments read-only and prevent student sign-in

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Router v7 (framework mode, SSR) |
| UI | PrimeReact 10 + Tailwind CSS v4 + primeflex |
| Database | Turso (libsql) via Drizzle ORM |
| Auth | WorkOS AuthKit (`@workos-inc/authkit-react-router`) |
| State | TanStack Store + TanStack Query |
| Validation | Zod + t3-env |
| Build | Vite 8 + React Compiler |
| Observability | Sentry (dev/test/prod separation) |
| Components | Storybook 10 |

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- A [WorkOS](https://workos.com) account with AuthKit configured
- A [Turso](https://turso.tech) database (or local SQLite for development)
- A [Sentry](https://sentry.io) project (optional — production error tracking)

---

## Quick Start

### 1. Set up environment variables

```bash
cp .env.development .env
```

Fill in your credentials:

| Variable | Description |
|---|---|
| `WORKOS_CLIENT_ID` | WorkOS application client ID |
| `WORKOS_API_KEY` | WorkOS API key (secret) |
| `WORKOS_REDIRECT_URI` | OAuth callback URL — e.g. `http://localhost:5173/callback` |
| `WORKOS_COOKIE_PASSWORD` | Cookie encryption secret — must be 32+ characters |
| `BOOTSTRAP_ADMIN_EMAIL` | The first admin's email. Signs in via WorkOS and auto-provisions as Admin |
| `TURSO_DATABASE_URL` | `file:./data/db.sqlite` for local dev, or your Turso connection URL |

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

Creates all tables and seeds the internal `system` user used for audit columns.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with your `BOOTSTRAP_ADMIN_EMAIL` — your Admin account is created automatically on first sign-in.

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | Generate route types + TypeScript check |
| `pnpm lint` | ESLint (strict, no Prettier) |
| `pnpm db:generate` | Generate SQL migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio to browse your database |
| `pnpm storybook` | Launch Storybook for UI component development |

---

## Roles

Roles are stored as a **bitwise integer flag** so a single user can hold multiple roles.

| Role | Value | Access |
|---|---|---|
| Student | 1 | View and edit risk assessments for their active team only |
| Supervisor | 2 | Manage team members, leave feedback, view team audit trail |
| Admin | 4 | Full access — manage users, teams, semesters, view all audits |

Common combinations: `Supervisor + Admin = 6` · `Student + Supervisor = 3`

---

## Bootstrapping the First Admin

Set `BOOTSTRAP_ADMIN_EMAIL` in your `.env` file. When that email signs in for the first time via WorkOS and no accounts exist in the database yet, an Admin account is created automatically. After that, all new accounts must be created by an Admin through the **Users** management page.

---

## Sentry Environment Separation

| `APP_ENV` | Behaviour |
|---|---|
| `development` | Sentry is **disabled** — no noise during local development |
| `test` | Sentry enabled, tagged as `test` — errors don't pollute production dashboards |
| `production` | Fully enabled, source maps uploaded at build time for readable stack traces |

---

## License

[MIT](LICENSE)
