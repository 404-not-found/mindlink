## Brainlink — Persistent Memory

This project uses [Brainlink](https://github.com/404-not-found/brainlink) for persistent AI memory.

At the start of every session, read these files in order:
1. `.brain/MEMORY.md` — project identity, architecture, key decisions
2. `.brain/LOG.md` — what happened in past sessions (last 5 entries)
3. `.brain/SESSION.md` — current task state; pick up here if mid-task
4. `.brain/SHARED.md` — context shared by concurrent sessions

During the session:
- Keep `.brain/SESSION.md` updated: current task, progress, decisions made, blockers, what's next
- Write important discoveries to `.brain/SHARED.md` so other sessions benefit

At the end of the session:
1. Append a summary to `.brain/LOG.md` — date, what was completed, decisions made, what's next
2. Update `.brain/MEMORY.md` with any new permanent architectural decisions
3. Update `.brain/SESSION.md` — set "Up Next" for the following session
