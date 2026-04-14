# MindLink CLI Reference

> Full command reference for the MindLink CLI.
> Each command page includes synopsis, options, output examples, and error cases.

---

## Commands

Commands are grouped by when and how you run them.

### Run once — in your terminal, before first AI session

| Command | Description |
|---|---|
| [init](init.md) | Set up `.brain/` memory for the current project |

### Ask your AI to run — or run yourself in any terminal

| Command | Description |
|---|---|
| [status](status.md) | Show last session summary and what's next |
| [summary](summary.md) | Full briefing — everything MindLink knows, in one view |
| [log](log.md) | View full session history |
| [diff](diff.md) | Show what changed in `.brain/` since the current session started |
| [verify](verify.md) | Health check — are memory files filled in and up to date? |

### Keep running in a background terminal tab (while sessions are active)

| Command | Description |
|---|---|
| [sync](sync.md) | Watch for changes from other sessions and surface them automatically |

`mindlink sync` runs in **watch mode by default** — it stays alive and prints a notification whenever another session appends to `.brain/SHARED.md`. Use `--once` to check a single time and exit.

### Launched automatically by Claude Code — not by hand

| Command | Description |
|---|---|
| [mcp](mcp.md) | Start the MindLink MCP server (stdio transport for AI tool integration) |

`mindlink mcp` is started automatically when Claude Code launches a session. It exposes 4 MCP tools (`mindlink_read_memory`, `mindlink_write_memory`, `mindlink_session_update`, `mindlink_verify`) for schema-validated memory reads and writes.

### Run in your terminal between sessions — not via AI

These commands are interactive, change settings, or modify files. Keep human hands on them.

| Command | Description |
|---|---|
| [clear](clear.md) | Reset SESSION.md for a fresh session start (keeps memory and history) |
| [reset](reset.md) | Wipe all `.brain/` memory back to blank templates |
| [config](config.md) | Change agents, git tracking, or auto-sync after init |

### Share and backup — run in your terminal

| Command | Description |
|---|---|
| [export](export.md) | Export `.brain/` memory to a shareable zip |
| [import](import.md) | Import a zip into the current project |

### Maintenance — run in your terminal only

| Command | Description |
|---|---|
| [profile](profile.md) | Manage your global user profile (auto-imported into every new project) |
| [prune](prune.md) | Review and retire stale MEMORY.md entries interactively |
| [update](update.md) | Check for a newer version — never installs without asking |
| [uninstall](uninstall.md) | Remove MindLink from the current project |

---

## Global Flags

These flags work on every command.

| Flag | Description |
|---|---|
| `--help`, `-h` | Show help for the command |
| `--version`, `-v` | Show the installed version |
| `--yes`, `-y` | Skip confirmation prompts (where supported) |
| `--json` | Output as JSON (status, summary, log) |
| `--no-progress` | Disable progress bars (useful in scripts and CI) |

---

## Getting Help

```bash
mindlink --help
mindlink <command> --help
```

Every command's `--help` shows a synopsis, all flags, examples, and what gets removed/changed.
