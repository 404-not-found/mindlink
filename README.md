# ◉ Brainlink

**Give your AI a permanent memory.**

Every new session wakes up fully informed — no re-explaining, no lost context.
Two sessions in the same project stay in sync — no isolated agents, no duplicate work.

[![npm version](https://img.shields.io/npm/v/brainlink)](https://www.npmjs.com/package/brainlink)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](#installation)

---

> ### ◉ Latest — v1.0.0
> **Permanent session memory · Shared context across sessions · 8 AI agents supported**
> [→ Full release notes](https://github.com/404-not-found/brainlink/releases/tag/v1.0.0)

---

## Installation

**npm**
```bash
npm install -g brainlink
```

**Homebrew (macOS / Linux)**
```bash
brew install brainlink
```

**curl (macOS / Linux)**
```bash
curl -sL https://get.brainlink.dev | sh
```

**Windows (winget)**
```bash
winget install brainlink
```

**Windows (Scoop)**
```bash
scoop install brainlink
```

No Node.js? Download a standalone binary from [GitHub Releases](https://github.com/404-not-found/brainlink/releases).

---

## Quick Start

```bash
cd my-project
brainlink init
```

**Run `brainlink init` before starting your AI session** — it creates the files your agent reads on startup. The current session won't see it; the next one will. After that, every new session wakes up fully informed automatically. Nothing else to do.

---

## Commands

| Command | What it does |
|---|---|
| [`brainlink init`](commands/init.md) | Create `.brain/` in your project and generate agent instruction files. **Run this once per project before your first AI session.** |
| [`brainlink status`](commands/status.md) | Show what was completed last session, what's in progress, blockers, and what's next. |
| [`brainlink log`](commands/log.md) | Print the full session history. Supports `--limit`, `--since`, `--all`, `--json`. |
| [`brainlink sync`](commands/sync.md) | Keep concurrent sessions in sync. Watch mode by default — use `--once` to sync and exit. |
| [`brainlink config`](commands/config.md) | Change settings after init: git tracking, auto-sync, agent files. |
| [`brainlink clear`](commands/clear.md) | Reset `SESSION.md` for a clean session start. Leaves memory and history untouched. |
| `brainlink reset` | Wipe all `.brain/` memory back to blank templates. Keeps your settings. |
| [`brainlink update`](commands/update.md) | Check for the latest version and update. Never updates silently. |

Every command supports `--help`:
```bash
brainlink init --help
brainlink log --help
```

---

## What It Does

**New session memory** — every time you open a new AI session in your project, it already knows everything: what the project is, what decisions were made, what was built last session, and what comes next.

**Shared sessions** — two AI sessions open in the same project? They share the same context automatically. What one learns, the other knows.

**Works with any AI agent** — Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, Windsurf, and more. Run `brainlink init` and it generates the right setup for each agent you use.

**Your data, your files** — memory lives in your project as plain files. No account, no cloud, no API key. Commit it to git for team memory, or keep it local.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Contributions welcome. Open an issue or PR on [GitHub](https://github.com/404-not-found/brainlink).
