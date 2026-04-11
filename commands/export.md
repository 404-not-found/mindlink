# mindlink export

Export your project's AI memory to a shareable zip file.

**Run in your terminal.** The zip can be shared with teammates, used as a backup, or imported into another machine.

---

## Synopsis

```bash
mindlink export [--output <path>] [--include-agents]
```

---

## Description

Packages your `.brain/` folder into a zip file named `{project}-brain-{date}.zip`. You can share this zip with anyone — they import it with `mindlink import` and their AI agent wakes up knowing everything your project knows.

If you run this interactively (no `--output` flag), MindLink asks where to save the file.

---

## Use Cases

**Onboard a new teammate**
```bash
mindlink export --output ~/Desktop
# Send them: my-app-brain-2026-04-10.zip
# They run:  mindlink import my-app-brain-2026-04-10.zip
```

**Back up before a reset**
```bash
mindlink export --output ~/backups
mindlink reset
```

**Share context with a consultant**
```bash
mindlink export --include-agents --output ~/Desktop
# They get the memory AND the agent instruction files
```

---

## What Gets Exported

| File | Included |
|---|---|
| `.brain/MEMORY.md` | ✓ always |
| `.brain/SESSION.md` | ✓ always |
| `.brain/SHARED.md` | ✓ always |
| `.brain/LOG.md` | ✓ always |
| `.brain/LOG-*.md` (archives) | ✓ always |
| `CLAUDE.md`, `CURSOR.md`, etc. | Only with `--include-agents` |
| `.brain/config.json` | ✗ never (machine-specific) |

---

## Options

| Flag | Description |
|---|---|
| `--output <path>` | Directory or full `.zip` path to save the file |
| `--include-agents` | Also include agent instruction files |

---

## Output

```
  ✓  .brain/MEMORY.md
  ✓  .brain/SESSION.md
  ✓  .brain/SHARED.md
  ✓  .brain/LOG.md

  ✓  Exported to: /Users/yuanhong/Desktop/my-app-brain-2026-04-10.zip

  To import on another machine or project:
  mindlink import my-app-brain-2026-04-10.zip
```

---

## Related Commands

- [`mindlink import`](import.md) — import a zip into the current project
- [`mindlink reset`](reset.md) — wipe memory (export first if you want a backup)
