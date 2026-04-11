# ◉ MindLink

**Give your AI a brain.**

Three things break AI-assisted development:

**Every new session starts blank.** No memory of what you built, what you decided, or what blew up last week. You spend the first 10 minutes re-explaining everything. Every. Single. Time.

**Two sessions share nothing.** Two AI agents running in the same project are invisible to each other — they duplicate work, contradict decisions, run the same experiment twice.

**Switch agents, lose everything.** Claude Code in the morning, Cursor in the afternoon — each tool has its own silo. What one learned, the other never knows.

MindLink fixes all three. One command per project.

[![npm version](https://img.shields.io/npm/v/mindlink)](https://www.npmjs.com/package/mindlink)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](#installation)

---

> ### ◉ Latest — v1.1.1
> **Session memory · Cross-session sync · Cross-agent · 8 AI agents supported · Auto-refresh templates on update**
> [→ Full release notes](https://github.com/404-not-found/mindlink/releases/tag/v1.1.1)

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [What It Does](#what-it-does)
- [Supported Agents](#supported-agents)
- [Commands](#commands)
- [Can My AI Run These Commands?](#can-my-ai-run-these-commands-itself)
- [The Hook (Claude Code)](#the-hook-claude-code-users)
- [License](#license)
- [Contributing](#contributing)

---

## Installation

**npm**
```bash
npm install -g mindlink
```

**Homebrew (macOS / Linux)**
```bash
brew tap 404-not-found/mindlink
brew install mindlink
```

**curl (macOS / Linux)**
```bash
curl -sL https://raw.githubusercontent.com/404-not-found/mindlink/main/scripts/install.sh | sh
```

**Windows (Scoop)**
```bash
scoop install mindlink
```

No Node.js? Grab a standalone binary from [GitHub Releases](https://github.com/404-not-found/mindlink/releases) — no runtime required.

---

## Quick Start

```bash
cd my-project    # navigate into the project where you want AI memory to live
mindlink init   # run this once — your AI will know everything from the next session on
```

**Run this in your project directory, before your first AI session.** MindLink creates a `.brain/` folder right there — scoped to that project, not global. This is the folder your AI agent will read every time it wakes up in that project: your architecture decisions, what was built last session, what's broken, what's next. The more you work in that project, the smarter it gets.

The current session won't see it. The next one will wake up fully briefed. After that, you never have to run `init` again. That's the whole deal.

Close any AI session whenever you want — Claude Code, Cursor, Codex, whatever you're using. Lose your train of thought. Switch agents. Take a week off. The next session picks up exactly where you left off — no re-explaining, no context dumps, no "wait, what were we doing?" moments.

---

## What It Does

**No more goldfish brain** — every time you start a new AI session in your project, it already knows everything: what the project is, what decisions were made, what was built last session, what's broken, and what comes next. No briefing required.

**Close any AI session whenever you want** — Claude Code, Cursor, Codex, it doesn't matter. Lose your train of thought, switch agents mid-task, take a week off. The next session — in any tool — picks up exactly where you left off. You'll never be afraid to close a session again.

**Two sessions, one brain** — two AI sessions open in the same project? They share the same context automatically. What one learns, the other can see. No more running the same experiment twice because your two agents didn't know about each other.

**One memory, every agent** — use Claude Code in the morning, switch to Cursor in the afternoon — both read the exact same `.brain/` folder. No syncing. No duplicating context. No "but I told the other AI this already." Every agent you use shares one brain, because the memory lives in your project, not inside any particular tool. This is something no AI vendor can replicate — they each only know their own product.

**Team memory out of the box** — commit `.brain/` to git and your whole team shares the same AI context. New teammate joins, does `git pull`, and their AI agent is already fully briefed on the project. No onboarding session, no copying notes, no "let me catch you up."

**Plug in, not lock in** — works with Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, Windsurf, Cline, Aider, and more. Because MindLink just writes files that agents read — no APIs, no SDKs, no version dependencies — it works with whatever version you have installed today and every version that comes after.

**Zero infrastructure** — no server, no account, no cloud, no pricing page. MindLink can't be shut down, rate-limited, or go behind a paywall. It's a file and a CLI. Works completely offline.

**Your files, your rules** — memory lives in your project as plain Markdown in a `.brain/` folder. No account, no cloud, no surveillance. Read it, edit it, delete it — it's just files. You own it completely.

**Smart memory, like a real brain** — `MEMORY.md` holds the facts that matter forever (architecture, decisions, conventions) and is never cleared. `LOG.md` holds session history and quietly archives old entries when it gets long. Like any good brain, MindLink remembers what matters and lets go of the stuff that hasn't come up in a while. Anything truly important belongs in `MEMORY.md` — promote it there and it lives forever.

---

## Supported Agents

MindLink works with any version of:

| Agent | Instruction file |
|---|---|
| Claude Code | `CLAUDE.md` |
| Cursor | `CURSOR.md` |
| Codex / OpenAI | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules` |
| Aider | `CONVENTIONS.md` |

MindLink works by writing instruction files that agents read at startup — no API calls, no SDKs, no version pinning. It works with whatever version you have today and any version released tomorrow. If your agent isn't listed, `mindlink init` lets you add a custom one.

---

## Commands

**Run once per project — in your terminal, inside the project directory:**
```bash
cd my-project
mindlink init        # creates .brain/ here — this is where your AI's memory lives
```

**Ask your AI to run these, or run them yourself in any terminal:**
```bash
mindlink status      # what happened last session, what's next
mindlink summary     # full briefing — everything your AI knows, in one view
mindlink log         # complete session history
mindlink sync --once # check what other sessions have shared
```

**Run in a dedicated background terminal tab while sessions are active:**
```bash
mindlink sync        # watch mode — stays running, surfaces changes from other sessions the moment they happen
```
Watch mode is the default. It keeps the process alive and prints a notification whenever another session writes to the shared memory. Stop it with Ctrl+C. Use `--once` to check once and exit.

**Run in your terminal between sessions — not via AI (interactive or destructive):**
```bash
mindlink clear       # fresh session start (keeps memory and history intact)
mindlink reset       # scorched earth — wipe all memory, keep your settings
mindlink config      # change agents, git tracking, or auto-sync
```

**Share memory or back it up — run in your terminal:**
```bash
mindlink export      # zip your .brain/ — send to a teammate or save as backup
mindlink import      # unzip into this project — merge or overwrite your existing memory
```

**Run in your terminal only — maintenance tasks:**
```bash
mindlink doctor      # health check — verify your setup is working correctly
mindlink update      # check for a newer version, never installs without asking
mindlink uninstall   # remove MindLink from this project
```

Every command supports `--help`. Full CLI reference: [commands/](commands/index.md).

---

## Can my AI run these commands itself?

Yes — and it should, for the read-only ones. Your AI has a terminal. Tell it to run `mindlink summary` or `mindlink status` and it reads the output directly. This is the cleanest way to brief a mid-session agent without copying files around.

**AI can run:** `status`, `summary`, `log`, `sync --once`

**Run yourself:** `init`, `clear`, `reset`, `config`, `export`, `import`, `update`, `uninstall` — these are interactive, change settings, or modify files. Keep human hands on them.

The one exception: `mindlink sync` in watch mode runs continuously — keep it in a separate terminal tab.

---

## The Hook (Claude Code users)

Claude Code users get an extra layer: a `UserPromptSubmit` hook in `.claude/settings.json` that fires on every message, reminding your agent to re-read `.brain/` if its context was just compacted. Other agents rely on their instruction files — Claude Code gets both because it supports OS-level hooks. Same protection, different delivery.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Spotted a bug? Have an idea? Open an issue or PR on [GitHub](https://github.com/404-not-found/mindlink). We read everything.
