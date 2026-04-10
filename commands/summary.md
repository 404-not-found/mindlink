# brainlink summary

Show a full briefing of everything Brainlink knows about this project.

---

## Synopsis

```bash
brainlink summary [--json]
```

---

## Description

Reads all four `.brain/` files and surfaces everything in one view: project identity, architecture, decisions, current session state, what other sessions have shared, and recent history.

Your AI agent can run this itself — just tell it `brainlink summary` and it reads the output directly. This is the cleanest way to brief a mid-session agent without copying files around.

---

## Output

```
◉ Brainlink — Full Briefing

Project Overview
────────────────
A todo app built with Next.js and Postgres.

Current Session
───────────────
Task:       Build the login page
In progress: Auth form, JWT middleware
Blockers:    None
Up next:     Password reset flow

Shared Context
──────────────
Session A found: use Postgres over SQLite — better for concurrent writes.

Recent History (last 3 sessions)
─────────────────────────────────
[Apr 9] Scaffolded auth module. Decided: JWT over sessions.
[Apr 8] Set up database schema. Added migrations.
[Apr 7] Project started. Chose Next.js + Postgres stack.

Powered by Brainlink — github.com/404-not-found/brainlink
```

---

## Options

| Flag | Description |
|---|---|
| `--json` | Output as JSON with keys: `project`, `session`, `log`, `shared` |

---

## Examples

```bash
brainlink summary
brainlink summary --json
```

Ask your AI agent to run it:
```
Run brainlink summary and brief me on where we left off.
```

---

## Error: Not Initialized

```
✗  No .brain/ found in this directory.
   Run brainlink init to get started.
```

---

## Related Commands

- [`brainlink status`](status.md) — lighter-weight last-session view
- [`brainlink log`](log.md) — full session history
- [`brainlink init`](init.md) — set up memory for this project
