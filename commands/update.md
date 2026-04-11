# mindlink update

Update mindlink to the latest version.

**Run in your terminal only** — this downloads and installs software. Always prompts before doing anything.

---

## Synopsis

```bash
mindlink update
```

---

## Description

Checks the latest version on [GitHub Releases](https://github.com/404-not-found/mindlink/releases) and prompts before installing. Never updates silently — you are always shown what version you're moving to and can cancel.

Release notes for every version are available at:
```
https://github.com/404-not-found/mindlink/releases
```

---

## Examples

```bash
mindlink update
```

---

## Output

**Update available:**
```
Current version   : 1.0.5
Latest version    : 1.2.0

❯ Update to 1.2.0
  Skip this version
  Cancel

[████████████████████] 100%

✓  Updated to 1.2.0
   See what's new: github.com/404-not-found/mindlink/releases/tag/v1.2.0
```

**Already up to date:**
```
✓  You're on the latest version (1.0.5).
```

---

## Related Commands

- [`mindlink help`](index.md) — see all commands
