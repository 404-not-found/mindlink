import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { join, resolve } from 'path';
import { BRAIN_DIR, AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';
import { sectionHasRealContent, countRealLines } from '../utils/content.js';

const SESSION_WARN_DAYS = 3;
const SESSION_FAIL_DAYS = 7;
const MEMORY_WARN_LINES = 100;
const MEMORY_FAIL_LINES = 200;

export interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixable: boolean;
}

function pass(id: string, label: string, message: string): CheckResult {
  return { id, label, status: 'pass', message, fixable: false };
}
function warn(id: string, label: string, message: string, fixable = false): CheckResult {
  return { id, label, status: 'warn', message, fixable };
}
function fail(id: string, label: string, message: string, fixable = false): CheckResult {
  return { id, label, status: 'fail', message, fixable };
}

function icon(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass': return chalk.green('✓');
    case 'warn': return chalk.yellow('⚠');
    case 'fail': return chalk.red('✗');
  }
}

export function runChecks(projectPath: string): CheckResult[] {
  const brainDir = join(projectPath, BRAIN_DIR);
  const results: CheckResult[] = [];

  if (!existsSync(brainDir)) {
    results.push(fail('brain_missing', '.brain/ missing', `Run ${chalk.cyan('mindlink init')} to set up memory.`));
    return results;
  }

  // ── config ──────────────────────────────────────────────────────────────────
  const configPath = join(brainDir, 'config.json');
  let config: { agents?: string[] } = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}
  }

  // ── 1. core ──────────────────────────────────────────────────────────────────
  const memoryPath = join(brainDir, 'MEMORY.md');
  if (!existsSync(memoryPath)) {
    results.push(fail('core', 'Core section', `MEMORY.md is missing — run ${chalk.cyan('mindlink init')}.`));
  } else {
    const memMd = readFileSync(memoryPath, 'utf8');
    if (!sectionHasRealContent(memMd, 'Core')) {
      results.push(fail('core', 'Core section — empty', 'Start a session and tell your AI to fill in the Core section.'));
    } else {
      results.push(pass('core', 'Core section — filled', ''));
    }
  }

  // ── 2. user_profile ──────────────────────────────────────────────────────────
  if (existsSync(memoryPath)) {
    const memMd = readFileSync(memoryPath, 'utf8');
    if (!sectionHasRealContent(memMd, 'User Profile')) {
      results.push(fail('user_profile', 'User Profile — empty', `Run ${chalk.cyan('mindlink profile')} to set up your global profile and import it here.`));
    } else {
      results.push(pass('user_profile', 'User Profile — filled', ''));
    }
  }

  // ── 3. session_fresh ────────────────────────────────────────────────────────
  const sessionPath = join(brainDir, 'SESSION.md');
  if (!existsSync(sessionPath)) {
    results.push(fail('session_fresh', 'SESSION.md — missing', `Run ${chalk.cyan('mindlink init')} to recreate it.`));
  } else {
    const ageDays = (Date.now() - statSync(sessionPath).mtime.getTime()) / 86400000;
    const hasContent = readFileSync(sessionPath, 'utf8')
      .split('\n')
      .some(l => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('<!--'));

    if (!hasContent) {
      results.push(warn('session_fresh', 'SESSION.md — no content yet', 'Start a session — your AI will fill this in automatically.'));
    } else if (ageDays > SESSION_FAIL_DAYS) {
      const days = Math.floor(ageDays);
      results.push(fail('session_fresh', `SESSION.md — last updated ${days} days ago`, 'SESSION.md has not been updated in a week. Your AI may not be writing session state. Check that it is completing the REQUIRED session-end steps.'));
    } else if (ageDays > SESSION_WARN_DAYS) {
      const days = Math.floor(ageDays);
      results.push(warn('session_fresh', `SESSION.md — last updated ${days} days ago`, 'SESSION.md is getting stale. If you have active sessions, your AI should be updating this after each response.'));
    } else {
      const mins = Math.floor((Date.now() - statSync(sessionPath).mtime.getTime()) / 60000);
      const age = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
      results.push(pass('session_fresh', `SESSION.md — updated ${age}`, ''));
    }
  }

  // ── 4. log_present ───────────────────────────────────────────────────────────
  const logPath = join(brainDir, 'LOG.md');
  if (!existsSync(logPath)) {
    results.push(fail('log_present', 'LOG.md — missing', `Run ${chalk.cyan('mindlink init')} to recreate it.`));
  } else {
    const entries = (readFileSync(logPath, 'utf8').match(/^##\s+/gm) ?? []).length;
    if (entries === 0) {
      results.push(pass('log_present', 'LOG.md — no sessions yet', ''));
    } else {
      results.push(pass('log_present', `LOG.md — ${entries} session${entries !== 1 ? 's' : ''} logged`, ''));
    }
  }

  // ── 5. memory_size ───────────────────────────────────────────────────────────
  if (existsSync(memoryPath)) {
    const memMd = readFileSync(memoryPath, 'utf8');
    const lines = countRealLines(memMd);
    if (lines > MEMORY_FAIL_LINES) {
      results.push(fail('memory_size', `MEMORY.md — ${lines} lines (target: under ${MEMORY_FAIL_LINES})`, `Run ${chalk.cyan('mindlink prune')} to consolidate stale entries.`));
    } else if (lines > MEMORY_WARN_LINES) {
      results.push(warn('memory_size', `MEMORY.md — ${lines} lines (getting long)`, `Consider running ${chalk.cyan('mindlink prune')} to retire old entries.`));
    } else {
      results.push(pass('memory_size', `MEMORY.md — ${lines} line${lines !== 1 ? 's' : ''} (healthy)`, ''));
    }
  }

  // ── 6. agent_files ───────────────────────────────────────────────────────────
  const configuredAgents: string[] = config.agents ?? [];
  if (configuredAgents.length === 0) {
    results.push(warn('agent_files', 'No agents configured', `Run ${chalk.cyan('mindlink config')} → Agent instruction files.`, false));
  } else {
    const missing: string[] = [];
    for (const agentValue of configuredAgents) {
      const agent = AGENTS.find(a => a.value === agentValue);
      if (!agent) continue;
      if (!existsSync(join(projectPath, agent.destFile))) missing.push(agent.destFile);
    }
    if (missing.length === configuredAgents.length) {
      results.push(fail('agent_files', 'Agent files — none present', `All configured agent files are missing. Run ${chalk.cyan('mindlink verify --fix')} to regenerate.`, true));
    } else if (missing.length > 0) {
      results.push(warn('agent_files', `Agent files — ${missing.length} missing: ${missing.join(', ')}`, `Run ${chalk.cyan('mindlink verify --fix')} to regenerate.`, true));
    } else {
      results.push(pass('agent_files', `Agent files — all ${configuredAgents.length} present`, ''));
    }
  }

  return results;
}

function applyFix(projectPath: string, results: CheckResult[]): void {
  const brainDir = join(projectPath, BRAIN_DIR);
  const configPath = join(brainDir, 'config.json');
  let config: { agents?: string[] } = {};
  if (existsSync(configPath)) {
    try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}
  }

  const fixable = results.filter(r => r.fixable && r.status !== 'pass');
  if (fixable.length === 0) {
    console.log(`  ${chalk.dim('Nothing to auto-fix. Address the issues above manually.')}`);
    return;
  }

  let fixed = 0;
  for (const r of fixable) {
    if (r.id === 'agent_files') {
      const configuredAgents: string[] = config.agents ?? [];
      for (const agentValue of configuredAgents) {
        const agent = AGENTS.find(a => a.value === agentValue);
        if (!agent) continue;
        const destPath = join(projectPath, agent.destFile);
        if (!existsSync(destPath)) {
          try {
            mkdirSync(dirname(destPath), { recursive: true });
            writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
            console.log(`  ${chalk.green('✓')}  Regenerated ${agent.destFile}`);
            fixed++;
          } catch (err) {
            console.log(`  ${chalk.red('✗')}  Failed to regenerate ${agent.destFile}: ${err instanceof Error ? err.message : err}`);
          }
        }
      }
      // Also restore .claude/settings.json if claude is configured
      if (configuredAgents.includes('claude')) {
        const hookPath = join(projectPath, '.claude', 'settings.json');
        if (!existsSync(hookPath)) {
          try {
            mkdirSync(dirname(hookPath), { recursive: true });
            writeFileSync(hookPath, readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
            console.log(`  ${chalk.green('✓')}  Regenerated .claude/settings.json`);
            fixed++;
          } catch {}
        }
      }
    }
  }

  // Print non-fixable guidance
  for (const r of results) {
    if (r.status === 'fail' || r.status === 'warn') {
      if (r.id === 'core' || r.id === 'user_profile') {
        console.log(`  ${chalk.dim('→')}  ${r.id === 'core' ? 'Core' : 'User Profile'}: start a session and tell your AI to fill this in.`);
      } else if (r.id === 'memory_size') {
        console.log(`  ${chalk.dim('→')}  MEMORY.md too large: run ${chalk.cyan('mindlink prune')} to consolidate.`);
      }
    }
  }

  if (fixed > 0) console.log('');
}

export const verifyCommand = new Command('verify')
  .description('Check that .brain/ memory is healthy and up-to-date')
  .option('--json', 'Output results as JSON')
  .option('--fix', 'Auto-fix recoverable issues (regenerate missing agent files)')
  .addHelpText('after', `
What is checked:
  Core            — MEMORY.md Core section has real content
  User Profile    — MEMORY.md User Profile has real content
  SESSION.md      — was updated recently (warn >3 days, fail >7 days)
  LOG.md          — present and readable
  MEMORY.md size  — line count (warn >100, fail >200)
  Agent files     — all files from config.json are present on disk

Examples:
  mindlink verify
  mindlink verify --json
  mindlink verify --fix
  `)
  .action((opts) => {
    const projectPath = resolve(process.cwd());
    const results = runChecks(projectPath);

    if (opts.json) {
      console.log(JSON.stringify({ ok: results.every(r => r.status === 'pass'), checks: results }, null, 2));
      const hasFailure = results.some(r => r.status === 'fail');
      process.exit(hasFailure ? 1 : 0);
    }

    console.log('');
    console.log(`  ${chalk.bold('◉ MindLink Verify')}`);
    console.log(`  ${chalk.dim(projectPath)}`);
    console.log('');

    for (const r of results) {
      console.log(`  ${icon(r.status)}  ${r.label}`);
      if (r.message) console.log(`     ${chalk.dim(r.message)}`);
    }
    console.log('');

    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const fixableCount = results.filter(r => r.fixable && r.status !== 'pass').length;

    if (opts.fix) {
      applyFix(projectPath, results);
    }

    if (failCount > 0) {
      console.log(`  ${chalk.red.bold(`${failCount} error${failCount !== 1 ? 's' : ''}`)}, ${warnCount} warning${warnCount !== 1 ? 's' : ''}.`);
      if (!opts.fix && fixableCount > 0) {
        console.log(`  ${chalk.dim(`Run ${chalk.cyan('mindlink verify --fix')} to auto-repair ${fixableCount} issue${fixableCount !== 1 ? 's' : ''}.`)}`);
      }
    } else if (warnCount > 0) {
      console.log(`  ${chalk.yellow.bold(`${warnCount} warning${warnCount !== 1 ? 's' : ''}`)}, no critical errors.`);
    } else {
      console.log(`  ${chalk.green.bold('All good.')} Your AI's memory is healthy.`);
    }
    console.log('');

    if (failCount > 0) process.exit(1);
  });
