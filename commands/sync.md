# mindlink sync

Watch for shared context written by other sessions and surface it automatically.

**Run this in a dedicated background terminal tab** while your AI sessions are active. It stays running until you stop it (Ctrl+C).

---

## Synopsis

```bash
mindlink sync [--once] [--no-progress]
```

---

## What "watch mode" means

**Watch mode is the default** — when you run `mindlink sync` with no flags, the process stays alive. It watches `.brain/SHARED.md` for any new content written by other sessions in this project. The moment another session appends a discovery or decision, sync detects the change and prints a notification so you know to tell your AI to check `SHARED.md`.

This is designed to run in a separate terminal tab alongside your AI session, not as a one-shot command.

**`--once`** runs a single check and exits — useful when you just want to see what's been shared so far without keeping a watcher running.

If you enabled auto-sync during `mindlink init`, sync runs automatically in the background — you don't need to run this manually.

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
mindlink sync
```

**Sync once and exit:**
```bash
mindlink sync --once
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

To enable or disable auto-sync (set during `mindlink init`):

```bash
mindlink config
```

Select **Auto-sync** from the menu.

---

## Related Commands

- [`mindlink config`](config.md) — enable or disable auto-sync
- [`mindlink status`](status.md) — check current session state
