# brainlink config

Change settings for the current project after init.

**Run in your terminal — this opens an interactive menu.** Not suitable for AI to run on your behalf.

---

## Synopsis

```bash
brainlink config
```

---

## Description

Opens an interactive menu to change any setting that was configured during `brainlink init`. All settings are stored in `.brain/` and scoped to the current project path.

---

## Settings

### Git tracking

Controls whether `.brain/` is committed to git or ignored.

| Option | What it does |
|---|---|
| Enable | Removes `.brain/` from `.gitignore`. Your team shares the same AI memory. |
| Disable | Adds `.brain/` to `.gitignore`. Memory stays on your machine only. |

### Auto-sync

Controls whether `brainlink sync` runs automatically in the background.

| Option | What it does |
|---|---|
| Enable | Sync runs automatically. Sessions stay in sync without manual intervention. |
| Disable | You run `brainlink sync` manually when you want to sync. |

### Agent instruction files

Add or remove agent instruction files for this project. Same multi-select menu as `brainlink init`.

Selecting an agent that isn't already set up generates its instruction file.
Deselecting an agent that exists prompts you to confirm before deleting the file.

---

## Examples

```bash
brainlink config
```

---

## Interactive Menu

```
Current settings  ·  /Users/yuanhong/projects/my-app

Git tracking   : enabled   (team shares memory)
Auto-sync      : enabled   (watch mode)
Agent files    : CLAUDE.md, CURSOR.md, AGENTS.md ...

? What would you like to change?
❯ Git tracking
  Auto-sync
  Agent instruction files
  Exit
```

---

## Related Commands

- [`brainlink init`](init.md) — initial setup (first time only)
- [`brainlink sync`](sync.md) — manually run sync
