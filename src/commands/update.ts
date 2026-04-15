import { Command } from 'commander';
import { select, isCancel, cancel, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR, BRAIN_TEMPLATES_DIR, BRAIN_DIR, GLOBAL_USER_PROFILE_PATH, GLOBAL_WINDSURF_MCP_PATH, GLOBAL_CLINE_MCP_PATH } from '../utils/paths.js';
import { replaceSection } from '../utils/content.js';
import { AGENTS } from '../utils/agents.js';
import { getRegisteredProjects, pruneRegistry } from '../utils/registry.js';
import { VERSION } from '../utils/version.js';

// Brain files that must exist in every initialized project.
// If a future version adds a new brain file, add it here — update will create it for existing projects.
const REQUIRED_BRAIN_FILES = ['MEMORY.md', 'SESSION.md', 'SHARED.md', 'LOG.md'];

async function latestVersion(): Promise<string | null> {
  try {
    const { default: https } = await import('https');
    return new Promise((resolve) => {
      const req = https.get(
        'https://registry.npmjs.org/mindlink/latest',
        { headers: { 'User-Agent': 'mindlink-cli' } },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.version ?? null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
  } catch {
    return null;
  }
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

export const updateCommand = new Command('update')
  .description('Update mindlink to the latest version')
  .addHelpText('after', `
Examples:
  mindlink update
  `)
  .action(async () => {
    const current = VERSION;

    // Deferred exit code for non-TTY mode — set here, applied after agent refresh below
    let nonTtyExitCode: number | null = null;

    if (!process.stdin.isTTY) {
      // Non-TTY: check version and report JSON, then fall through to agent refresh below
      const latest = await latestVersion();
      if (!latest) {
        console.log(JSON.stringify({ current, latest: null, upToDate: null }));
        nonTtyExitCode = 1; // registry unreachable — still refresh agents
      } else {
        const upToDate = !semverGt(latest, current);
        console.log(JSON.stringify({ current, latest, upToDate }));
        if (!upToDate) nonTtyExitCode = 2; // exit 2 = update available
      }
      // fall through to refresh agent files
    } else {
      // TTY: interactive version check + optional install
      const s = spinner();
      s.start('Checking for updates...');

      const latest = await latestVersion();

      if (!latest) {
        s.stop('Could not reach npm registry.');
        console.log('');
        console.log(`  ${chalk.red('✗')}  Could not check for updates. Check your internet connection.`);
        console.log(`     ${chalk.dim('Latest releases: github.com/404-not-found/mindlink/releases')}`);
        console.log('');
        process.exit(1);
      }

      s.stop('Done.');
      console.log('');
      console.log(`  Current version   : ${chalk.dim(current)}`);
      console.log(`  Latest version    : ${semverGt(latest, current) ? chalk.green(latest) : chalk.dim(latest)}`);
      console.log('');

      if (!semverGt(latest, current)) {
        console.log(`  ${chalk.green('✓')}  You're on the latest version (${current}).`);
        console.log('');
      } else {
        const action = await select({
          message: `Update to ${latest}?`,
          options: [
            { value: 'update', label: `Update to ${latest}` },
            { value: 'skip',   label: 'Skip this version' },
            { value: 'cancel', label: 'Cancel' },
          ],
        });

        if (isCancel(action) || action === 'cancel' || action === 'skip') {
          if (action === 'skip') {
            console.log(`  ${chalk.dim('Skipped. Run mindlink update again to install later.')}`);
          } else {
            cancel('Cancelled.');
          }
          console.log('');
          return;
        }

        // Install
        const s2 = spinner();
        s2.start(`Installing mindlink@${latest}...`);

        try {
          execSync(`npm install -g mindlink@${latest}`, { stdio: 'pipe' });
          s2.stop('Done.');
          console.log('');
          console.log(`  ${chalk.green('✓')}  Updated to ${latest}.`);
          console.log(`     ${chalk.dim('See what\'s new: github.com/404-not-found/mindlink/releases')}`);
        } catch (err: unknown) {
          s2.stop('Failed.');
          console.log('');
          console.log(`  ${chalk.red('✗')}  Update failed.`);
          console.log(`     ${chalk.dim('Try: npm install -g mindlink@' + latest)}`);
          if (err instanceof Error && err.message.includes('EACCES')) {
            console.log(`     ${chalk.dim('Permission error — try: sudo npm install -g mindlink@' + latest)}`);
          }
          process.exit(1);
        }
      }
    }

    // Always refresh agent instruction files across all registered projects
    // Also include cwd if it has .brain/ — catches projects not in the registry (e.g. initialized before registry existed)
    const cwd = process.cwd();
    const validProjects = getRegisteredProjects().filter(p => existsSync(join(p, BRAIN_DIR, 'config.json')));
    // Prune stale entries while we're here
    pruneRegistry(p => existsSync(join(p, BRAIN_DIR, 'config.json')));
    const cwdHasBrain = existsSync(join(cwd, BRAIN_DIR, 'config.json'));
    const projects = cwdHasBrain && !validProjects.includes(cwd)
      ? [cwd, ...validProjects]
      : validProjects;

    if (projects.length > 0) {
      console.log('');
      console.log(`  Refreshing agent files in ${projects.length} project${projects.length > 1 ? 's' : ''}...`);
      console.log('');
      for (const projectPath of projects) {
        const configPath = join(projectPath, BRAIN_DIR, 'config.json');
        let config: { agents?: string[] } = {};
        try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}

        const agentValues: string[] = config.agents ?? AGENTS.filter(a => a.selected).map(a => a.value);
        const refreshed: string[] = [];

        // Ensure all required brain files exist (forward compat: creates new files added in future versions)
        for (const brainFile of REQUIRED_BRAIN_FILES) {
          const dest = join(projectPath, BRAIN_DIR, brainFile);
          if (!existsSync(dest)) {
            try {
              const template = join(BRAIN_TEMPLATES_DIR, brainFile);
              if (existsSync(template)) {
                writeFileSync(dest, readFileSync(template, 'utf8'));
                refreshed.push(`.brain/${brainFile}`);
              }
            } catch {}
          }
        }

        for (const agentValue of agentValues) {
          const agent = AGENTS.find(a => a.value === agentValue);
          if (!agent) continue;
          const destPath = join(projectPath, agent.destFile);
          try {
            mkdirSync(dirname(destPath), { recursive: true });
            writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
            refreshed.push(agent.destFile);
          } catch {}
        }

        if (agentValues.includes('claude')) {
          // .claude/settings.json — hooks + permissions only (no mcpServers)
          const hookDest = join(projectPath, '.claude', 'settings.json');
          try {
            mkdirSync(join(projectPath, '.claude'), { recursive: true });
            const template = JSON.parse(readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
            let existing: Record<string, unknown> = {};
            if (existsSync(hookDest)) {
              try { existing = JSON.parse(readFileSync(hookDest, 'utf8')); } catch {}
            }
            // Remove stale mcpServers from settings.json (Claude Code CLI uses .mcp.json now)
            const { mcpServers: _removed, ...existingWithoutMcp } = existing as Record<string, unknown> & { mcpServers?: unknown };
            void _removed;
            const merged = {
              ...existingWithoutMcp,
              hooks: template.hooks,
              permissions: template.permissions,
            };
            writeFileSync(hookDest, JSON.stringify(merged, null, 2));
            refreshed.push('.claude/settings.json');
          } catch {}
          // .mcp.json — Claude Code CLI reads MCP servers from here
          const mcpJsonDest = join(projectPath, '.mcp.json');
          try {
            let existing: Record<string, unknown> = {};
            if (existsSync(mcpJsonDest)) {
              try { existing = JSON.parse(readFileSync(mcpJsonDest, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              mcpServers: {
                ...(typeof existing.mcpServers === 'object' && existing.mcpServers !== null ? existing.mcpServers as Record<string, unknown> : {}),
                mindlink: { type: 'stdio', command: 'mindlink', args: ['mcp'], env: { MINDLINK_PROJECT_PATH: projectPath } },
              },
            };
            writeFileSync(mcpJsonDest, JSON.stringify(merged, null, 2));
            refreshed.push('.mcp.json');
          } catch {}
        }

        // Cursor: refresh .cursor/mcp.json (merge — preserve user's other servers, type: stdio required)
        if (agentValues.includes('cursor')) {
          const cursorMcpDest = join(projectPath, '.cursor', 'mcp.json');
          try {
            mkdirSync(join(projectPath, '.cursor'), { recursive: true });
            let existing: Record<string, unknown> = {};
            if (existsSync(cursorMcpDest)) {
              try { existing = JSON.parse(readFileSync(cursorMcpDest, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              mcpServers: {
                ...(typeof existing.mcpServers === 'object' && existing.mcpServers !== null ? existing.mcpServers as Record<string, unknown> : {}),
                mindlink: { type: 'stdio', command: 'mindlink', args: ['mcp'], env: { MINDLINK_PROJECT_PATH: projectPath } },
              },
            };
            writeFileSync(cursorMcpDest, JSON.stringify(merged, null, 2));
            refreshed.push('.cursor/mcp.json');
          } catch {}
        }

        // Continue.dev: refresh .continue/mcpServers/mindlink.json
        if (agentValues.includes('continue')) {
          const continueMcpDest = join(projectPath, '.continue', 'mcpServers', 'mindlink.json');
          try {
            mkdirSync(join(projectPath, '.continue', 'mcpServers'), { recursive: true });
            const continueMcp = { mcpServers: { mindlink: { command: 'mindlink', args: ['mcp'], env: { MINDLINK_PROJECT_PATH: projectPath } } } };
            writeFileSync(continueMcpDest, JSON.stringify(continueMcp, null, 2));
            refreshed.push('.continue/mcpServers/mindlink.json');
          } catch {}
        }

        // GitHub Copilot: refresh .vscode/mcp.json (VS Code uses "servers" key, not "mcpServers")
        if (agentValues.includes('copilot')) {
          const copilotMcpDest = join(projectPath, '.vscode', 'mcp.json');
          try {
            mkdirSync(join(projectPath, '.vscode'), { recursive: true });
            let existing: Record<string, unknown> = {};
            if (existsSync(copilotMcpDest)) {
              try { existing = JSON.parse(readFileSync(copilotMcpDest, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              servers: {
                ...(typeof existing.servers === 'object' && existing.servers !== null ? existing.servers as Record<string, unknown> : {}),
                mindlink: { command: 'mindlink', args: ['mcp'], env: { MINDLINK_PROJECT_PATH: projectPath } },
              },
            };
            writeFileSync(copilotMcpDest, JSON.stringify(merged, null, 2));
            refreshed.push('.vscode/mcp.json');
          } catch {}
        }

        // Kiro: refresh .kiro/settings/mcp.json (merge — preserve user's other servers)
        if (agentValues.includes('kiro')) {
          const kiroMcpDest = join(projectPath, '.kiro', 'settings', 'mcp.json');
          try {
            mkdirSync(join(projectPath, '.kiro', 'settings'), { recursive: true });
            let existing: Record<string, unknown> = {};
            if (existsSync(kiroMcpDest)) {
              try { existing = JSON.parse(readFileSync(kiroMcpDest, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              mcpServers: {
                ...(typeof existing.mcpServers === 'object' && existing.mcpServers !== null ? existing.mcpServers as Record<string, unknown> : {}),
                mindlink: { command: 'mindlink', args: ['mcp'], env: { MINDLINK_PROJECT_PATH: projectPath } },
              },
            };
            writeFileSync(kiroMcpDest, JSON.stringify(merged, null, 2));
            refreshed.push('.kiro/settings/mcp.json');
          } catch {}
        }

        // Windsurf: refresh ~/.codeium/windsurf/mcp_config.json (global, no project path)
        if (agentValues.includes('windsurf')) {
          try {
            mkdirSync(dirname(GLOBAL_WINDSURF_MCP_PATH), { recursive: true });
            let existing: Record<string, unknown> = {};
            if (existsSync(GLOBAL_WINDSURF_MCP_PATH)) {
              try { existing = JSON.parse(readFileSync(GLOBAL_WINDSURF_MCP_PATH, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              mcpServers: {
                ...(typeof existing.mcpServers === 'object' && existing.mcpServers !== null ? existing.mcpServers as Record<string, unknown> : {}),
                mindlink: { command: 'mindlink', args: ['mcp'] },
              },
            };
            writeFileSync(GLOBAL_WINDSURF_MCP_PATH, JSON.stringify(merged, null, 2));
            refreshed.push('~/.codeium/windsurf/mcp_config.json');
          } catch {}
        }

        // Cline: refresh ~/.cline/data/settings/cline_mcp_settings.json (global, alwaysAllow pre-auth)
        if (agentValues.includes('cline')) {
          try {
            mkdirSync(dirname(GLOBAL_CLINE_MCP_PATH), { recursive: true });
            let existing: Record<string, unknown> = {};
            if (existsSync(GLOBAL_CLINE_MCP_PATH)) {
              try { existing = JSON.parse(readFileSync(GLOBAL_CLINE_MCP_PATH, 'utf8')); } catch {}
            }
            const merged = {
              ...existing,
              mcpServers: {
                ...(typeof existing.mcpServers === 'object' && existing.mcpServers !== null ? existing.mcpServers as Record<string, unknown> : {}),
                mindlink: {
                  command: 'mindlink',
                  args: ['mcp'],
                  alwaysAllow: ['mindlink_read_memory', 'mindlink_write_memory', 'mindlink_session_update', 'mindlink_verify'],
                },
              },
            };
            writeFileSync(GLOBAL_CLINE_MCP_PATH, JSON.stringify(merged, null, 2));
            refreshed.push('~/.cline/data/settings/cline_mcp_settings.json');
          } catch {}
        }

        // Apply MEMORY.md migrations — non-destructively inject any new sections added in this version
        const memoryPath = join(projectPath, BRAIN_DIR, 'MEMORY.md');
        if (existsSync(memoryPath)) {
          try {
            let content = readFileSync(memoryPath, 'utf8');
            let memoryChanged = false;

            // Each migration: { marker: string to check for presence, inject: content to add, before: anchor string }
            // Applied in order — all are non-destructive (only run if marker is absent)
            const migrations: Array<{ marker: string; block: string; before: string }> = [
              {
                // v1.1.5: Add ## User Profile section
                marker: '## User Profile',
                block:
                  `## User Profile  <!-- READ EVERY SESSION — personal facts about the user -->\n\n` +
                  `<!-- Job, company, level, years of experience, immigration status -->\n` +
                  `<!-- Age, health, physical details -->\n` +
                  `<!-- Family, relationships, major life events -->\n` +
                  `<!-- Long-term goals: career, financial, personal -->\n` +
                  `<!-- Strong opinions, values, preferences -->\n` +
                  `<!-- Update in place — do not append; consolidate when it grows -->\n\n\n` +
                  `---\n\n`,
                before: '## Important Context',
              },
              // Future migrations go here — same pattern:
              // { marker: '## New Section', block: '## New Section\n\n<!-- ... -->\n\n\n---\n\n', before: '## Some Existing Section' },
            ];

            for (const m of migrations) {
              if (!content.includes(m.marker) && content.includes(m.before)) {
                content = content.replace(m.before, m.block + m.before);
                memoryChanged = true;
              }
            }

            if (memoryChanged) {
              writeFileSync(memoryPath, content);
              refreshed.push('.brain/MEMORY.md');
            }
          } catch {}
        }

        // Sync global user profile into User Profile section (if profile exists and has content)
        if (existsSync(GLOBAL_USER_PROFILE_PATH) && existsSync(memoryPath)) {
          try {
            const profileRaw = readFileSync(GLOBAL_USER_PROFILE_PATH, 'utf8');
            // Strip profile file header lines (# heading, > blockquotes, leading blank lines)
            const profileLines = profileRaw.split('\n');
            const bodyStart = profileLines.findIndex(l => {
              const t = l.trim();
              return t.length > 0 && !t.startsWith('#') && !t.startsWith('>') && !t.startsWith('<!--');
            });
            const profileBody = bodyStart >= 0 ? profileLines.slice(bodyStart).join('\n').trim() : '';
            if (profileBody) {
              const memContent = readFileSync(memoryPath, 'utf8');
              const updated = replaceSection(memContent, 'User Profile', profileBody);
              if (updated !== memContent) {
                writeFileSync(memoryPath, updated);
                if (!refreshed.includes('.brain/MEMORY.md')) refreshed.push('.brain/MEMORY.md (profile synced)');
              }
            }
          } catch {}
        }

        console.log(`  ${chalk.bold(projectPath)}`);
        for (const f of refreshed) {
          console.log(`    ${chalk.green('✓')}  ${f}`);
        }
      }
      console.log('');
      console.log(`  ${chalk.dim('All agent files are up to date.')}`);
    }

    console.log('');

    // Apply deferred exit code from non-TTY version check (after agent refresh ran)
    if (nonTtyExitCode !== null) process.exit(nonTtyExitCode);
  });
