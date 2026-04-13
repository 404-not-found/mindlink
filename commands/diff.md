# mindlink diff

Show what changed in `.brain/` since the current session started.

---

## Synopsis

```bash
mindlink diff [--since <ref>] [--json]
```

---

## Description

Shows a per-file summary of `.brain/` changes since the session began — which files were modified, how many lines they contain, and when they were last touched.

If `.brain/` is committed to git, `mindlink diff` also shows line-level additions and removals so you can see exactly what the AI wrote.

This command is useful for:
- Verifying that your AI actually wrote to MEMORY.md during the session (not just claimed to)
- Reviewing what context was captured before closing a session
- Debugging why a follow-up session is missing context

**Your AI can run this.** Ask it to run `mindlink diff` to check its own work.

---

## Output

**Without git tracking:**
```
  .brain/ changes
  Session started 12m ago
  .brain/ is not git-tracked — showing modification times only

  ●  MEMORY.md   94 lines · modified 3m ago
  ○  SESSION.md  32 lines · modified 12m ago
  ○  LOG.md      24 lines · modified 12m ago
  ○  SHARED.md   21 lines · modified 12m ago

  ✓  1 file updated this session.
```

`●` = modified this session · `○` = not modified this session

**With git tracking (`.brain/` committed):**
```
  .brain/ changes
  Session started 12m ago
  Git diff against: HEAD~1

  ●  MEMORY.md   97 lines · modified 3m ago
       + TypeScript + Node.js <!-- added: 2026-04-12 -->
       + Use mtime-based session verification for Stop hook

  ○  SESSION.md  32 lines · modified 12m ago
       no changes since last commit
```

---

## Options

| Flag | Description |
|---|---|
| `--since <ref>` | Git ref or date to diff against. Default: `HEAD~1`. Examples: `HEAD~3`, `"2026-04-10"` |
| `--json` | Output as JSON — useful for scripting or AI consumption |

---

## Examples

**Check what changed this session:**
```bash
mindlink diff
```

**Diff against 3 commits ago:**
```bash
mindlink diff --since HEAD~3
```

**Machine-readable output:**
```bash
mindlink diff --json
```

---

## JSON Output

```json
{
  "MEMORY.md": {
    "exists": true,
    "mtime": 1776041234567,
    "sizeLines": 97,
    "added": ["TypeScript + Node.js"],
    "removed": []
  },
  "SESSION.md": { "exists": true, "mtime": 1776041117345, "sizeLines": 32, "added": [], "removed": [] },
  "LOG.md":     { "exists": true, "mtime": 1776041117346, "sizeLines": 24, "added": [], "removed": [] },
  "SHARED.md":  { "exists": true, "mtime": 1776041117346, "sizeLines": 21, "added": [], "removed": [] }
}
```

---

## Related Commands

- [`mindlink status`](status.md) — high-level view of current session state
- [`mindlink summary`](summary.md) — full contents of all `.brain/` files in one view
- [`mindlink clear`](clear.md) — reset SESSION.md for a fresh start
