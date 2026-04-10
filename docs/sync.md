# brainlink sync

Sync shared context between sessions.

---

## Synopsis

```bash
brainlink sync [--once] [--no-progress]
```

---

## Description

Merges new content written to `.brain/SHARED.md` by any session in this project. When two AI sessions are running in the same project folder, each can write discoveries, decisions, and context to `SHARED.md`. `brainlink sync` detects changes and merges them so both sessions stay aware of each other.

**Watch mode is the default.** `brainlink sync` runs continuously, watching for changes and syncing automatically as sessions write. Use `--once` to sync a single time and exit.

If you enabled auto-sync during `brainlink init`, sync runs automatically in the background — you don't need to run this command manually.

---

## Options

| Flag | Description |
|---|---|
| `--once` | Sync once and exit instead of watching continuously |
| `--no-progress` | Suppress progress output (useful in scripts) |

---

## Examples

**Watch mode (default) — runs until you stop it:**
```bash
brainlink sync
```

**Sync once and exit:**
```bash
brainlink sync --once
```

---

## Output

**Watch mode:**
```
Watching for changes...  (Ctrl+C to stop)

[Apr 9 14:32]  Session A wrote 3 new entries  →  synced ✓
[Apr 9 14:45]  Session B wrote 1 new entry    →  synced ✓
```

**Single run:**
```
Syncing shared context...

Session A  →  3 new entries
Session B  →  1 new entry

[████████████████████] 100%

✓  SHARED.md merged. Both sessions are now in sync.
```

**Nothing to sync:**
```
✓  Already in sync. No new entries to merge.
```

---

## Changing Auto-Sync Setting

To enable or disable auto-sync (set during `brainlink init`):

```bash
brainlink config
```

Select **Auto-sync** from the menu.

---

## Related Commands

- [`brainlink config`](config.md) — enable or disable auto-sync
- [`brainlink status`](status.md) — check current session state
