import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { BRAIN_DIR } from '../utils/paths.js';
import { extractSection } from '../utils/parser.js';
import { replaceSection } from '../utils/content.js';
import { runChecks } from './verify.js';
import { VERSION } from '../utils/version.js';

// ── Project resolution ────────────────────────────────────────────────────────

/**
 * Resolve the project root by:
 * 1. MINDLINK_PROJECT_PATH env var (set by Claude Code)
 * 2. cwd walk-up looking for .brain/
 */
function resolveProjectPath(): string | null {
  const envPath = process.env.MINDLINK_PROJECT_PATH;
  if (envPath && existsSync(join(envPath, BRAIN_DIR))) return envPath;

  let current = resolve(process.cwd());
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, BRAIN_DIR))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

// ── Memory section helpers ────────────────────────────────────────────────────

const VALID_SECTIONS = ['Core', 'Architecture', 'Decisions', 'Conventions', 'User Profile', 'Important Context'] as const;
type Section = typeof VALID_SECTIONS[number];

function readMemorySection(memoryPath: string, section?: string): string {
  const content = readFileSync(memoryPath, 'utf8');
  if (!section) {
    // Default: Core + User Profile
    const core = extractSection(content, 'Core');
    const profile = extractSection(content, 'User Profile');
    return `## Core\n\n${core}\n\n## User Profile\n\n${profile}`.trim();
  }
  return extractSection(content, section);
}

function appendToSection(memoryPath: string, section: string, newContent: string): void {
  let content = readFileSync(memoryPath, 'utf8');
  const sectionBody = extractSection(content, section);

  // Find where section ends and insert before the next heading
  const lines = content.split('\n');
  let headingIdx = -1;
  let nextSectionIdx = lines.length;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].replace(/<!--.*?-->/g, '').trim();
      if (headingIdx < 0 && title.toLowerCase() === section.toLowerCase()) {
        headingIdx = i;
        headingLevel = level;
      } else if (headingIdx >= 0 && level <= headingLevel) {
        nextSectionIdx = i;
        break;
      }
    }
  }

  if (headingIdx < 0) {
    // Section doesn't exist — create it at end of file
    content = content.trimEnd() + `\n\n## ${section}\n\n${newContent.trim()}\n`;
  } else {
    // Insert before next section (or end of file), after existing content
    const insertAt = nextSectionIdx > 0 && lines[nextSectionIdx - 1].trim() === '---'
      ? nextSectionIdx - 1
      : nextSectionIdx;
    lines.splice(insertAt, 0, '', newContent.trim(), '');
    content = lines.join('\n');
  }

  writeFileSync(memoryPath, content);
  void sectionBody; // suppress unused warning
}

// ── MCP server ────────────────────────────────────────────────────────────────

export const mcpCommand = new Command('mcp')
  .description('Start the MindLink MCP server (stdio transport for AI tool integration)')
  .addHelpText('after', `
The MCP server runs as a local process launched by Claude Code.
It exposes 4 tools for auditable, schema-validated memory reads and writes.

Tools:
  mindlink_read_memory(section?)   — read a section of MEMORY.md
  mindlink_write_memory(section, content) — append to a MEMORY.md section
  mindlink_session_update(summary) — overwrite SESSION.md
  mindlink_verify()                — run health check, return JSON

Configure in .claude/settings.json (done automatically by mindlink init):
  { "mcpServers": { "mindlink": { "command": "mindlink", "args": ["mcp"] } } }

Examples:
  mindlink mcp    # (launched by Claude Code, not by hand)
  `)
  .action(async () => {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { z } = await import('zod');

    const server = new McpServer({ name: 'mindlink', version: VERSION });

    // ── Tool 1: mindlink_read_memory ─────────────────────────────────────────

    server.tool(
      'mindlink_read_memory',
      'Read a section of this project\'s MEMORY.md. If section is omitted, returns Core + User Profile only.',
      {
        section: z.enum(['Core', 'Architecture', 'Decisions', 'Conventions', 'User Profile', 'Important Context'])
          .optional()
          .describe('Section to read. Omit for Core + User Profile (recommended default).'),
      },
      async ({ section }) => {
        const projectPath = resolveProjectPath();
        if (!projectPath) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No MindLink project found at this path. Run mindlink init first.' }],
            isError: true,
          };
        }
        const memoryPath = join(projectPath, BRAIN_DIR, 'MEMORY.md');
        if (!existsSync(memoryPath)) {
          return {
            content: [{ type: 'text' as const, text: 'Error: MEMORY.md not found. Run mindlink init to create it.' }],
            isError: true,
          };
        }
        try {
          const content = readMemorySection(memoryPath, section);
          return { content: [{ type: 'text' as const, text: content || '(section is empty)' }] };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Error reading MEMORY.md: ${err instanceof Error ? err.message : err}` }],
            isError: true,
          };
        }
      }
    );

    // ── Tool 2: mindlink_write_memory ────────────────────────────────────────

    server.tool(
      'mindlink_write_memory',
      'Append a fact or decision to a section of MEMORY.md. Never overwrites existing content. Always include a <!-- added: YYYY-MM-DD --> timestamp.',
      {
        section: z.enum(['Core', 'Architecture', 'Decisions', 'Conventions', 'User Profile', 'Important Context'])
          .describe('Section to append to.'),
        content: z.string()
          .describe('The markdown content to append. Include <!-- added: YYYY-MM-DD --> timestamp.'),
      },
      async ({ section, content }) => {
        const projectPath = resolveProjectPath();
        if (!projectPath) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No MindLink project found. Run mindlink init first.' }],
            isError: true,
          };
        }
        const memoryPath = join(projectPath, BRAIN_DIR, 'MEMORY.md');
        if (!existsSync(memoryPath)) {
          return {
            content: [{ type: 'text' as const, text: 'Error: MEMORY.md not found. Run mindlink init to create it.' }],
            isError: true,
          };
        }
        try {
          appendToSection(memoryPath, section, content);
          return { content: [{ type: 'text' as const, text: `✓ Appended to ## ${section} in MEMORY.md.` }] };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Error writing MEMORY.md: ${err instanceof Error ? err.message : err}` }],
            isError: true,
          };
        }
      }
    );

    // ── Tool 3: mindlink_session_update ──────────────────────────────────────

    server.tool(
      'mindlink_session_update',
      'Update SESSION.md with the current session summary. Call this as the last action of every response.',
      {
        summary: z.string()
          .describe('Current task state — what was asked, what you answered, any decisions made, what\'s next.'),
      },
      async ({ summary }) => {
        const projectPath = resolveProjectPath();
        if (!projectPath) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No MindLink project found. Run mindlink init first.' }],
            isError: true,
          };
        }
        const sessionPath = join(projectPath, BRAIN_DIR, 'SESSION.md');
        try {
          const date = new Date().toISOString().slice(0, 10);
          const content = `# Session State\n\n<!-- Last updated: ${date} -->\n\n${summary.trim()}\n`;
          writeFileSync(sessionPath, content);
          return { content: [{ type: 'text' as const, text: '✓ SESSION.md updated.' }] };
        } catch (err) {
          return {
            content: [{ type: 'text' as const, text: `Error writing SESSION.md: ${err instanceof Error ? err.message : err}` }],
            isError: true,
          };
        }
      }
    );

    // ── Tool 4: mindlink_verify ───────────────────────────────────────────────

    server.tool(
      'mindlink_verify',
      'Run a health check on .brain/. Returns pass/warn/fail status for each check. Call this to verify your memory writes succeeded.',
      {},
      async () => {
        const projectPath = resolveProjectPath();
        if (!projectPath) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: 'No MindLink project found. Run mindlink init first.' }) }],
            isError: true,
          };
        }
        const checks = runChecks(projectPath);
        const ok = checks.every(c => c.status === 'pass');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ ok, checks }, null, 2) }],
        };
      }
    );

    // ── Connect ────────────────────────────────────────────────────────────────

    const transport = new StdioServerTransport();
    await server.connect(transport);
  });
