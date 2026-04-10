# brainlink clear

Reset current session state for a fresh start.

**Run in your terminal between sessions.** No confirmation needed — it just resets SESSION.md and tells you what it did.

---

## Synopsis

```bash
brainlink clear [--yes]
```

---

## Description

Resets `.brain/SESSION.md` so your AI agent starts the next session with a clean slate. **`MEMORY.md`, `LOG.md`, and `SHARED.md` are not touched** — permanent project facts, session history, and shared context are always preserved.

Use this when you want to start a genuinely new task and don't want the agent picking up mid-task state from a previous session.

Not what you need? See:
- [`brainlink reset`](reset.md) — wipe ALL memory back to blank (scorched earth)
- [`brainlink uninstall`](uninstall.md) — remove Brainlink from this project entirely

---

## What Gets Reset vs Preserved

| File | Action |
|---|---|
| `.brain/SESSION.md` | Reset to empty template |
| `.brain/MEMORY.md` | Untouched — permanent facts preserved |
| `.brain/LOG.md` | Untouched — full history preserved |
| `.brain/SHARED.md` | Untouched — shared context preserved |

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip the confirmation prompt |

---

## Examples

```bash
brainlink clear
brainlink clear --yes
```

---

## Output

```
? This will reset SESSION.md for a fresh session start.
  MEMORY.md and LOG.md are untouched.

❯ Yes, clear session
  Cancel

✓  SESSION.md cleared. Ready for a clean session.
```

---

## Related Commands

- [`brainlink status`](status.md) — check what's currently in SESSION.md before clearing
- [`brainlink log`](log.md) — view past session history
