# Risk Manager

[![MIT License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)
[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

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

## Table of Contents

1. [Development Setup](#development-setup)
2. [Configuration Reference](#configuration-reference)
3. [Production Deployment (Fly.io)](#production-deployment-flyio)
4. [Custom Domain & SSL](#custom-domain--ssl)
5. [GitHub Secrets Setup](#github-secrets-setup)
6. [GitHub Actions & CI/CD](#github-actions--cicd)
7. [Creating Releases](#creating-releases)
8. [Repository Security](#repository-security)
9. [Scripts](#scripts)
10. [Roles](#roles)
11. [Bootstrapping the First Admin](#bootstrapping-the-first-admin)
12. [Sentry Environment Separation](#sentry-environment-separation)

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20
- [pnpm](https://pnpm.io) ≥ 9 — install with `npm install -g pnpm`
- A [WorkOS](https://workos.com) account with an AuthKit application configured
- A [Turso](https://turso.tech) database **or** use local SQLite (no account needed for local dev)

### 1. Clone and install

```bash
git clone https://github.com/OWNER/REPO.git
cd risk-manager
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.development .env
```

Open `.env` and fill in your credentials. The minimum required for local development:

```env
APP_ENV=development

# Use local SQLite — no Turso account needed for dev
TURSO_DATABASE_URL=file:./data/db.sqlite

# WorkOS AuthKit — create a free account at workos.com
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_REDIRECT_URI=http://localhost:5173/callback
WORKOS_COOKIE_PASSWORD=replace-with-a-random-32-character-secret

# Your email — auto-provisioned as Admin on first sign-in
BOOTSTRAP_ADMIN_EMAIL=you@example.com
```

> Sentry variables are optional in development — Sentry is disabled when `APP_ENV=development`.

### 3. Set up WorkOS

In your [WorkOS dashboard](https://dashboard.workos.com):

1. Create a new application (or use an existing one)
2. Enable **AuthKit** for the application
3. Add `http://localhost:5173/callback` to the list of **Redirect URIs**
4. Copy the **Client ID** and **API Key** into your `.env`

### 4. Run database migrations

```bash
pnpm db:migrate
```

This creates the SQLite database at `./data/db.sqlite` and seeds the internal `system` user.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with your `BOOTSTRAP_ADMIN_EMAIL` — your Admin account is created automatically on first sign-in.

### Useful dev tools

```bash
pnpm db:studio    # Browse the database visually at http://localhost:4983
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
| `TURSO_DATABASE_URL` | Yes | `file:./data/db.sqlite` | Connection URL. Use `file:./data/db.sqlite` for local dev, or a `libsql://` URL for Turso cloud. |
| `TURSO_AUTH_TOKEN` | No | — | Required when connecting to a remote Turso database. Not needed for local SQLite. |

### Authentication (WorkOS)

| Variable | Required | Description |
|---|---|---|
| `WORKOS_CLIENT_ID` | Yes | Your WorkOS application's Client ID. Found in the WorkOS dashboard. |
| `WORKOS_API_KEY` | Yes | Your WorkOS API secret key. Never expose this to the browser. |
| `WORKOS_REDIRECT_URI` | Yes | The OAuth callback URL. Must be registered in WorkOS. Dev: `http://localhost:5173/callback`. Prod: `https://your-domain.com/callback`. |
| `WORKOS_COOKIE_PASSWORD` | Yes | A random secret used to encrypt the session cookie. Must be at least 32 characters. Generate with: `openssl rand -hex 32` |
| `BOOTSTRAP_ADMIN_EMAIL` | No | The email address that will be auto-provisioned as Admin on first sign-in. Only works if no other users exist yet. Safe to remove from env after initial setup. |

### Error Tracking (Sentry)

All Sentry variables are optional. Sentry is disabled when `APP_ENV=development`.

| Variable | Required | Description |
|---|---|---|
| `SENTRY_DSN` | No | Your Sentry project's DSN. Copy from Sentry → Project → Settings → Client Keys. |
| `SENTRY_ORG` | No | Your Sentry organisation slug. Required for source map upload at build time. |
| `SENTRY_PROJECT` | No | Your Sentry project slug. |
| `SENTRY_AUTH_TOKEN` | No | A Sentry auth token with `project:releases` and `org:read` scopes. Required for source map upload. |

---

## Production Deployment (Fly.io)

[Fly.io](https://fly.io) is the recommended hosting platform. The free tier includes enough resources for a teaching app (3 shared VMs). Turso handles the database — only the Node.js server needs hosting.

### Prerequisites

- A [Fly.io](https://fly.io) account (free)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed:
  ```bash
  # macOS
  brew install flyctl

  # Linux / WSL
  curl -L https://fly.io/install.sh | sh
  ```
- A [Turso](https://turso.tech) database (free tier available)

### Step 1: Sign in to Fly

```bash
fly auth login
```

### Step 2: Create the Fly app

```bash
fly apps create risk-manager
```

Choose the region closest to your users. The `fly.toml` file in this repo defaults to `syd` (Sydney) — update `primary_region` if needed.

### Step 3: Set production secrets

Fly stores secrets as encrypted environment variables. Set them all at once:

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

> The `SENTRY_AUTH_TOKEN` is only needed at **build time** (for source map upload). It is set as a GitHub secret, not a Fly secret.

### Step 4: Update WorkOS redirect URI

In your [WorkOS dashboard](https://dashboard.workos.com), add your production callback URL to the allowed Redirect URIs:

```
https://risk-manager.fly.dev/callback
```

### Step 5: Deploy

```bash
fly deploy
```

Fly builds the Docker image, pushes it, and starts a VM. This takes 2–4 minutes on first deploy.

### Step 6: Run database migrations

```bash
fly ssh console --app risk-manager --command "node --experimental-strip-types app/server/migrate.ts"
```

### Step 7: Open the app

```bash
fly open
```

Sign in with your `BOOTSTRAP_ADMIN_EMAIL` to complete first-time setup.

### Subsequent deploys

After the initial setup, all future deploys are triggered by creating a release via GitHub Actions. See [Creating Releases](#creating-releases) below.

---

## Custom Domain & SSL

Fly.io handles all TLS termination at its edge — your app only ever sees plain HTTP on port 3000 internally. Let's Encrypt certificates are provisioned and renewed automatically; you never manage cert files.

The `force_https = true` setting in `fly.toml` means any HTTP (port 80) request is permanently redirected to HTTPS (port 443) before it reaches your app.

### Using the default `.fly.dev` subdomain

No DNS configuration needed. Your app is reachable at `https://risk-manager.fly.dev` immediately after deployment, with a valid cert.

### Adding a custom domain

#### Step 1: Register the domain with Fly

```bash
fly certs add yourdomain.com
```

Fly will output the DNS records you need to add. There are two options depending on your DNS provider:

**Option A — CNAME (recommended for subdomains like `app.yourdomain.com`):**
```
app.yourdomain.com  CNAME  risk-manager.fly.dev
```

**Option B — ALIAS / ANAME (for apex domains like `yourdomain.com`):**
Some DNS providers support `ALIAS` or `ANAME` records for apex domains. If yours does not, use the A/AAAA records Fly provides instead.

#### Step 2: Add the DNS records

Add the records at your DNS provider (e.g. Cloudflare, Route 53, Namecheap). DNS propagation typically takes a few minutes to an hour.

#### Step 3: Verify

```bash
fly certs show yourdomain.com
```

Once DNS has propagated, Fly automatically provisions the Let's Encrypt certificate. The status will change from `Awaiting configuration` to `Certificate issued`.

#### Step 4: Update WorkOS redirect URI

Add your custom domain callback URL in the [WorkOS dashboard](https://dashboard.workos.com):

```
https://yourdomain.com/callback
```

Also update `WORKOS_REDIRECT_URI` in your Fly secrets:

```bash
fly secrets set WORKOS_REDIRECT_URI=https://yourdomain.com/callback
```

### Automation

The `fly certs add` command is idempotent — it is safe to include in your deploy workflow and Fly will ignore it if the certificate already exists. The deploy workflow in this repo includes this step automatically.

---

## GitHub Secrets Setup

All production credentials are stored as GitHub repository secrets. The release workflow syncs them to Fly.io automatically — you never need to run `fly secrets set` manually after initial setup.

### Adding secrets

Go to **GitHub → Repository → Settings → Secrets and variables → Actions → Secrets tab**, then add each of the following:

| Secret | Where it's used | Description |
|---|---|---|
| `FLY_API_TOKEN` | Deploy to Fly | Generate at [fly.io/user/personal_access_tokens](https://fly.io/user/personal_access_tokens) |
| `TURSO_DATABASE_URL` | Fly runtime | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Fly runtime | Turso database auth token |
| `WORKOS_CLIENT_ID` | Fly runtime | WorkOS application client ID |
| `WORKOS_API_KEY` | Fly runtime | WorkOS API secret key |
| `WORKOS_REDIRECT_URI` | Fly runtime | Production callback URL — `https://risk-manager.fly.dev/callback` |
| `WORKOS_COOKIE_PASSWORD` | Fly runtime | 32+ character cookie encryption secret |
| `BOOTSTRAP_ADMIN_EMAIL` | Fly runtime | First admin email (can be removed after first login) |
| `SENTRY_DSN` | Fly runtime | Sentry project DSN |
| `SENTRY_ORG` | Fly runtime + build | Sentry organisation slug |
| `SENTRY_PROJECT` | Fly runtime + build | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Build only | Source map upload token — **not** sent to Fly |

> **`SENTRY_AUTH_TOKEN`** is only used at build time to upload source maps to Sentry. It is intentionally not synced to Fly's runtime environment.

### Optional: custom domain variable

If you have a custom domain, add one **variable** (not a secret) in the **Variables tab**:

| Variable | Description |
|---|---|
| `FLY_CUSTOM_DOMAIN` | e.g. `riskmanager.youruniversity.edu` — triggers automatic cert provisioning on each release |

---

## GitHub Actions & CI/CD

Two workflows handle the full lifecycle:

### CI — runs on every Pull Request

**File:** `.github/workflows/ci.yml`

Runs three parallel jobs against every PR targeting `main`. All three must pass before a PR can be merged.

| Job | What it checks |
|---|---|
| `typecheck` | TypeScript strict mode — zero errors required |
| `lint` | ESLint strict — zero warnings or errors required |
| `build` | Production build — must compile without errors |

Merging to `main` does **not** trigger a deployment. Production is only updated via a tagged release.

### Release — triggered manually by admins

**File:** `.github/workflows/release.yml`

Only users with **write access** (admins/owners) can trigger this workflow. It:

1. Computes the next semantic version from the last git tag
2. Creates and pushes the git tag
3. Creates a GitHub Release with auto-generated changelog
4. Syncs all GitHub Secrets to Fly.io as runtime environment variables
5. Deploys the Docker image to Fly.io with the version label
6. Runs database migrations on the live instance
7. Generates a Software Bill of Materials (SBOM) and attaches it to the release

See [Creating Releases](#creating-releases) for how to trigger this workflow.

---

## Creating Releases

Releases follow [semantic versioning](https://semver.org) starting from `v0.1.0`. The version is computed and tagged automatically — you only choose the bump type.

**Who can release:** Only repository admins and owners. Tag protection rules prevent non-admins from creating `v*` tags, and `workflow_dispatch` requires write access.

### Steps

1. Merge all PRs for the release into `main`
2. Go to **GitHub → Repository → Actions → Release**
3. Click **"Run workflow"** (top right)
4. Select the bump type:
   - **`patch`** — bug fixes and minor changes (e.g. `v0.1.0` → `v0.1.1`)
   - **`minor`** — new features, backwards-compatible (e.g. `v0.1.1` → `v0.2.0`)
   - **`major`** — breaking changes (e.g. `v0.2.0` → `v1.0.0`)
5. Click **"Run workflow"**

The workflow runs automatically (~5 minutes) and:
- Creates the git tag and GitHub Release with a generated changelog
  - PR-based changes are grouped by label (features, bug fixes, etc.)
  - Direct commits to `main` not associated with a PR are appended in a separate **Direct Commits** section
- Deploys to Fly.io
- Attaches `sbom-vX.Y.Z.spdx.json` to the release assets

### Labelling PRs for the changelog

PRs are grouped in the release changelog by their GitHub labels:

| Label | Changelog section |
|---|---|
| `enhancement`, `feature` | New Features |
| `bug`, `fix` | Bug Fixes |
| `security` | Security |
| `dependencies` | Dependencies |
| `chore`, `refactor`, `docs` | Maintenance |
| `ignore-for-release` | Excluded from changelog |

---

## Repository Security

This is a **public repository** — anyone can read and fork the code. All write operations are restricted to authorised collaborators.

### What's enforced automatically

| Protection | Mechanism |
|---|---|
| No direct pushes to `main` | Branch protection — all changes require a reviewed PR |
| CI must pass before merge | Branch protection — `typecheck`, `lint`, `build` required |
| All PRs require owner review | `.github/CODEOWNERS` — `@OWNER` must approve every PR |
| Only admins can create releases | Tag protection ruleset on `v*` + `workflow_dispatch` requires write access |
| Secrets never in code | All credentials stored as GitHub Secrets, synced to Fly at release time |

### One-time setup (run after creating the repo)

Full instructions with CLI commands are in [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md). Summary:

**1. Branch protection on `main`:**
```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --field 'required_status_checks={"strict":true,"contexts":["typecheck","lint","build"]}' \
  --field 'enforce_admins=false' \
  --field 'required_pull_request_reviews={"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field 'restrictions=null' \
  --field 'allow_force_pushes=false' \
  --field 'allow_deletions=false'
```

**2. Tag protection ruleset (restrict `v*` to admins):**
```bash
gh api repos/OWNER/REPO/rulesets \
  --method POST \
  --header "Accept: application/vnd.github+json" \
  --field name="Release tags" \
  --field target="tag" \
  --field enforcement="active" \
  --field conditions='{"ref_name":{"include":["refs/tags/v*"],"exclude":[]}}' \
  --field rules='[{"type":"creation"},{"type":"deletion"}]' \
  --field bypass_actors='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}]'
```

**3. Update `CODEOWNERS`:** Edit `.github/CODEOWNERS` and replace `@OWNER` with your GitHub username.

**4. Allow owner force push (UI only):** Settings → Branches → Edit `main` → "Allow force pushes" → "Specify who can force push" → add your username.

### Additional hardening

Go to **GitHub → Repository → Settings** and review:

| Setting | Location | Recommended value |
|---|---|---|
| Fork PR workflow approval | Actions → General | "Require approval for first-time contributors" |
| Wikis | General → Features | Disable if unused |
| Discussions | General → Features | Enable or disable as needed |
| Signed commits | Branch rule or Ruleset | Enable "Require signed commits" on `main` |

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

Set `BOOTSTRAP_ADMIN_EMAIL` in your `.env` file. When that email signs in for the first time via WorkOS and no other user accounts exist in the database, an Admin account is created automatically.

After the first Admin account exists, all subsequent accounts must be created by an Admin through the **Users** management page. The `BOOTSTRAP_ADMIN_EMAIL` variable can be removed from the environment after initial setup.

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
