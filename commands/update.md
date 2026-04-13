# mindlink update

Update mindlink to the latest version and refresh all project files.

**Run in your terminal only** — this downloads and installs software. Always prompts before doing anything.

---

## Synopsis

```bash
mindlink update
```

---

## Description

Checks the latest version on npm and prompts before installing. Never updates silently — you are always shown what version you're moving to and can cancel.

After installing (or if you're already up to date), `mindlink update` automatically refreshes every initialized project on your machine:

- **Agent instruction files** (`CLAUDE.md`, `.cursorrules`, etc.) are overwritten with the latest templates in all registered projects. These files are owned by MindLink — any manual edits will be replaced.
- **Claude Code hooks** (`.claude/settings.json`) are refreshed to the latest hook commands.
- **MEMORY.md migrations** are applied non-destructively — new sections introduced in this version are injected into existing MEMORY.md files if they are absent. Your existing content is never touched.
- **Missing brain files** are created if a new version introduced a new `.brain/` file that didn't exist in older projects.

This means running `mindlink update` is always safe — your memory is preserved and your projects are brought to current spec automatically.

Release notes for every version:
```
https://github.com/404-not-found/mindlink/releases
```

---

## Examples

```bash
mindlink update
```

---

## Output

**Update available:**
```
Current version   : x.y.z
Latest version    : x.y.z+1

❯ Update to x.y.z+1
  Skip this version
  Cancel

✓  Updated to x.y.z+1
   See what's new: github.com/404-not-found/mindlink/releases/tag/vx.y.z+1

  Refreshing agent files in 3 projects...

  /Users/you/projects/my-app
    ✓  CLAUDE.md
    ✓  CURSOR.md
    ✓  .claude/settings.json
    ✓  .brain/MEMORY.md

  All agent files are up to date.
```

**Already up to date:**
```
✓  You're on the latest version (x.y.z).
```

---

## Related Commands

- [`mindlink init`](init.md) — set up a new project
- [`mindlink help`](index.md) — see all commands
