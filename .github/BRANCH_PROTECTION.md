# Repository Security Setup

This document covers all one-time configuration steps to lock down the repository. Apply these after creating the repo on GitHub. Replace `SpongeSoftware/Risk-Manager` with your repository path throughout.

---

## 1. Branch Protection — `main`

Prevents direct pushes to `main` and enforces PR + CI review.

### Apply via GitHub CLI

```bash
gh api repos/SpongeSoftware/Risk-Manager/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --field 'required_status_checks={"strict":true,"contexts":["typecheck","lint","build"]}' \
  --field 'enforce_admins=false' \
  --field 'required_pull_request_reviews={"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field 'restrictions=null' \
  --field 'allow_force_pushes=false' \
  --field 'allow_deletions=false'
```

### Rules applied

| Rule | Setting |
|---|---|
| Require pull request before merging | Yes — 1 approval required |
| Dismiss stale reviews on new commits | Yes |
| Require status checks to pass | `typecheck`, `lint`, `build` |
| Require branch to be up to date | Yes |
| Restrict force pushes | Disabled for everyone (see below for owner exception) |
| Restrict branch deletion | Yes |

### Allow repo owner to force push (UI only)

The API call above disables force pushes for everyone. To allow the owner to force push when needed:

1. Go to **GitHub → Repository → Settings → Branches**
2. Click **Edit** on the `main` rule
3. Under **"Allow force pushes"**, select **"Specify who can force push"**
4. Add the repo owner's GitHub username
5. Save

---

## 2. Tag Protection — `v*` (release tags)

Prevents anyone without admin access from creating or deleting release tags, ensuring only authorised personnel can trigger deployments.

### Apply via GitHub CLI

```bash
gh api repos/SpongeSoftware/Risk-Manager/rulesets \
  --method POST \
  --header "Accept: application/vnd.github+json" \
  --field name="Release tags" \
  --field target="tag" \
  --field enforcement="active" \
  --field conditions='{"ref_name":{"include":["refs/tags/v*"],"exclude":[]}}' \
  --field rules='[{"type":"creation"},{"type":"deletion"}]' \
  --field bypass_actors='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}]'
```

`actor_id: 5` corresponds to the **Repository Admin** role. Admins and the repo owner can still create/delete `v*` tags; all other users are blocked.

### Apply via GitHub UI

1. Go to **GitHub → Repository → Settings → Rules → Rulesets**
2. Click **New ruleset → New tag ruleset**
3. Name: `Release tags`
4. Enforcement status: **Active**
5. Target: **Include by pattern** → `v*`
6. Rules: check **Restrict creations** and **Restrict deletions**
7. Bypass list: add **Repository admin** role
8. Save

---

## 3. Public Repository Hardening

For a public repository where anyone can read code but writes are fully controlled:

### Actions settings

Go to **GitHub → Repository → Settings → Actions → General**:

| Setting | Value |
|---|---|
| Actions permissions | Allow all actions |
| Fork pull request workflows | **"Require approval for first-time contributors who are new to GitHub"** — prevents unknown accounts from running Actions on your runners |
| Workflow permissions | **Read repository contents and packages** (default) |

### General settings

Go to **GitHub → Repository → Settings → General**:

| Feature | Recommendation |
|---|---|
| Wikis | Disable unless actively used |
| Projects | Keep if using GitHub Projects |
| Discussions | Enable if you want a community forum; disable otherwise |
| Sponsorships | Disable |

### Collaborator access

Go to **GitHub → Repository → Settings → Collaborators and teams**:

- Add team members individually with the appropriate role (**Write** for contributors, **Admin** for release managers)
- Only **Admins** can trigger the release workflow (`workflow_dispatch`) and create `v*` tags

### CODEOWNERS

`.github/CODEOWNERS` in this repo is set to require the repo owner to review every PR:

```
* @ElCapitanSponge
```

Update `@ElCapitanSponge` to your GitHub username. This means no PR can be merged without the owner's approval, regardless of other reviewer approvals.

---

## 4. Secrets — Never Commit These

All production credentials are stored as **GitHub repository secrets** (Settings → Secrets and variables → Actions). They are never committed to the repository.

The release workflow syncs them to Fly.io automatically on every deployment — no manual `fly secrets set` is needed after initial setup.

See the [README — GitHub Secrets Setup](../README.md#github-secrets-setup) section for the full list.

---

## 5. Recommended: Require Signed Commits

Signed commits provide cryptographic proof that commits came from a verified author. To require signed commits on `main`:

1. Go to **GitHub → Repository → Settings → Branches → Edit `main` rule**
2. Enable **"Require signed commits"**
3. Save

Contributors will need to [configure GPG or SSH commit signing](https://docs.github.com/en/authentication/managing-commit-signature-verification) locally.
