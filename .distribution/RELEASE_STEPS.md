# Release Steps — v1.0.0

Run these in order. Each step unlocks the next.

---

## Step 1 — npm publish

```bash
npm login          # one-time, opens browser
npm publish
```

Then get the sha256 for Homebrew:
```bash
curl -sL https://registry.npmjs.org/brainlink/-/brainlink-1.0.0.tgz | shasum -a 256
```

Fill it into `.distribution/homebrew/brainlink.rb` → replace `FILL_IN_AFTER_NPM_PUBLISH`.

---

## Step 2 — GitHub Release (triggers binary builds)

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions (`release.yml`) will automatically:
- Run tests
- Build binaries for macOS arm64, macOS x64, Linux x64, Windows x64
- Create the GitHub Release and attach all 4 binaries

Wait for Actions to complete (~5 min), then get sha256s for each binary:
```bash
curl -sL https://github.com/404-not-found/brainlink/releases/download/v1.0.0/brainlink-win-x64.exe | shasum -a 256
curl -sL https://github.com/404-not-found/brainlink/releases/download/v1.0.0/brainlink-linux-x64 | shasum -a 256
```

Fill them into:
- `.distribution/scoop/brainlink.json` → replace `FILL_IN_AFTER_GITHUB_RELEASE`
- `.distribution/winget/404-not-found.Brainlink.installer.yaml` → replace `FILL_IN_AFTER_GITHUB_RELEASE`

---

## Step 3 — Homebrew tap

Create a new GitHub repo: `homebrew-brainlink` (under 404-not-found)

```bash
# In the new repo:
mkdir Formula
cp .distribution/homebrew/brainlink.rb Formula/brainlink.rb
git add . && git commit -m "Add brainlink formula v1.0.0"
git push
```

Users install with:
```bash
brew tap 404-not-found/brainlink
brew install brainlink
```

---

## Step 4 — Scoop bucket

Create a new GitHub repo: `scoop-brainlink` (under 404-not-found)

```bash
# In the new repo (root, no subfolder needed):
cp .distribution/scoop/brainlink.json brainlink.json
git add . && git commit -m "Add brainlink v1.0.0"
git push
```

Users install with:
```bash
scoop bucket add brainlink https://github.com/404-not-found/scoop-brainlink
scoop install brainlink
```

To get into the main Scoop extras bucket (so users can just `scoop install brainlink`):
Submit PR to https://github.com/ScoopInstaller/Extras with `brainlink.json` in `bucket/`.

---

## Step 5 — winget

Fork https://github.com/microsoft/winget-pkgs
Copy the 3 files from `.distribution/winget/` to:
`manifests/4/404-not-found/Brainlink/1.0.0/`

Submit a PR. Review typically takes 1–3 days.
Once merged, users can: `winget install brainlink`

---

## Step 6 — Make repo public

Go to GitHub → Settings → Change visibility → Public

---

## Step 7 — curl script hosting

The script at `scripts/install.sh` needs to be served at `get.brainlink.dev`.
Options:
- GitHub Pages (free, point DNS to GitHub)
- Cloudflare Workers (redirect `get.brainlink.dev` → raw GitHub file)

Quickest: use raw GitHub URL until DNS is ready:
```bash
curl -sL https://raw.githubusercontent.com/404-not-found/brainlink/main/scripts/install.sh | sh
```
Update README temporarily if needed.
