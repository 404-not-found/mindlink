# Conventions

## Brainlink — Persistent Memory

This project uses Brainlink (https://github.com/404-not-found/brainlink) for persistent AI memory.

MANDATORY — At the start of every session:
Read these files in order before doing anything else:
1. .brain/MEMORY.md — project identity, architecture, key decisions
2. .brain/LOG.md — what happened in past sessions (last 5 entries only)
3. .brain/SESSION.md — current task state; pick up here if mid-task
4. .brain/SHARED.md — context shared by concurrent sessions
Do not respond until you have read all four files.

MANDATORY — After every context compaction:
Re-read immediately:
1. .brain/MEMORY.md — restores project identity and all decisions
2. .brain/SESSION.md — restores current task state and what's next
Do not continue working after a compact without re-reading these two files.

If uncertain mid-session:
Re-read .brain/MEMORY.md and .brain/SESSION.md before responding.


When asked about other sessions or concurrent developers:
`.brain/SHARED.md` and `.brain/LOG.md` exist for cross-session awareness.
- Concurrent sessions (right now): Read `.brain/SHARED.md` — other sessions write discoveries here for you to see.
- Past sessions: Read `.brain/LOG.md` — complete history of every session ever run in this project.
- Current state: Run `brainlink status`.
If the user asks "what is the other session doing?" or "do you know what happened before?" — answer using these files.

During the session:
- Keep .brain/SESSION.md updated: current task, progress, decisions, blockers, what's next
- Write important discoveries to .brain/SHARED.md so other sessions benefit

At the end of the session:
1. Append a summary to .brain/LOG.md — date, completed, decisions, what's next
2. Update .brain/MEMORY.md with new permanent decisions
3. Update .brain/SESSION.md — set "Up Next" for the following session
