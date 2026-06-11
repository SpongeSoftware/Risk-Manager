# Branch Protection Setup

This document describes the required branch protection rules for `main` and how to apply them.

## Rules

| Rule | Setting |
|---|---|
| Require pull request before merging | Yes — 1 approval required |
| Dismiss stale reviews on new commits | Yes |
| Require status checks to pass | `typecheck`, `lint`, `build` |
| Require branch to be up to date | Yes |
| Restrict force pushes | Repo owner only (set in UI) |
| Restrict deletions | Yes |
| Allow bypass | No |

## Apply via GitHub CLI

Run once after creating the repository (replace `OWNER/REPO`):

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

## Restrict Force Pushes to Repo Owner

The above API call disables force pushes for everyone. To allow only the repo owner to force push:

1. Go to **GitHub → Repository → Settings → Branches**
2. Click **Edit** on the `main` protection rule
3. Under **"Allow force pushes"**, select **"Specify who can force push"**
4. Add the repo owner's GitHub username
5. Save changes
