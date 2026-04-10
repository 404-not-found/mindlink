import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import {
  extractSection,
  extractBullets,
  countLogEntries,
  lastLogDate,
  countDecisions,
  relativeTime,
} from '../utils/parser.js';
import { BRAIN_DIR } from '../utils/paths.js';

export const statusCommand = new Command('status')
  .description('Show last session summary and what\'s next')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  brainlink status
  brainlink status --json
  `)
  .action((opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    // Not initialized?
    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('brainlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    const sessionPath = join(brainDir, 'SESSION.md');
    const logPath     = join(brainDir, 'LOG.md');
    const memoryPath  = join(brainDir, 'MEMORY.md');

    const sessionMd = existsSync(sessionPath) ? readFileSync(sessionPath, 'utf8') : '';
    const logMd     = existsSync(logPath)     ? readFileSync(logPath, 'utf8')     : '';
    const memoryMd  = existsSync(memoryPath)  ? readFileSync(memoryPath, 'utf8')  : '';

    // Parse SESSION.md — strip comment placeholders
    const rawTask      = extractSection(sessionMd, 'Current Task');
    const currentTask  = rawTask.startsWith('<!--') ? '' : rawTask;
    const inProgress   = extractBullets(extractSection(sessionMd, 'In Progress'));
    const decisions    = extractBullets(extractSection(sessionMd, 'Decisions Made This Session'));
    const blockers     = extractBullets(extractSection(sessionMd, 'Blockers'));
    const upNext       = extractBullets(extractSection(sessionMd, 'Up Next'));

    // Parse LOG.md
    const sessionCount = countLogEntries(logMd);
    const lastSession  = lastLogDate(logMd);

    // Parse MEMORY.md
    const decisionCount = countDecisions(memoryMd);

    // Last updated
    const lastUpdated = existsSync(sessionPath)
      ? relativeTime(statSync(sessionPath).mtime)
      : 'never';

    const isEmpty =
      !currentTask &&
      inProgress.length === 0 &&
      decisions.length === 0 &&
      blockers.length === 0 &&
      upNext.length === 0 &&
      sessionCount === 0;

    // ── JSON output ───────────────────────────────────────────────────────────
    if (opts.json) {
      console.log(JSON.stringify({
        currentTask,
        inProgress,
        decisions,
        blockers,
        upNext,
        stats: { sessionsLogged: sessionCount, decisionsMade: decisionCount, lastUpdated },
      }, null, 2));
      return;
    }

    // ── Human output ──────────────────────────────────────────────────────────
    console.log('');

    if (isEmpty) {
      console.log(`  ${chalk.dim('No sessions logged yet.')}`);
      console.log(`  Start an AI session — it will read ${chalk.cyan('.brain/')} automatically.`);
      console.log('');
      return;
    }

    // Last session date
    if (lastSession) {
      console.log(`  ${chalk.bold('Last session')} ${chalk.dim('—')} ${lastSession}`);
      console.log('');
    }

    // Current task
    if (currentTask && !currentTask.startsWith('<!--')) {
      console.log(`  ${chalk.bold('Current task')}`);
      console.log(`  ${chalk.cyan('◎')}  ${currentTask}`);
      console.log('');
    }

    // In progress
    if (inProgress.length > 0) {
      console.log(`  ${chalk.bold('In progress')}`);
      for (const item of inProgress) {
        console.log(`  ${chalk.yellow('●')}  ${item}`);
      }
      console.log('');
    }

    // Decisions this session
    if (decisions.length > 0) {
      console.log(`  ${chalk.bold('Decided this session')}`);
      for (const item of decisions) {
        console.log(`  ${chalk.green('✓')}  ${item}`);
      }
      console.log('');
    }

    // Blockers
    if (blockers.length > 0) {
      console.log(`  ${chalk.bold('Blockers')}`);
      for (const item of blockers) {
        console.log(`  ${chalk.red('✗')}  ${item}`);
      }
      console.log('');
    }

    // Up next
    if (upNext.length > 0) {
      console.log(`  ${chalk.bold('Up next')}`);
      for (const item of upNext) {
        console.log(`  ${chalk.dim('→')}  ${item}`);
      }
      console.log('');
    }

    // Stats
    console.log(`  ${chalk.dim('─────────────────────────────')}`);
    console.log(`  ${chalk.dim('Sessions logged')}  ${String(sessionCount).padStart(4)}`);
    console.log(`  ${chalk.dim('Decisions made')}   ${String(decisionCount).padStart(4)}`);
    console.log(`  ${chalk.dim('Last updated')}     ${lastUpdated}`);
    console.log('');
    console.log(`  Run ${chalk.cyan('brainlink log')} to see full history.`);
    console.log('');
  });
