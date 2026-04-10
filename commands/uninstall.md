# brainlink uninstall

Remove Brainlink from the current project.

---

## Synopsis

```bash
brainlink uninstall [--yes]
```

---

## Description

Removes everything Brainlink created in this project directory:

- `.brain/` folder and all memory files inside it
- Agent instruction files (`CLAUDE.md`, `CURSOR.md`, etc.) that were created during `brainlink init`
- `.claude/settings.json` hook (if Claude was one of the configured agents)

The Brainlink CLI itself is **not** removed. To uninstall the CLI globally:

```bash
npm uninstall -g brainlink
```

Brainlink reads `config.json` inside `.brain/` to know which agent files to remove. If config is unreadable, it removes all known agent files as a safe default.

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip confirmation and remove everything immediately |

---

## Examples

```bash
brainlink uninstall          # interactive — shows what will be removed, asks to confirm
brainlink uninstall --yes    # skip confirmation (useful in scripts)
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

- The brainlink CLI itself
- Any files Brainlink did not create

---

## Error: Not Initialized

```
✗  No .brain/ found in this directory.
   Nothing to uninstall here.
```

---

## Related Commands

- [`brainlink init`](init.md) — set up memory for this project
- [`brainlink reset`](reset.md) — wipe memory but keep Brainlink installed
