# mindlink doctor

Check that your MindLink setup is healthy.

**Run in your terminal.** Use this when something feels off, after a fresh `import`, or just to verify everything is wired up correctly.

---

## Synopsis

```bash
mindlink doctor
```

---

## Description

Runs a series of checks on your project's MindLink setup and reports any problems. Exits with code 1 if any critical issues are found, 0 if everything is healthy (warnings are allowed).

---

## What Gets Checked

| Check | What it looks for |
|---|---|
| `.brain/` | Exists in the current directory |
| `config.json` | Present and valid JSON |
| `MEMORY.md` | Core section has content; warns if getting too long |
| `SESSION.md` | Has content and shows when it was last updated |
| `LOG.md` | Session count, last session date, how far back history goes |
| Agent files | Each configured agent's instruction file exists |
| Claude hook | `.claude/settings.json` hook is present and valid |

---

## Output

```
  ◉ MindLink Doctor
  /Users/yuanhong/my-app

  ✓  .brain/ found
  ✓  config.json valid
  ✓  MEMORY.md Core has content
  ✓  SESSION.md — updated 2 hours ago
  ✓  LOG.md — 12 sessions logged (last: Apr 10, 2026, going back to: Jan 5, 2026)
  ✓  CLAUDE.md — Claude Code
  ✓  CURSOR.md — Cursor
  ✓  .claude/settings.json — UserPromptSubmit hook active
  ·  .brain/ is committed to git (shared team memory)

  All good. Your AI has a healthy brain.
```

### Warning example

```
  !  MEMORY.md Core is getting long
     Consider asking your AI to consolidate — Core is read on every session start.

  1 warning, no critical issues. Your AI will still work.
```

### Failure example

```
  ✗  MEMORY.md missing
     Run mindlink init to recreate it.

  1 problem found — fix the issues above and re-run mindlink doctor.
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Healthy (warnings allowed) |
| `1` | One or more critical problems found |

---

## When to Run

- After `mindlink import` — verify the import landed correctly
- When your AI seems confused or isn't reading context — check the agent files
- On a new machine after cloning — make sure instruction files are in place
- Periodically to catch drift before it becomes a problem

---

## Related Commands

- [`mindlink init`](init.md) — set up MindLink (fixes most failures doctor finds)
- [`mindlink config`](config.md) — change agents or settings
- [`mindlink status`](status.md) — see what your AI knows right now
