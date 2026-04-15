# ◉ MindLink

**Give your AI a brain.**

Three things break AI-assisted development:

**Every new session starts blank.** No memory of what you built, what you decided, or what blew up last week. You spend the first 10 minutes re-explaining everything. Every. Single. Time.

**Two sessions share nothing.** Two AI agents running in the same project are invisible to each other — they duplicate work, contradict decisions, run the same experiment twice.

**Switch agents, lose everything.** Claude Code in the morning, Cursor in the afternoon — each tool has its own silo. What one learned, the other never knows.

MindLink fixes all three. One command per project.

Git gave every developer a shared version history. MindLink gives your AI team a shared memory — persistent, version-controlled, and not locked inside any one tool.

[![npm version](https://img.shields.io/npm/v/mindlink)](https://www.npmjs.com/package/mindlink)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](#installation)

![MindLink demo](demo.gif)

---

> ### ◉ Latest — v2.0.2
> **MCP integration for 6 agents · Smart loading · `mindlink verify` · `mindlink profile` · `mindlink prune`**
> [→ Full release notes](https://github.com/404-not-found/mindlink/releases/tag/v2.0.2)

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [What It Does](#what-it-does)
- [Supported Agents](#supported-agents)
- [Commands](#commands)
- [Can My AI Run These Commands?](#can-my-ai-run-these-commands-itself)
- [What's New in v2.0](#whats-new-in-v20)
- [Best with Claude Code](#best-with-claude-code)
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

**Team memory, like git** — commit `.brain/` to git and your whole team shares the same AI context, automatically. New developer joins, does `git pull` — their AI is already fully briefed. Two developers in the same project? Their agents share context in real time, just like working off the same branch. No onboarding session, no copying notes, no "let me catch you up." This is what git did for code history — MindLink does for AI memory.

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
| Zed | `.rules` |
| Kiro | `.kiro/steering/mindlink.md` |
| Continue.dev | `.continue/rules/mindlink.md` |
| Trae | `.trae/rules/mindlink.md` |

MindLink works by writing instruction files that agents read at startup — no API calls, no SDKs, no version pinning. It works with whatever version you have today and any version released tomorrow. If your agent isn't listed, `mindlink init` lets you add a custom one.

---

## Commands

**Run once per project — in your terminal, inside the project directory:**
```bash
cd my-project
mindlink init        # creates .brain/ here — pre-filled from your project on day 1
```

**Ask your AI to run these, or run them yourself in any terminal:**
```bash
mindlink status      # what happened last session, what's next
mindlink summary     # full briefing — everything your AI knows, in one view
mindlink log         # complete session history
mindlink diff        # what changed in .brain/ since last session
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
mindlink verify      # check that .brain/ memory is healthy and up to date
mindlink prune       # review and retire stale MEMORY.md entries
mindlink profile     # manage your global user profile (imported into every new project)
mindlink doctor      # health check — verify your setup is working correctly
mindlink update      # check for a newer version, refreshes agent files in all projects
mindlink uninstall   # remove MindLink from this project
```

Every command supports `--help`. Full CLI reference: [commands/](commands/index.md).

---

## Can my AI run these commands itself?

Yes — and it should, for the read-only ones. Your AI has a terminal. Tell it to run `mindlink summary` or `mindlink status` and it reads the output directly. This is the cleanest way to brief a mid-session agent without copying files around.

**AI can run:** `status`, `summary`, `log`, `diff`, `sync --once`, `verify`

**Run yourself:** `init`, `clear`, `reset`, `config`, `profile`, `prune`, `export`, `import`, `update`, `uninstall` — these are interactive, change settings, or modify files. Keep human hands on them.

**Launched automatically (not by hand):** `mcp` — started by Claude Code, Cursor, and other MCP-capable agents as a background process. Never run this yourself.

The one exception: `mindlink sync` in watch mode runs continuously — keep it in a separate terminal tab.

---

## Best with Claude Code

MindLink works with every agent listed above. But Claude Code users get something the others don't: **a second enforcement layer**.

Every other agent reads the instruction file at startup and follows it as best it can. That's the instruction layer — guidance, not guarantees. The agent can skip a step, misread a section, or forget to write after a long session.

Claude Code gets both the instruction file **and** an OS-level hook that fires before every single message — outside the AI's control. This hook:

- Scans for memory triggers and reminds the agent to write `MEMORY.md` before answering
- Forces `SESSION.md` to be updated as the last action of every response
- Runs a shell-level check after every response: if `MEMORY.md` still contains only placeholders, the agent is immediately flagged and must fill it in before continuing

**The practical difference:**

| | All other agents | Claude Code |
|---|---|---|
| Persistent memory | ✓ instruction file | ✓ instruction file + hook |
| Enforced on every message | ✗ | ✓ OS-level hook |
| Post-response memory verification | ✗ | ✓ shell check |
| Context compaction recovery | ✓ instruction | ✓ instruction + hook |
| MCP tool integration | ✓ Cursor, Continue, Copilot, Kiro, Windsurf | ✓ Claude Code |

If you're choosing an agent specifically to use with MindLink, Claude Code gives you the most reliable memory behavior. Other agents work well — Claude Code works harder.

**v2.0: MCP support for more agents.** Cursor, Continue.dev, GitHub Copilot, Kiro, and Windsurf now also get an MCP server configured automatically on `mindlink init`. This gives those agents structured, schema-validated reads and writes instead of raw file operations — the same feedback loop Claude Code users have had since v1.

---

## What's New in v2.0

**MCP integration — structured, auditable memory operations.** `mindlink mcp` is a stdio MCP server. `mindlink init` configures it automatically for Claude Code, Cursor, Continue.dev, GitHub Copilot, Kiro, and Windsurf. Agents call `mindlink_read_memory()`, `mindlink_write_memory()`, and `mindlink_session_update()` as proper tool calls — with structured inputs, structured results, and a verify loop to confirm writes actually landed.

**Smart loading — only load what you need.** Agent templates now load Core + User Profile only by default. Architecture, Decisions, Conventions, and Important Context sections are loaded on demand, based on what the agent is about to do. Less context used per session; faster session starts.

**`mindlink verify` — memory health check.** Scans `.brain/` and reports: is Core filled? Is SESSION.md fresh? Is MEMORY.md under the size limit? Is every agent file present? Flags errors and warnings. `--fix` auto-regenerates missing agent files.

**`mindlink profile` — global user profile.** Write once in `~/.mindlink/USER.md`, automatically imported into every new project. Tells your AI who you are, how you like to work, and what your preferences are — without re-explaining it in every project.

**`mindlink prune` — retire stale memory.** Reviews every timestamped entry in MEMORY.md and asks: keep, archive, or delete? Entries past their freshness threshold are surfaced first. `--dry-run` shows what would be flagged without touching anything.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Spotted a bug? Have an idea? Open an issue or PR on [GitHub](https://github.com/404-not-found/mindlink). We read everything.
