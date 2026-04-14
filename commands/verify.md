# mindlink verify

Check that `.brain/` memory is healthy and up to date.

---

## Synopsis

```bash
mindlink verify [--json] [--fix]
```

---

## Description

Runs a health check on the current project's `.brain/` directory. Answers: "is my AI's memory in good shape right now?"

Unlike `mindlink doctor` (which checks setup correctness), `mindlink verify` checks **content quality** — whether memory files are actually filled in, whether the AI is actively writing session state, and whether MEMORY.md is getting too large to be useful.

**Your AI can run this.** Ask it to run `mindlink verify` to check its own work before closing a session.

---

## Checks

| Check | Pass | Warn | Fail |
|---|---|---|---|
| **Core section** | Has real content | — | Empty or placeholder only |
| **User Profile** | Has real content | — | Empty or placeholder only |
| **SESSION.md freshness** | Updated < 3 days ago | 3–7 days | > 7 days |
| **LOG.md present** | Exists | — | Missing |
| **MEMORY.md size** | < 100 real lines | 100–200 lines | > 200 lines |
| **Agent files** | All present | Some missing | None present |

---

## Output

```
  ◉ MindLink Verify
  /Users/you/my-project

  ✓  Core section — filled
  ✓  User Profile — filled
  ⚠  SESSION.md — last updated 5 days ago
       SESSION.md is getting stale...
  ✓  LOG.md — 14 sessions logged
  ✗  MEMORY.md — 217 lines (target: under 200)
       Run mindlink prune to consolidate stale entries.
  ✓  Agent files — all 2 present

  1 error, 1 warning.
  Run mindlink verify --fix to auto-repair 0 issues.
```

---

## Options

| Flag | Description |
|---|---|
| `--json` | Output results as JSON — useful for scripting or AI consumption |
| `--fix` | Auto-fix recoverable issues (regenerate missing agent files) |

---

## `--fix` Behavior

Auto-fix only applies to recoverable issues. It **never touches user-written memory content**.

| Check | `--fix` action |
|---|---|
| `agent_files` missing | Re-generate from current templates |
| `core` / `user_profile` empty | Print actionable message — no auto-fill |
| `memory_size` too large | Print actionable message — run `mindlink prune` |
| `session_fresh` stale | No auto-fix — AI must update SESSION.md |

---

## Examples

**Check memory health:**
```bash
mindlink verify
```

**Machine-readable output:**
```bash
mindlink verify --json
```

**Auto-fix missing agent files:**
```bash
mindlink verify --fix
```

---

## JSON Output

```json
{
  "ok": false,
  "checks": [
    { "id": "core",         "label": "Core section — filled",       "status": "pass", "message": "", "fixable": false },
    { "id": "user_profile", "label": "User Profile — filled",       "status": "pass", "message": "", "fixable": false },
    { "id": "session_fresh","label": "SESSION.md — last updated 5 days ago", "status": "warn", "message": "...", "fixable": false },
    { "id": "log_present",  "label": "LOG.md — 14 sessions logged", "status": "pass", "message": "", "fixable": false },
    { "id": "memory_size",  "label": "MEMORY.md — 217 lines (target: under 200)", "status": "fail", "message": "Run mindlink prune...", "fixable": false },
    { "id": "agent_files",  "label": "Agent files — all 2 present", "status": "pass", "message": "", "fixable": false }
  ]
}
```

---

## Related Commands

- [`mindlink prune`](prune.md) — retire stale MEMORY.md entries interactively
- [`mindlink doctor`](doctor.md) — check setup correctness (files, hooks, config)
- [`mindlink diff`](diff.md) — see what the AI wrote this session
