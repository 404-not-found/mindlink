# brainlink update

Update brainlink to the latest version.

**Run in your terminal only** — this downloads and installs software. Always prompts before doing anything.

---

## Synopsis

```bash
brainlink update
```

---

## Description

Checks the latest version on [GitHub Releases](https://github.com/404-not-found/brainlink/releases) and prompts before installing. Never updates silently — you are always shown what version you're moving to and can cancel.

Release notes for every version are available at:
```
https://github.com/404-not-found/brainlink/releases
```

---

## Examples

```bash
brainlink update
```

---

## Output

**Update available:**
```
Current version   : 1.0.0
Latest version    : 1.2.0

❯ Update to 1.2.0
  Skip this version
  Cancel

[████████████████████] 100%

✓  Updated to 1.2.0
   See what's new: github.com/404-not-found/brainlink/releases/tag/v1.2.0
```

**Already up to date:**
```
✓  You're on the latest version (1.0.0).
```

---

## Related Commands

- [`brainlink help`](index.md) — see all commands
