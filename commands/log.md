# mindlink log

View full session history.

---

## Synopsis

```bash
mindlink log [--all] [--limit <n>] [--since <date>] [--json]
```

---

## Description

Prints the contents of `.brain/LOG.md` in a readable format. Shows the last 10 sessions by default. Each entry is a summary of what was done in that session, appended automatically by your AI agent at the end of each session.

---

## Options

| Flag | Description |
|---|---|
| `--all` | Show the full history instead of the last 10 sessions |
| `--limit <n>` | Show the last N sessions (default: 10) |
| `--since <date>` | Show sessions from a specific date forward |
| `--json` | Output as JSON for scripting or tool integration |

---

## Examples

```bash
mindlink log                     # last 10 sessions
mindlink log --all               # full history
mindlink log --limit 20          # last 20 sessions
mindlink log --since "Apr 1"     # sessions from April 1 onward
mindlink log --json              # machine-readable output
```

---

## Output

```
Showing last 10 sessions  ·  mindlink log --all to see everything

── Apr 9, 2026 ──────────────────────────────────
Scaffolded auth module, fixed login redirect bug,
decided on JWT over sessions.

── Apr 8, 2026 ──────────────────────────────────
Set up project structure, defined DB schema,
decided on Postgres over MySQL.

...8 more sessions
```

---

## Related Commands

- [`mindlink status`](status.md) — quick summary of the last session only
- [`mindlink clear`](clear.md) — reset current session state
