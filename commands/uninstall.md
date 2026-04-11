# mindlink uninstall

Remove MindLink from the current project.

**Run in your terminal only** — this permanently removes files. Always prompts for confirmation first.

---

## Synopsis

```bash
mindlink uninstall [--yes]
```

---

## Description

Removes everything MindLink created in this project directory:

- `.brain/` folder and all memory files inside it
- Agent instruction files (`CLAUDE.md`, `CURSOR.md`, etc.) that were created during `mindlink init`
- `.claude/settings.json` hook (if Claude was one of the configured agents)

The MindLink CLI itself is **not** removed. To uninstall the CLI globally:

```bash
npm uninstall -g mindlink
```

MindLink reads `config.json` inside `.brain/` to know which agent files to remove. If config is unreadable, it removes all known agent files as a safe default.

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip confirmation and remove everything immediately |

---

## Examples

```bash
mindlink uninstall          # interactive — shows what will be removed, asks to confirm
mindlink uninstall --yes    # skip confirmation (useful in scripts)
```

---

## What Gets Removed

```
.brain/                 (all memory files)
CLAUDE.md               (if Claude was configured)
CURSOR.md               (if Cursor was configured)
AGENTS.md               (if Codex was configured)
GEMINI.md               (if Gemini was configured)
.github/copilot-instructions.md  (if Copilot was configured)
.windsurfrules          (if Windsurf was configured)
.clinerules             (if Cline was configured)
CONVENTIONS.md          (if Aider was configured)
.claude/settings.json   (if Claude was configured)
```

---

## What Stays

- The mindlink CLI itself
- Any files MindLink did not create

---

## Error: Not Initialized

```
✗  No .brain/ found in this directory.
   Nothing to uninstall here.
```

---

## Related Commands

- [`mindlink init`](init.md) — set up memory for this project
- [`mindlink reset`](reset.md) — wipe memory but keep MindLink installed
