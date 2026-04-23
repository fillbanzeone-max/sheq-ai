# P1-1: CI/CD workflows — pending PAT upgrade

These four files **must** live under `.github/` to activate, but the
local PAT/credential pushing this repo does not have the `workflow`
scope. GitHub blocks the push with:

> refusing to allow a Personal Access Token to create or update workflow
> `.github/workflows/ci.yml` without `workflow` scope

## Two ways to land them

### Option A — upgrade the PAT (one-time, ~3 min)

1. Open https://github.com/settings/tokens
2. Either edit the existing PAT or create a new one with these scopes:
   - `repo` (full control of private repos)
   - `workflow` ← the one currently missing
3. Update your local credential helper:
   - **Windows:** Control Panel → Credential Manager → "Generic Credentials" → find the GitHub entry → Edit → paste new token
   - or run `git credential-manager erase` and the next push will re-prompt
4. Then:
   ```bash
   cp docs/p1-pending-workflows/ci.yml          .github/workflows/ci.yml
   cp docs/p1-pending-workflows/security.yml    .github/workflows/security.yml
   cp docs/p1-pending-workflows/zap-baseline.yml .github/workflows/zap-baseline.yml
   mkdir -p .github/zap && cp docs/p1-pending-workflows/zap-rules.tsv .github/zap/rules.tsv
   git add .github
   git commit -m "ci(p1-1): activate workflows after PAT upgrade"
   git push
   ```

### Option B — upload via GitHub web UI

1. Go to https://github.com/fillbanzeone-max/sheq-ai
2. Navigate to `.github/workflows/` (create the folder if missing — type
   `.github/workflows/ci.yml` in the new file name field, the slashes
   create folders)
3. Paste the contents of each file from `docs/p1-pending-workflows/` here
4. Commit each file directly to `main` via the web editor — **the GitHub
   web UI uses your account credentials, not the PAT**, so it works

## What these workflows do

- **ci.yml** — runs on every push + PR to main:
  - Validates `database.rules.json` and `firebase.json` are parseable JSON
  - Confirms `SHEQ-AI.html` and `index.html` are byte-identical
  - File size guard (warn at 1.5 MB, fail at 2 MB)
  - CSP meta tag presence check
  - SRI hash presence on all 4 CDN scripts
  - Service worker `CACHE_NAME` format check
  - `npm audit --audit-level=high` on `functions/`

- **security.yml** — runs on every push + PR:
  - Gitleaks secret scan across full git history
  - GitHub dependency-review on PRs (high+ blocks merge)
  - Firebase rules sanity: auth required, role mutation admin-gated

- **zap-baseline.yml** — runs Sundays 02:00 UTC + on demand:
  - OWASP ZAP baseline scan against the live URL
  - Findings posted as a tracked GitHub issue
  - Suppression rules for unfixable items in `zap-rules.tsv`

Once these are on `main`, branch protection should be updated to
require `validate`, `audit-functions`, `secret-scan`, and
`rules-check` as required status checks for PR merges.
