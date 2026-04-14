# mindlink profile

Manage your global user profile — imported into every new project automatically.

---

## Synopsis

```bash
mindlink profile [--show] [--path]
```

---

## Description

Your global user profile lives at `~/.mindlink/USER.md`. It stores personal facts about you — role, experience, preferences, communication style — that are true regardless of which project you're working in.

When you run `mindlink init` on a new project, your profile is automatically imported into the `## User Profile` section of `.brain/MEMORY.md`. Your AI starts the first session already knowing who you are.

When you run `mindlink update`, the profile is synced to all registered projects — any changes you make are propagated everywhere.

---

## Commands

**Open profile in your `$EDITOR`:**
```bash
mindlink profile
```

**Print profile to stdout:**
```bash
mindlink profile --show
```

**Print profile file path:**
```bash
mindlink profile --path
```

---

## Profile Format

```markdown
# MindLink — Global User Profile

> This file is imported into every new project's MEMORY.md on `mindlink init`.
> Edit it with `mindlink profile`. Run `mindlink update` to sync changes to all projects.

Senior full-stack engineer, 8 years. Primary: TypeScript, Python.
Prefers functional patterns, minimal abstraction.
Direct communication — skip preamble, lead with the answer.
macOS + zsh. Editor: VS Code + Claude Code.
<!-- added: 2026-04-13 -->
```

Write anything your AI should know about you in plain Markdown. The more specific, the better — role, experience level, communication preferences, tools, and how you like problems explained.

---

## How It Works

1. **On `mindlink init`:** if `~/.mindlink/USER.md` exists with real content, it is injected into the `## User Profile` section of the new project's `MEMORY.md`.
2. **On `mindlink update`:** the current profile replaces the `## User Profile` section in all registered projects — keeping them in sync as your profile evolves.

---

## Options

| Flag | Description |
|---|---|
| `--show` | Print current profile to stdout instead of opening editor |
| `--path` | Print `~/.mindlink/USER.md` path only (for scripting) |

---

## Examples

**Set up your profile for the first time:**
```bash
mindlink profile
# Opens $EDITOR (nano, vim, code, etc.) — write your facts, save and exit
```

**Sync changes to all registered projects:**
```bash
mindlink profile       # edit and save
mindlink update        # propagate to all projects
```

**Read profile in a script:**
```bash
cat "$(mindlink profile --path)"
```

---

## Related Commands

- [`mindlink update`](update.md) — sync profile (and agent files) to all registered projects
- [`mindlink verify`](verify.md) — check that User Profile is filled in across projects
- [`mindlink init`](init.md) — sets up memory for a new project (imports profile)
