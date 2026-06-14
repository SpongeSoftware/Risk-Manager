<p align="center">
  <img src="public/logo.svg" alt="Risk Manager" height="60" />
</p>

<h1 align="center">Risk Manager</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="MIT License" /></a>
  <a href="https://github.com/SpongeSoftware/Risk-Manager/actions/workflows/ci.yml"><img src="https://github.com/SpongeSoftware/Risk-Manager/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

<p align="center">
  A full-stack web application for conducting and managing risk assessments aligned with <strong>ISO 27001 (2022)</strong> and <strong>SOC 2</strong> standards.<br />
  Built for university teaching — students work in teams to identify, evaluate, and treat risks, with supervisors providing feedback and admins managing the platform.
</p>

---

Risk Manager gives each student team a structured workspace to build and maintain a risk register. Risks are scored on a **5×5 likelihood × impact matrix** that automatically assigns criticality levels (Low, Medium, High, Critical). Supervisors leave feedback directly on assessments, every change is captured in a full audit trail, and admins control the semester lifecycle — closing a semester locks assessments and prevents student sign-in.

**Highlights:** dual-framework support (ISO 27001 + SOC 2) · role-based access enforced server-side · print-friendly per-team reports · dark/light/system theme · full audit history with before/after values

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

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 22
- [pnpm](https://pnpm.io) 10.15.1 — `npm install -g pnpm` (version pinned via `packageManager`; corepack enforces it automatically)
- A [WorkOS](https://workos.com) account with an AuthKit application configured
- A [Turso](https://turso.tech) database **or** local SQLite (no account needed for local dev)

### 1. Clone and install

```bash
git clone https://github.com/SpongeSoftware/Risk-Manager.git
cd risk-manager
pnpm install
```

### 2. Set up environment variables

Create a `.env` file with the minimum required for local development:

```env
APP_ENV=development
VITE_APP_ENV=development

# Use local SQLite — no Turso account needed for dev
TURSO_DATABASE_URL=file:./data/db.sqlite

# WorkOS AuthKit — create a free account at workos.com
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_REDIRECT_URI=http://localhost:5173/callback
WORKOS_COOKIE_PASSWORD=replace-with-a-random-32-character-secret

# Auto-provisioned as Admin on first sign-in (remove after initial setup)
BOOTSTRAP_ADMIN_EMAIL=you@example.com
```

> Sentry variables are optional in development — Sentry is disabled when `APP_ENV=development`.

### 3. Configure WorkOS

In your [WorkOS dashboard](https://dashboard.workos.com):

1. Create a new application and enable **AuthKit**
2. Add `http://localhost:5173/callback` as a **Redirect URI**
3. Copy the **Client ID** and **API Key** into your `.env`

### 4. Run migrations and start the server

```bash
pnpm db:migrate   # creates ./data/db.sqlite and seeds the system user
pnpm dev          # http://localhost:5173
```

Sign in with your `BOOTSTRAP_ADMIN_EMAIL` — the Admin account is created automatically on first sign-in.

> **First admin:** `BOOTSTRAP_ADMIN_EMAIL` only takes effect when no other users exist. After the first Admin is created, all subsequent accounts must be provisioned through the **Users** management page. The variable can be removed from the environment once setup is complete.

### Useful dev tools

```bash
pnpm db:studio    # Drizzle Studio at http://localhost:4983
pnpm storybook    # Component explorer at http://localhost:6006
```

---

## Configuration Reference

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | Yes | `development` | Runtime environment: `development`, `test`, or `production`. Controls Sentry behaviour. |
| `VITE_APP_ENV` | Yes | — | Must match `APP_ENV`. Exposes the environment to the browser bundle. |

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `TURSO_DATABASE_URL` | Yes | `file:./data/db.sqlite` | Use `file:./data/db.sqlite` for local dev, or a `libsql://` URL for Turso cloud. |
| `TURSO_AUTH_TOKEN` | No | — | Required for remote Turso databases. Not needed for local SQLite. |

### Authentication (WorkOS)

| Variable | Required | Description |
|---|---|---|
| `WORKOS_CLIENT_ID` | Yes | Your WorkOS application's Client ID. |
| `WORKOS_API_KEY` | Yes | Your WorkOS API secret key. Never expose this to the browser. |
| `WORKOS_REDIRECT_URI` | Yes | OAuth callback URL. Dev: `http://localhost:5173/callback`. Prod: `https://your-domain.com/callback`. Must be registered in WorkOS. |
| `WORKOS_COOKIE_PASSWORD` | Yes | Random secret for session cookie encryption. Minimum 32 characters — generate with `openssl rand -hex 32`. |
| `BOOTSTRAP_ADMIN_EMAIL` | No | Email auto-provisioned as Admin on first sign-in, when no other users exist. |

### Error Tracking (Sentry)

All Sentry variables are optional. Sentry is disabled when `APP_ENV=development`.

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Your Sentry project DSN. Found at Sentry → Project → Settings → Client Keys. |
| `SENTRY_ORG` | Organisation slug. Required for source map upload at build time. |
| `SENTRY_PROJECT` | Project slug. |
| `SENTRY_AUTH_TOKEN` | Auth token with `project:releases` and `org:read` scopes. Set as a GitHub secret for CI builds — not a Fly secret. |

**Sentry behaviour by environment:**

| `APP_ENV` | Behaviour |
|---|---|
| `development` | Disabled — no noise during local development |
| `test` | Enabled, tagged as `test` — errors don't pollute production dashboards |
| `production` | Fully enabled, source maps uploaded at build time for readable stack traces |

---

## Production Deployment (Fly.io)

[Fly.io](https://fly.io) is the recommended hosting platform — the free tier is sufficient for a teaching app. Turso handles the database; only the Node.js server needs hosting.

<details>
<summary>Step-by-step first-time deploy</summary>

### Prerequisites

- A [Fly.io](https://fly.io) account (free)
- Fly CLI installed:
  ```bash
  brew install flyctl          # macOS
  curl -L https://fly.io/install.sh | sh   # Linux / WSL
  ```
- A [Turso](https://turso.tech) database (free tier available)

### Step 1 — Sign in

```bash
fly auth login
```

### Step 2 — Create the app

```bash
fly apps create risk-manager
```

The `fly.toml` in this repo defaults to the `syd` (Sydney) region — update `primary_region` if needed.

### Step 3 — Set production secrets

```bash
fly secrets set \
  APP_ENV=production \
  VITE_APP_ENV=production \
  TURSO_DATABASE_URL=libsql://your-db.turso.io \
  TURSO_AUTH_TOKEN=your_turso_token \
  WORKOS_CLIENT_ID=your_workos_client_id \
  WORKOS_API_KEY=your_workos_api_key \
  WORKOS_REDIRECT_URI=https://risk-manager.fly.dev/callback \
  WORKOS_COOKIE_PASSWORD=your-32-char-secret \
  BOOTSTRAP_ADMIN_EMAIL=you@example.com \
  SENTRY_DSN=https://your-dsn@sentry.io/project \
  SENTRY_ORG=your-org \
  SENTRY_PROJECT=risk-manager
```

> `SENTRY_AUTH_TOKEN` is only needed at build time. Set it as a GitHub secret, not a Fly secret.

### Step 4 — Register the WorkOS redirect URI

In the [WorkOS dashboard](https://dashboard.workos.com), add:

```
https://risk-manager.fly.dev/callback
```

### Step 5 — Deploy

```bash
fly deploy
```

The first deploy takes 2–4 minutes. Fly creates 2 machines by default — scale back to 1 for a teaching app:

```bash
fly scale count 1 --yes
```

### Step 6 — Run migrations

```bash
fly ssh console --app risk-manager --command "node --experimental-strip-types app/server/migrate.ts"
```

### Step 7 — Open the app

```bash
fly open
```

Sign in with `BOOTSTRAP_ADMIN_EMAIL` to complete first-time setup.

</details>

After the initial setup, all future deploys happen automatically — merging a PR to `main` triggers the release workflow and Fly.io's GitHub integration deploys to production in parallel.

---

## Custom Domain & SSL

Fly.io handles TLS termination at its edge. Let's Encrypt certificates are provisioned and renewed automatically — you never manage cert files. The `force_https = true` setting in `fly.toml` redirects all HTTP traffic to HTTPS before it reaches your app.

The default `.fly.dev` subdomain works immediately with no DNS configuration. To add a custom domain:

<details>
<summary>Custom domain setup</summary>

### Step 1 — Register with Fly

```bash
fly certs add yourdomain.com
```

Fly outputs the DNS records to add. Use whichever record type your provider supports:

| Type | When to use | Value |
|---|---|---|
| `CNAME` | Subdomains (e.g. `app.yourdomain.com`) | `risk-manager.fly.dev` |
| `ALIAS` / `ANAME` | Apex domains (`yourdomain.com`) | `risk-manager.fly.dev` |

If your provider doesn't support `ALIAS`/`ANAME`, use the A/AAAA records Fly provides instead.

### Step 2 — Add the DNS records

Add the records at your DNS provider (Cloudflare, Route 53, Namecheap, etc.). Propagation typically takes a few minutes to an hour.

### Step 3 — Verify

```bash
fly certs show yourdomain.com
```

Once DNS propagates, Fly provisions the certificate automatically. Status changes from `Awaiting configuration` to `Certificate issued`.

### Step 4 — Update WorkOS and Fly secrets

In the [WorkOS dashboard](https://dashboard.workos.com), add:

```
https://yourdomain.com/callback
```

Then update the Fly secret:

```bash
fly secrets set WORKOS_REDIRECT_URI=https://yourdomain.com/callback
```

</details>

---

## GitHub Actions & CI/CD

### CI — runs on every pull request

**File:** `.github/workflows/ci.yml`

Three jobs run in parallel against every PR targeting `main`. All must pass before merge.

| Job | What it checks |
|---|---|
| `typecheck` | TypeScript strict mode — zero errors |
| `lint` | ESLint strict — zero warnings or errors |
| `build` | Production build — must compile without errors |

### Release — runs on every merge to `main`

**File:** `.github/workflows/release.yml`

On every push to `main` the workflow:

1. Computes the next patch version from the last git tag
2. Creates and pushes the git tag
3. Creates a GitHub Release with an auto-generated changelog
4. Attaches a Software Bill of Materials (`sbom-vX.Y.Z.spdx.json`) to the release

Deployment runs in parallel via Fly.io's GitHub integration. A `workflow_dispatch` trigger is available for admins who need to manually cut a `minor` or `major` release instead of the default `patch`.

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start dev server with HMR at http://localhost:5173 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | Generate route types + TypeScript check |
| `pnpm lint` | ESLint (strict, no Prettier) |
| `pnpm db:generate` | Generate SQL migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio at http://localhost:4983 |
| `pnpm storybook` | Launch Storybook at http://localhost:6006 |

---

## Roles

Roles are stored as a **bitwise integer flag** so a single user can hold multiple roles simultaneously.

| Role | Value | Access |
|---|---|---|
| Student | `1` | View and edit risk assessments for their active team only |
| Supervisor | `2` | Manage team members, leave feedback, view team audit trail |
| Admin | `4` | Full access — manage users, teams, semesters, view all audits |

Common combinations: `Student + Supervisor = 3` · `Supervisor + Admin = 6`

---

## License

[MIT](LICENSE)
