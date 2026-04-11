import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';
import { extractSection, parseLogEntries, relativeTime } from '../utils/parser.js';

const CORE_LINE_LIMIT = 50;
const CORE_WARN_THRESHOLD = 40;

type CheckStatus = 'ok' | 'warn' | 'fail' | 'info';

interface Check {
  status: CheckStatus;
  label: string;
  detail?: string;
}

function ok(label: string, detail?: string): Check    { return { status: 'ok',   label, detail }; }
function warn(label: string, detail?: string): Check  { return { status: 'warn', label, detail }; }
function fail(label: string, detail?: string): Check  { return { status: 'fail', label, detail }; }
function info(label: string, detail?: string): Check  { return { status: 'info', label, detail }; }

function icon(status: CheckStatus): string {
  switch (status) {
    case 'ok':   return chalk.green('✓');
    case 'warn': return chalk.yellow('!');
    case 'fail': return chalk.red('✗');
    case 'info': return chalk.dim('·');
  }
}

export const doctorCommand = new Command('doctor')
  .description('Check that your MindLink setup is healthy')
  .addHelpText('after', `
What gets checked:
  .brain/        — exists and contains all expected files
  MEMORY.md      — Core has content; warns if Core is getting too long to reliably read
  SESSION.md     — has content (agent is updating it)
  LOG.md         — session count, how far back history goes, warns when oldest sessions near rotation
  Agent files    — instruction files exist per your config.json
  Hook           — .claude/settings.json exists (if Claude Code is configured)

Examples:
  mindlink doctor
  `)
  .action(() => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    console.log('');
    console.log(`  ${chalk.bold('◉ MindLink Doctor')}`);
    console.log(`  ${chalk.dim(projectPath)}`);
    console.log('');

    const checks: Check[] = [];
    let failCount = 0;
    let warnCount = 0;

    // ── 1. .brain/ exists ───────────────────────────────────────────────────
    if (!existsSync(brainDir)) {
      checks.push(fail('.brain/ missing', `Run ${chalk.cyan('mindlink init')} to get started.`));
      printChecks(checks);
      process.exit(1);
    }
    checks.push(ok('.brain/ found'));

    // ── 2. config.json ──────────────────────────────────────────────────────
    const configPath = join(brainDir, 'config.json');
    let config: { agents?: string[]; gitTracking?: boolean; autoSync?: boolean; maxLogEntries?: number } = {};
    if (!existsSync(configPath)) {
      checks.push(warn('config.json missing', `Run ${chalk.cyan('mindlink config')} to repair.`));
    } else {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
        checks.push(ok('config.json valid'));
      } catch {
        checks.push(warn('config.json unreadable', 'File may be corrupted — delete and re-run mindlink init.'));
      }
    }

    // ── 3. MEMORY.md ────────────────────────────────────────────────────────
    const memoryPath = join(brainDir, 'MEMORY.md');
    if (!existsSync(memoryPath)) {
      checks.push(fail('MEMORY.md missing', `Run ${chalk.cyan('mindlink init')} to recreate it.`));
    } else {
      const memoryMd = readFileSync(memoryPath, 'utf8');
      const coreSection = extractSection(memoryMd, 'Core');
      const coreLines = coreSection.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('<!--')).length;

      if (coreLines === 0) {
        checks.push(warn('MEMORY.md Core is empty', 'Your AI has no permanent facts yet. It will fill this in automatically at the start of the next session.'));
      } else if (coreLines >= CORE_LINE_LIMIT) {
        checks.push(warn(
          'MEMORY.md Core is getting too long',
          'Ask your AI to consolidate — Core is read every session start, so keep it tight.'
        ));
      } else if (coreLines >= CORE_WARN_THRESHOLD) {
        checks.push(warn(
          'MEMORY.md Core is getting long',
          'Consider asking your AI to consolidate — Core is read on every session start.'
        ));
      } else {
        checks.push(ok('MEMORY.md Core has content'));
      }
    }

    // ── 4. SESSION.md ───────────────────────────────────────────────────────
    const sessionPath = join(brainDir, 'SESSION.md');
    if (!existsSync(sessionPath)) {
      checks.push(fail('SESSION.md missing', `Run ${chalk.cyan('mindlink init')} to recreate it.`));
    } else {
      const sessionMd = readFileSync(sessionPath, 'utf8');
      const hasContent = sessionMd.split('\n').some(l => l.trim().length > 0 && !l.startsWith('<!--') && !l.startsWith('#'));
      const mtime = statSync(sessionPath).mtime;
      const age = relativeTime(mtime);

      if (!hasContent) {
        checks.push(warn('SESSION.md has no content yet', 'Start an AI session — it will fill this in automatically.'));
      } else {
        checks.push(ok(`SESSION.md — updated ${age}`));
      }
    }

    // ── 5. LOG.md ───────────────────────────────────────────────────────────
    const logPath = join(brainDir, 'LOG.md');
    if (!existsSync(logPath)) {
      checks.push(fail('LOG.md missing', `Run ${chalk.cyan('mindlink init')} to recreate it.`));
    } else {
      const logMd = readFileSync(logPath, 'utf8');
      const entries = parseLogEntries(logMd);
      const entryCount = entries.length;
      const maxEntries: number = (config as any).maxLogEntries ?? 50;

      if (entryCount === 0) {
        checks.push(info('LOG.md — no sessions yet, start your first AI session'));
      } else {
        // Newest entry = last in file (append order)
        const newestHeading = entries[entries.length - 1].heading;
        const oldestHeading = entries[0].heading;
        const remaining = maxEntries - entryCount;

        if (remaining <= 3 && remaining > 0) {
          checks.push(warn(
            `LOG.md — ${entryCount}/${maxEntries} sessions, ${remaining} until oldest start archiving`,
            `Oldest session on record: ${oldestHeading} — it will be archived soon. Important decisions belong in MEMORY.md where they never rotate out.`
          ));
        } else if (remaining <= 0) {
          checks.push(warn(
            `LOG.md — at ${maxEntries}-session limit, oldest are being archived`,
            `Oldest session on record: ${oldestHeading}. Anything important should be in MEMORY.md.`
          ));
        } else {
          checks.push(ok(`LOG.md — ${entryCount} sessions logged (last: ${newestHeading}, going back to: ${oldestHeading})`));
        }
      }

      // Archive files
      const archives = readdirSync(brainDir).filter(f => /^LOG-\d{4}-\d{2}\.md$/.test(f));
      if (archives.length > 0) {
        checks.push(info(`${archives.length} archive file${archives.length !== 1 ? 's' : ''} — old sessions are stored in LOG-*.md, not gone`));
      }
    }

    // ── 6. Agent instruction files ──────────────────────────────────────────
    const configuredAgents: string[] = config.agents ?? [];
    if (configuredAgents.length === 0) {
      checks.push(warn('No agents configured', `Run ${chalk.cyan('mindlink config')} → Agent instruction files.`));
    } else {
      for (const agentValue of configuredAgents) {
        const agent = AGENTS.find(a => a.value === agentValue);
        if (!agent) continue;
        const destPath = join(projectPath, agent.destFile);
        if (!existsSync(destPath)) {
          checks.push(fail(`${agent.destFile} missing`, `Run ${chalk.cyan('mindlink config')} → Agent instruction files to recreate.`));
        } else {
          checks.push(ok(`${agent.destFile} — ${agent.label}`));
        }
      }
    }

    // ── 7. Claude Code hook ──────────────────────────────────────────────────
    if (configuredAgents.includes('claude')) {
      const hookPath = join(projectPath, '.claude', 'settings.json');
      if (!existsSync(hookPath)) {
        checks.push(warn(
          '.claude/settings.json missing',
          `Claude Code won't auto-reload after context compaction. Run ${chalk.cyan('mindlink config')} → Agent instruction files to restore.`
        ));
      } else {
        try {
          const settings = JSON.parse(readFileSync(hookPath, 'utf8'));
          const hasHook = settings?.hooks?.UserPromptSubmit != null;
          if (!hasHook) {
            checks.push(warn('.claude/settings.json exists but MindLink hook not found', 'Hook may have been removed — check the file manually.'));
          } else {
            checks.push(ok('.claude/settings.json — UserPromptSubmit hook active'));
          }
        } catch {
          checks.push(warn('.claude/settings.json is not valid JSON', 'Fix or delete it to restore the hook.'));
        }
      }
    }

    // ── 8. Git tracking notice ───────────────────────────────────────────────
    if (config.gitTracking === false) {
      checks.push(info('.brain/ is excluded from git (personal memory only)'));
    } else if (config.gitTracking === true) {
      checks.push(info('.brain/ is committed to git (shared team memory)'));
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    for (const c of checks) {
      if (c.status === 'fail') failCount++;
      if (c.status === 'warn') warnCount++;
    }

    printChecks(checks);

    if (failCount > 0) {
      console.log(`  ${chalk.red.bold(`${failCount} problem${failCount !== 1 ? 's' : ''} found`)} — fix the issues above and re-run ${chalk.cyan('mindlink doctor')}.`);
    } else if (warnCount > 0) {
      console.log(`  ${chalk.yellow.bold(`${warnCount} warning${warnCount !== 1 ? 's' : ''}`)}, no critical issues. Your AI will still work.`);
    } else {
      console.log(`  ${chalk.green.bold('All good.')} Your AI has a healthy brain.`);
    }
    console.log('');

    if (failCount > 0) process.exit(1);
  });

function printChecks(checks: Check[]): void {
  for (const c of checks) {
    const prefix = `  ${icon(c.status)}  `;
    console.log(`${prefix}${c.label}`);
    if (c.detail) {
      console.log(`     ${chalk.dim(c.detail)}`);
    }
  }
  console.log('');
}
