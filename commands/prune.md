# mindlink prune

Review and retire stale MEMORY.md entries interactively.

---

## Synopsis

```bash
mindlink prune [--dry-run] [--all]
```

---

## Description

MEMORY.md entries accumulate over time. A decision made six months ago that was later reversed, a "current focus" entry that describes work completed three months ago — these entries linger and degrade the quality of your AI's context.

`mindlink prune` surfaces entries by age and lets you decide what to do with each one. Entries can be kept, moved to an `## Archive` section, or permanently deleted.

**MindLink never auto-deletes content.** Archived entries are moved to `## Archive` at the bottom of MEMORY.md — they are always kept for reference unless you explicitly delete them.

Entries are identified by `<!-- added: YYYY-MM-DD -->` timestamps, which your AI appends to every new entry it writes.

---

## Staleness Thresholds

| Section | Warn after |
|---|---|
| `## Current Focus` | 14 days |
| `## Decisions` | 180 days |
| `## Conventions` | 180 days |
| `## Architecture` | 365 days |
| `## User Profile` | Never |
| `## Important Context` | Never |

Entries without a timestamp are not flagged (no reference date to compare against).

---

## Interactive Flow

```
  ◉ MindLink Prune
  /Users/you/my-project/.brain/MEMORY.md

  Scanning MEMORY.md for stale entries...
  Found 2 entries to review.

  ───────────────────────────────────────────────────────
  Section: Current Focus
  Entry:
    Building billing integration in src/api/billing.ts
  Added: 2026-01-15 (87 days ago) — threshold: 14 days

  ❯ Keep     (leave as-is)
    Archive  (move to ## Archive section)
    Delete   (remove permanently)
    Skip remaining

  ───────────────────────────────────────────────────────

  ✓  1 entry archived
  ·  1 entry kept
  ✓  MEMORY.md updated.
```

---

## Options

| Flag | Description |
|---|---|
| `--dry-run` | Show what would be flagged without making any changes |
| `--all` | Show all timestamped entries regardless of age |

---

## Archive Section

Archived entries are appended to `## Archive` at the bottom of MEMORY.md:

```markdown
## Archive

<!-- Entries moved here by mindlink prune — kept for reference -->

Building billing integration in src/api/billing.ts <!-- added: 2026-01-15 --> <!-- archived: 2026-04-13 -->
```

---

## Examples

**Interactive review of stale entries:**
```bash
mindlink prune
```

**See what would be flagged without changing anything:**
```bash
mindlink prune --dry-run
```

**Review all timestamped entries (not just stale ones):**
```bash
mindlink prune --all
```

---

## Related Commands

- [`mindlink verify`](verify.md) — check if MEMORY.md is getting too large
- [`mindlink diff`](diff.md) — see what the AI wrote this session
- [`mindlink summary`](summary.md) — view full contents of all `.brain/` files
