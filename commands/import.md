# brainlink import

Import a Brainlink memory zip into the current project.

**Run in your terminal.** Takes a `.zip` exported by `brainlink export` and extracts it into `.brain/`.

---

## Synopsis

```bash
brainlink import <file.zip> [--yes]
```

---

## Description

Extracts a zip created by `brainlink export` into the current project's `.brain/` folder. If `.brain/` already exists, you choose whether to merge (keep your current memory, add what's missing) or overwrite (replace everything with the imported version).

---

## Use Cases

**Onboard on a new machine**
```bash
# Copy the zip to the new machine, then:
brainlink import my-app-brain-2026-04-10.zip
# Your AI agent wakes up fully briefed on the first session
```

**Accept a colleague's memory**
```bash
brainlink import colleague-brain-2026-04-10.zip
# Choose Merge to keep your work and add what they know
```

**Restore from backup**
```bash
brainlink import ~/backups/my-app-brain-2026-04-01.zip --yes
```

---

## Options

| Flag | Description |
|---|---|
| `--yes`, `-y` | Skip confirmation, overwrite existing memory |

---

## Merge vs Overwrite

When `.brain/` already exists:

| Mode | What happens |
|---|---|
| **Merge** | Only imports files that don't exist locally. Your current memory is kept. |
| **Overwrite** | Replaces all `.brain/` files with the imported versions. |

---

## Output

```
  ✓  .brain/MEMORY.md
  ✓  .brain/SESSION.md
  ✓  .brain/SHARED.md
  ✓  .brain/LOG.md

  ✓  Memory imported. Your AI will wake up fully briefed.
```

---

## Related Commands

- [`brainlink export`](export.md) — create a zip to share or back up
- [`brainlink init`](init.md) — set up agent instruction files after importing
