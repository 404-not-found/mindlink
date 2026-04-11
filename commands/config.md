# mindlink config

Change settings for the current project after init.

**Run in your terminal — this opens an interactive menu.** Not suitable for AI to run on your behalf.

---

## Synopsis

```bash
mindlink config
```

---

## Description

Opens an interactive menu to change any setting that was configured during `mindlink init`. All settings are stored in `.brain/` and scoped to the current project path.

---

## Settings

### Git tracking

Controls whether `.brain/` is committed to git or ignored.

| Option | What it does |
|---|---|
| Enable | Removes `.brain/` from `.gitignore`. Your team shares the same AI memory. |
| Disable | Adds `.brain/` to `.gitignore`. Memory stays on your machine only. |

### Auto-sync

Controls whether `mindlink sync` runs automatically in the background.

| Option | What it does |
|---|---|
| Enable | Sync runs automatically. Sessions stay in sync without manual intervention. |
| Disable | You run `mindlink sync` manually when you want to sync. |

### Agent instruction files

Add or remove agent instruction files for this project. Same multi-select menu as `mindlink init`.

Selecting an agent that isn't already set up generates its instruction file.
Deselecting an agent that exists prompts you to confirm before deleting the file.

---

## Examples

```bash
mindlink config
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

- [`mindlink init`](init.md) — initial setup (first time only)
- [`mindlink sync`](sync.md) — manually run sync
