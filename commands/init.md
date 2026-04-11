# mindlink init

Set up memory for the current project.

---

## Synopsis

```bash
mindlink init [--yes]
```

---

## Description

Creates a `.brain/` folder in the current directory and generates agent instruction files for the AI agents you select. Memory is scoped to the **absolute path** of this directory — run `mindlink init` separately in each project you want to give memory.

**Run this before starting your AI session.** The agent reads the instruction files on startup. If you init after a session has already started, the current session won't see it — the next one will.

---

## What Gets Created

```
your-project/
├── .brain/
│   ├── MEMORY.md     ← permanent facts: project identity, architecture, decisions
│   ├── SESSION.md    ← current session state, updated as you work
│   ├── SHARED.md     ← shared context readable and writable by any session
│   └── LOG.md        ← full history of every session ever run
├── CLAUDE.md         ← Claude Code instruction file (if selected)
├── CURSOR.md         ← Cursor instruction file (if selected)
├── AGENTS.md         ← Codex / OpenAI instruction file (if selected)
├── GEMINI.md         ← Gemini CLI instruction file (if selected)
└── ...               ← other agent files based on your selection
```

---

## Interactive Prompts

`mindlink init` walks you through three choices.

### 1. Which AI agents do you use?

Select the agents you use in this project. MindLink generates the right instruction file for each one.

| Agent | File generated |
|---|---|
| Claude Code | `CLAUDE.md` |
| Cursor | `CURSOR.md` |
| Codex / OpenAI | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules` |
| Aider | `CONVENTIONS.md` |
| Add custom agent | file name of your choice |

**To change this later:** `mindlink config` → Agent instruction files

### 2. Should .brain/ be tracked by git?

| Choice | What it means |
|---|---|
| Enable (commit to git) | Your whole team shares the same AI memory. Decisions, context, and history are tracked alongside code. |
| Disable (add to .gitignore) | Memory stays on your machine only. Teammates don't see it. |

**To change this later:** `mindlink config` → Git tracking

### 3. Auto-sync between sessions?

| Choice | What it means |
|---|---|
| Enable (watch mode) | `mindlink sync` runs automatically in the background, keeping all sessions in sync as they write. |
| Disable (manual) | Run `mindlink sync` yourself when you want to sync. |

**To change this later:** `mindlink config` → Auto-sync

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip all prompts and use defaults (all agents selected, git enabled, auto-sync enabled) |

---

## Examples

**Standard setup with interactive prompts:**
```bash
cd my-project
mindlink init
```

**Non-interactive setup (CI or scripting):**
```bash
mindlink init --yes
```

---

## Already Initialized

If `.brain/` already exists, `mindlink init` shows a recovery menu instead of an error:

```
.brain/ already exists at this path. What would you like to do?
❯ Change settings       mindlink config
  View current status   mindlink status
  Nothing — exit
```

With `--yes`, exits immediately and tells you to run `mindlink config` to change settings.

---

## Related Commands

- [`mindlink config`](config.md) — change any setting made during init
- [`mindlink status`](status.md) — check current memory state
