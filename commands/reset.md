# brainlink reset

Wipe all `.brain/` memory files and start completely fresh.

---

## Synopsis

```bash
brainlink reset [--yes]
```

---

## Description

Resets all four `.brain/` memory files — `MEMORY.md`, `SESSION.md`, `SHARED.md`, and `LOG.md` — back to blank templates. Your settings (`config.json`) and agent instruction files (e.g. `CLAUDE.md`, `CURSOR.md`) are untouched.

Use this when the project direction has fundamentally changed and you want your AI to start with no prior context. For simply starting a new work session, use [`brainlink clear`](clear.md) instead.

---

## What Gets Reset vs Preserved

| File | Action |
|---|---|
| `.brain/MEMORY.md` | Reset to blank template |
| `.brain/SESSION.md` | Reset to blank template |
| `.brain/SHARED.md` | Reset to blank template |
| `.brain/LOG.md` | Reset to blank template |
| `.brain/config.json` | Untouched — settings preserved |
| Agent files (CLAUDE.md etc.) | Untouched — instruction files preserved |

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip the confirmation prompt |

---

## Examples

```bash
brainlink reset
brainlink reset --yes
```

---

## Output

```
! This will wipe all .brain/ memory files and start fresh.
  MEMORY.md, SESSION.md, SHARED.md, and LOG.md will be reset to blank templates.
  Your settings and agent files are untouched.

  This cannot be undone (unless .brain/ is tracked by git).

❯ Yes, reset everything
  Cancel

✓  .brain/ reset. All memory files are blank.
   Your AI will wake up with no memory of past sessions.
```

---

## Related Commands

- [`brainlink clear`](clear.md) — lighter reset, SESSION.md only
- [`brainlink init`](init.md) — set up a project from scratch
- [`brainlink status`](status.md) — check current memory before resetting
