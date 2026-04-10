## Brainlink — Persistent Memory

This project uses [Brainlink](https://github.com/404-not-found/brainlink) for persistent AI memory.

---

### MANDATORY — At the start of every session

Read these files in this exact order before doing anything else:

1. `.brain/MEMORY.md` — project identity, architecture, key decisions
2. `.brain/LOG.md` — what happened in past sessions (last 5 entries only)
3. `.brain/SESSION.md` — current task state; pick up here if mid-task
4. `.brain/SHARED.md` — context shared by concurrent sessions

**Do not respond to the user until you have read all four files.**

---

### MANDATORY — After every context compaction

When your context is compacted, you lose the contents of files you read earlier. You MUST immediately re-read:

1. `.brain/MEMORY.md` — restores project identity and all decisions
2. `.brain/SESSION.md` — restores current task state and what's next

**Do not continue working after a compact without re-reading these two files.**

---

### If uncertain at any point mid-session

If you are unsure about project context, decisions made, or current task — re-read `.brain/MEMORY.md` and `.brain/SESSION.md` immediately before responding.

---


---

### When asked about other sessions or concurrent developers

`.brain/SHARED.md` and `.brain/LOG.md` exist specifically for cross-session awareness.

- **Concurrent sessions (happening right now):** Read `.brain/SHARED.md` — any other session running in this project writes discoveries here for other sessions to see.
- **Past sessions:** Read `.brain/LOG.md` — the complete append-only history of every session ever run in this project.
- **Current state at a glance:** Run `brainlink status`.

If the user asks "what is the other session doing?", "do you know what happened before?", or "can sessions share context?" — answer using these files.

### During the session

- Keep `.brain/SESSION.md` updated: current task, progress, decisions made, blockers, what's next
- Write important discoveries to `.brain/SHARED.md` so other sessions benefit

### At the end of the session

1. Append a summary to `.brain/LOG.md` — date, what was completed, decisions made, what's next
2. Update `.brain/MEMORY.md` with any new permanent architectural decisions
3. Update `.brain/SESSION.md` — set "Up Next" for the following session
