# ◉ Brainlink

**Give your AI a permanent memory.**

Your AI has goldfish memory. Every new session, it wakes up knowing absolutely nothing about your project — no context, no decisions, no "we tried that last week." You spend the first 10 minutes re-explaining everything. Every. Single. Time.

Brainlink fixes that. One command per project, and your AI wakes up fully briefed every session.

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

No Node.js? Grab a standalone binary from [GitHub Releases](https://github.com/404-not-found/brainlink/releases) — no runtime required.

---

## Quick Start

```bash
cd my-project
brainlink init
```

**Run this before your first AI session** — it creates the memory files your agent reads on startup. The current session won't see them; the next one will wake up fully briefed. After that, you never have to run it again. That's the whole deal.

---

## What It Does

**No more goldfish brain** — every time you start a new AI session in your project, it already knows everything: what the project is, what decisions were made, what was built last session, what's broken, and what comes next. No briefing required.

**Two sessions, one brain** — two AI sessions open in the same project? They share the same context automatically. What one learns, the other can see. No more running the same experiment twice because your two agents didn't know about each other.

**Plug in, not lock in** — works with Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, Windsurf, Cline, Aider, and more. Run `brainlink init`, pick your agents, and it generates the right setup file for each one. No config to write, no API to call.

**Your files, your rules** — memory lives in your project as plain Markdown in a `.brain/` folder. No account, no cloud, no surveillance. Commit it to git for shared team memory, or keep it local. Read it, edit it, delete it — it's just files.

**Two kinds of memory, like a real brain** — `MEMORY.md` holds permanent facts (architecture, decisions, conventions) and never gets cleared. `LOG.md` holds recent session history; older entries get archived automatically when it grows too long. Like all human brains, Brainlink forgets old sessions that haven't come up in a while — that's by design. Anything that truly matters belongs in `MEMORY.md`, where it lives forever.

---

## Commands

**Run once, before your first AI session — in your terminal:**
```bash
brainlink init        # sets everything up — never needs to run again
```

**Ask your AI to run these, or run them yourself in any terminal:**
```bash
brainlink status      # what happened last session, what's next
brainlink summary     # full briefing — everything your AI knows, in one view
brainlink log         # complete session history
brainlink sync --once # check what other sessions have shared
```

**Run in a dedicated background terminal tab while sessions are active:**
```bash
brainlink sync        # watch mode — stays running, surfaces changes from other sessions the moment they happen
```
Watch mode is the default. It keeps the process alive and prints a notification whenever another session writes to the shared memory. Stop it with Ctrl+C. Use `--once` to check once and exit.

**Run in your terminal between sessions — not via AI (interactive or destructive):**
```bash
brainlink clear       # fresh session start (keeps memory and history intact)
brainlink reset       # scorched earth — wipe all memory, keep your settings
brainlink config      # change agents, git tracking, or auto-sync
```

**Run in your terminal only — maintenance tasks:**
```bash
brainlink update      # check for a newer version, never installs without asking
brainlink uninstall   # remove Brainlink from this project
```

Every command supports `--help`. Full CLI reference: [commands/](commands/index.md).

---

## Can my AI run these commands itself?

Yes — and it should, for the read-only ones. Your AI has a terminal. Tell it to run `brainlink summary` or `brainlink status` and it reads the output directly. This is the cleanest way to brief a mid-session agent without copying files around.

**AI can run:** `status`, `summary`, `log`, `sync --once`

**Run yourself:** `init`, `clear`, `reset`, `config`, `update`, `uninstall` — these are interactive, change settings, or modify/remove files. Keep human hands on them.

The one exception: `brainlink sync` in watch mode runs continuously — keep it in a separate terminal tab.

---

## The Hook (Claude Code users)

Claude Code users get an extra layer: a `UserPromptSubmit` hook in `.claude/settings.json` that fires on every message, reminding your agent to re-read `.brain/` if its context was just compacted. Other agents rely on their instruction files — Claude Code gets both because it supports OS-level hooks. Same protection, different delivery.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Spotted a bug? Have an idea? Open an issue or PR on [GitHub](https://github.com/404-not-found/brainlink). We read everything.
