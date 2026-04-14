# mindlink mcp

Start the MindLink MCP server for AI tool integration.

---

## Synopsis

```bash
mindlink mcp
```

---

## Description

`mindlink mcp` starts a local [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It exposes 4 tools that AI agents (like Claude Code) can call to read and write memory with schema validation and structured responses.

This command is **launched automatically** by Claude Code — you do not need to run it yourself. When you run `mindlink init` and select Claude Code, MindLink adds the MCP server entry to `.claude/settings.json` so Claude Code starts it on every session.

**Why MCP?**
- **Schema-validated writes** — the AI can't accidentally overwrite the wrong section
- **Structured reads** — returns only the sections needed for the current task (token-efficient)
- **Verify loop** — the AI can call `mindlink_verify()` after writing to confirm the write succeeded

---

## Tools

### `mindlink_read_memory(section?)`

Read a section of this project's `MEMORY.md`.

- **No argument**: returns Core + User Profile only (the recommended default at session start)
- **With section**: returns just that section

| Section value | Content |
|---|---|
| `Core` | Project identity, stack, top decisions |
| `Architecture` | System design decisions |
| `Decisions` | Key choices made and why |
| `Conventions` | Team patterns and coding standards |
| `User Profile` | Personal facts about the user |
| `Important Context` | Business context, deadlines, preferences |

---

### `mindlink_write_memory(section, content)`

Append a fact or decision to a section of `MEMORY.md`.

Never overwrites existing content — always appends. Always include a `<!-- added: YYYY-MM-DD -->` timestamp in the content.

---

### `mindlink_session_update(summary)`

Overwrite `SESSION.md` with a summary of the current session.

Call this as the **last action** of every response. SESSION.md is temporary; it gets cleared between sessions. MEMORY.md is permanent.

---

### `mindlink_verify()`

Run a health check on `.brain/`. Returns the same JSON as `mindlink verify --json`.

Use this after writing to confirm the write succeeded and memory is in good shape.

---

## Configuration

`mindlink init` (with Claude Code selected) writes this to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "mindlink": {
      "command": "mindlink",
      "args": ["mcp"],
      "env": {
        "MINDLINK_PROJECT_PATH": "/absolute/path/to/your/project"
      }
    }
  }
}
```

The `MINDLINK_PROJECT_PATH` env var tells the MCP server which project's `.brain/` to use. If not set, the server walks up from the working directory looking for a `.brain/` folder.

`mindlink update` refreshes this entry in all registered projects whenever you update MindLink.

---

## Project Resolution

The MCP server resolves the project root in this order:

1. `MINDLINK_PROJECT_PATH` environment variable (set by Claude Code via `settings.json`)
2. Walk up from the current working directory, looking for a `.brain/` folder (up to 10 levels)

If no project is found, all tool calls return an error with instructions to run `mindlink init`.

---

## Examples

**See all available tools:**
```bash
mindlink mcp --help
```

**Ask your AI to run a memory health check:**
> "Run mindlink_verify and tell me if anything needs attention."

**Ask your AI to read a specific section:**
> "Call mindlink_read_memory with section 'Decisions' and summarize what decisions we've made."

---

## Related Commands

- [`mindlink init`](init.md) — sets up `.brain/` and writes the MCP server entry
- [`mindlink update`](update.md) — refreshes the MCP entry in all registered projects
- [`mindlink verify`](verify.md) — same health checks, available as a CLI command
