# PRODUCT.md — Brainlink Product Spec

> What we're building, who it's for, and why it matters.

---

## Problem

### Problem 1 — The Amnesia Problem (Core)

Every new AI coding session starts from zero. No memory of:
- What the project is and why it was built
- Why the architecture is the way it is
- What was finished last session and what comes next
- Bugs discovered, patterns agreed on, decisions locked in

Developers work around this today by manually writing `CLAUDE.md` files and pasting bootstrap prompts at the start of every session. It works but it's tedious, inconsistent, and breaks down across tools.

**This is the #1 pain.** Solve this first.

### Problem 2 — The Isolation Problem (Power Feature)

Two developers running an AI agent in the same codebase have completely isolated AI contexts. What one session learns, the other never sees. There is no shared AI awareness across a team.

---

## Solution

Brainlink creates a `.brain/` folder in your project that acts as a permanent, structured memory for any AI coding agent. Every session reads it on start and writes to it on end. Memory compounds over time instead of resetting.

**Tagline:** "Give your AI a permanent memory."

---

## Target Users

**Primary:** Solo developers using AI coding agents daily
- Already writing `CLAUDE.md` files manually — Brainlink automates and structures this
- Lose context every time they start a new session
- Want their agent to "just know" the project without re-explaining

**Secondary:** Dev teams using AI agents on shared codebases
- Want shared AI context across team members
- Want a git-trackable record of what the AI has been working on

---

## User Stories

### Story 1 — New session, zero re-explaining (Core)
> "As a solo dev, when I start a new Claude Code session, I want it to already know my project, my decisions, and what I was working on — without me pasting anything."

### Story 2 — Switching agents, same memory
> "As someone who uses both Claude Code and Cursor, I want both agents to read the same memory so switching tools doesn't lose my context."

### Story 3 — Team shared awareness (Power)
> "As a team of two, when my teammate's Claude Code session discovers something important, I want my session to see it too."

---

## Core User Flow

```
# One-time setup
npm install -g brainlink
cd my-project
brainlink init
→ Creates .brain/ with MEMORY.md, SESSION.md, SHARED.md, LOG.md
→ Creates CLAUDE.md (or appends to existing) with instruction to read .brain/

# Every session after that — automatic
Open Claude Code / Cursor / Codex
→ Agent reads .brain/MEMORY.md — knows the full project
→ Agent reads .brain/LOG.md — knows what happened last session
→ Agent works, updates .brain/SESSION.md as it goes
→ Session ends, agent appends to .brain/LOG.md

# Result
Every session wakes up fully informed.
No bootstrapping. No re-explaining. Memory compounds.
```

---

## v1 Scope (MVP)

**In scope:**
- `brainlink init` — scaffold `.brain/` with well-structured template files
- Agent instruction files — CLAUDE.md / CURSOR.md / AGENTS.md / GEMINI.md
- `brainlink status` — show last session summary
- `brainlink log` — print full session history
- `brainlink clear` — reset SESSION.md for a fresh start

**Out of scope for v1:**
- `brainlink sync` (concurrent session merging) — Problem 2, comes after Problem 1 is solid
- Cloud sync
- GUI / editor plugin
- Encryption

---

## Competitive Landscape

| Tool | Permanent memory | New session auto-loaded | Multi-session sync | Agent-agnostic | No infrastructure |
|---|---|---|---|---|---|
| Manual CLAUDE.md | Partial | ❌ manual | ❌ | ✅ | ✅ |
| Mem0 | ✅ | ✅ | ✅ | ❌ | ❌ needs cloud |
| Superpowers | Partial | Partial | ❌ | Partial | ✅ |
| **Brainlink** | ✅ | ✅ automatic | ✅ v2 | ✅ | ✅ |

**Our moats:**
1. **Zero infrastructure** — no account, no cloud, no API key. Just files.
2. **Cross-agent shared memory** — Claude Code, Cursor, Codex, Gemini, Copilot, Windsurf all read the same `.brain/` folder. No AI vendor can replicate this — they only know their own tool. A developer who uses multiple agents throughout the day has one consistent brain across all of them. This is unique to an agent-agnostic, file-based approach.

---

## Success Metrics (90 days post-launch)

| Metric | Target |
|---|---|
| GitHub stars | 500 |
| npm installs/week | 200 |
| Contributors | 5 |
| Agent integrations | 4 (Claude, Cursor, Codex, Gemini) |
