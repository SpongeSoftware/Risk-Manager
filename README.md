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
5. [GitHub Actions & CI/CD](#github-actions--cicd)
6. [Branch Protection Setup](#branch-protection-setup)
7. [Creating Releases](#creating-releases)
8. [Scripts](#scripts)
9. [Roles](#roles)
10. [Bootstrapping the First Admin](#bootstrapping-the-first-admin)
11. [Sentry Environment Separation](#sentry-environment-separation)

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

After the initial setup, deploys happen **automatically** via GitHub Actions whenever you merge a PR to `main`. See [GitHub Actions & CI/CD](#github-actions--cicd) below.

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

## GitHub Actions & CI/CD

Three workflows automate the full lifecycle:

### CI — runs on every Pull Request

**File:** `.github/workflows/ci.yml`

Runs three parallel jobs against every PR targeting `main`:

| Job | What it checks |
|---|---|
| `typecheck` | TypeScript strict mode — zero errors required |
| `lint` | ESLint strict — zero warnings or errors required |
| `build` | Production build — must compile without errors |

All three must pass before a PR can be merged.

### Deploy — runs on merge to `main`

**File:** `.github/workflows/deploy.yml`

Automatically deploys to Fly.io after every merge to `main`. Runs CI checks first, then:
1. Builds and deploys the Docker image to Fly
2. Runs database migrations on the live instance

### Release — runs when you publish a GitHub Release

**File:** `.github/workflows/release.yml`

When you publish a release (see [Creating Releases](#creating-releases)):
1. Deploys the release build to Fly with the version tag as the image label
2. Runs database migrations
3. Generates a Software Bill of Materials (SBOM) and attaches `sbom-v1.x.x.spdx.json` to the release assets

### Required GitHub Secrets

Add these in **GitHub → Repository → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `FLY_API_TOKEN` | Generate at [fly.io/user/personal_access_tokens](https://fly.io/user/personal_access_tokens) |
| `SENTRY_AUTH_TOKEN` | Sentry token for source map upload — needs `project:releases` and `org:read` scopes |

And optionally, one **Actions variable** (not a secret — it's not sensitive):

| Variable | Description |
|---|---|
| `FLY_CUSTOM_DOMAIN` | Your custom domain (e.g. `riskmanager.youruniversity.edu`). If set, the deploy workflow runs `fly certs add` on every deploy to ensure the cert exists. Leave unset to use the default `.fly.dev` subdomain. |

Set variables in **GitHub → Repository → Settings → Secrets and variables → Actions → Variables tab**.

> All other production env vars (`WORKOS_*`, `TURSO_*`, etc.) are set directly as Fly secrets in Step 3 above — they don't need to be duplicated as GitHub secrets.

---

## Branch Protection Setup

The `main` branch should be protected so that all changes go through a reviewed PR. These rules need to be applied once after creating the repository.

**Protection rules:**
- All PRs require at least 1 approval
- Stale reviews are dismissed when new commits are pushed
- All three CI checks (`typecheck`, `lint`, `build`) must pass
- Branch must be up to date with `main` before merging
- Direct pushes to `main` are blocked (except repo owner)
- Force pushes are restricted to the repo owner only

### Apply via GitHub CLI

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

Replace `OWNER/REPO` with your GitHub repository path (e.g. `myname/risk-manager`).

### Allow repo owner to force push

The above command disables force pushes for everyone. To allow the repo owner to force push when necessary:

1. Go to **GitHub → Repository → Settings → Branches**
2. Click **Edit** on the `main` protection rule
3. Under **"Allow force pushes"**, select **"Specify who can force push"**
4. Add the repo owner's GitHub username
5. Save

---

## Creating Releases

Releases are managed through **GitHub Releases** with auto-generated changelogs.

### How to create a release

1. Go to **GitHub → Repository → Releases → Draft a new release**
2. Click **"Choose a tag"** and type a new version (e.g. `v1.2.0`) — GitHub will create the tag on publish
3. Click **"Generate release notes"** — GitHub automatically creates a changelog from merged PR titles since the last release, grouped by label (features, bug fixes, etc.)
4. Edit the notes if needed, then click **"Publish release"**

The release workflow triggers automatically and:
- Deploys the tagged version to Fly.io
- Attaches `sbom-v1.2.0.spdx.json` (a Software Bill of Materials) to the release assets

### Labelling PRs for the changelog

Apply labels to your PRs to control which changelog section they appear in:

| Label | Changelog section |
|---|---|
| `enhancement`, `feature` | New Features |
| `bug`, `fix` | Bug Fixes |
| `security` | Security |
| `dependencies` | Dependencies |
| `chore`, `refactor`, `docs` | Maintenance |
| `ignore-for-release` | Excluded from changelog |

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
