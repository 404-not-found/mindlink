# brainlink status

Show last session summary and what's next.

---

## Synopsis

```bash
brainlink status [--json]
```

---

## Description

Reads `.brain/SESSION.md` and `.brain/LOG.md` and surfaces the most relevant context from your last session: what was completed, what's coming up next, and basic memory stats.

Useful at the start of a session to quickly orient yourself before opening an AI agent.

---

## Output

```
Last session — Apr 9, 2026

Completed
✓  Scaffolded auth module
✓  Fixed login redirect bug
✓  Decided: use JWT, not sessions

Up next
→  Write tests for auth middleware
→  Hook up password reset flow

Memory stats
   Sessions logged : 4
   Decisions made  : 7
   Last updated    : 2 hours ago

Run brainlink log to see full history.
```

---

## Options

| Flag | Description |
|---|---|
| `--json` | Output as JSON for scripting or tool integration |

---

## Examples

```bash
brainlink status
brainlink status --json
```

---

## Error: Not Initialized

```
✗  No .brain/ found in this directory.
   Run brainlink init to get started.
```

---

## Related Commands

- [`brainlink log`](log.md) — view full session history
- [`brainlink init`](init.md) — set up memory for this project
