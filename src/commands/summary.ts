import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  extractSection,
  extractBullets,
  countLogEntries,
  lastLogDate,
  parseLogEntries,
} from '../utils/parser.js';
import { BRAIN_DIR } from '../utils/paths.js';

export const summaryCommand = new Command('summary')
  .description('Print a full briefing of what your AI knows — great for sharing or reviewing context')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  brainlink summary
  brainlink summary --json

Tip: your AI agent can run this itself — ask it to run "brainlink summary"
to get a full briefing on the current project state.
  `)
  .action((opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('brainlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    const memoryPath  = join(brainDir, 'MEMORY.md');
    const sessionPath = join(brainDir, 'SESSION.md');
    const logPath     = join(brainDir, 'LOG.md');
    const sharedPath  = join(brainDir, 'SHARED.md');

    const memoryMd  = existsSync(memoryPath)  ? readFileSync(memoryPath, 'utf8')  : '';
    const sessionMd = existsSync(sessionPath) ? readFileSync(sessionPath, 'utf8') : '';
    const logMd     = existsSync(logPath)     ? readFileSync(logPath, 'utf8')     : '';
    const sharedMd  = existsSync(sharedPath)  ? readFileSync(sharedPath, 'utf8')  : '';

    // Parse memory
    const projectOverview = extractSection(memoryMd, 'Project Overview') ||
                            extractSection(memoryMd, 'Project Identity') ||
                            extractSection(memoryMd, 'What Is This Project');
    const techStack   = extractSection(memoryMd, 'Tech Stack') ||
                        extractSection(memoryMd, 'Stack');
    const decisions   = extractBullets(
      extractSection(memoryMd, 'Key Decisions') ||
      extractSection(memoryMd, 'Decisions')
    );

    // Parse session
    const rawTask   = extractSection(sessionMd, 'Current Task');
    const task      = rawTask.startsWith('<!--') ? '' : rawTask;
    const inProg    = extractBullets(extractSection(sessionMd, 'In Progress'));
    const upNext    = extractBullets(extractSection(sessionMd, 'Up Next'));
    const blockers  = extractBullets(extractSection(sessionMd, 'Blockers'));

    // Parse log
    const sessionCount = countLogEntries(logMd);
    const lastDate     = lastLogDate(logMd);
    const recentLogs   = parseLogEntries(logMd).slice(0, 3);

    // Parse shared
    const sharedLines = sharedMd
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('<!--') && !l.startsWith('>') && l !== '---')
      .slice(0, 10);

    // ── JSON ─────────────────────────────────────────────────────────────────
    if (opts.json) {
      console.log(JSON.stringify({
        project: { overview: projectOverview, techStack, decisions },
        session: { currentTask: task, inProgress: inProg, upNext, blockers },
        log: { totalSessions: sessionCount, lastSession: lastDate, recent: recentLogs },
        shared: sharedLines,
      }, null, 2));
      return;
    }

    // ── Human ─────────────────────────────────────────────────────────────────
    console.log('');
    console.log(`  ${chalk.bold('◉ Brainlink Memory Summary')}  ${chalk.dim('·')}  ${chalk.dim(projectPath)}`);
    console.log('');

    // Project
    if (projectOverview) {
      console.log(`  ${chalk.bold('Project')}`);
      for (const line of projectOverview.split('\n').filter(Boolean)) {
        console.log(`  ${chalk.dim(line)}`);
      }
      console.log('');
    }

    if (techStack) {
      console.log(`  ${chalk.bold('Tech stack')}`);
      for (const line of techStack.split('\n').filter(Boolean)) {
        console.log(`  ${chalk.dim(line)}`);
      }
      console.log('');
    }

    if (decisions.length > 0) {
      console.log(`  ${chalk.bold('Key decisions')}`);
      for (const d of decisions.slice(0, 5)) {
        console.log(`  ${chalk.dim('·')}  ${d}`);
      }
      if (decisions.length > 5) {
        console.log(`  ${chalk.dim(`  …and ${decisions.length - 5} more in MEMORY.md`)}`);
      }
      console.log('');
    }

    // Current session
    if (task || inProg.length > 0 || upNext.length > 0) {
      console.log(`  ${chalk.bold('Current session')}`);
      if (task) console.log(`  ${chalk.cyan('◎')}  ${task}`);
      for (const item of inProg)   console.log(`  ${chalk.yellow('●')}  ${item}`);
      for (const item of blockers) console.log(`  ${chalk.red('✗')}  ${item}`);
      for (const item of upNext)   console.log(`  ${chalk.dim('→')}  ${item}`);
      console.log('');
    }

    // Shared context
    if (sharedLines.length > 0) {
      console.log(`  ${chalk.bold('Shared context')}  ${chalk.dim('(from other sessions)')}`);
      for (const line of sharedLines) {
        console.log(`  ${chalk.dim(line)}`);
      }
      console.log('');
    }

    // History
    if (recentLogs.length > 0) {
      console.log(`  ${chalk.bold('Recent sessions')}  ${chalk.dim(`(${sessionCount} total)`)}`);
      for (const entry of recentLogs) {
        console.log(`  ${chalk.dim('──')} ${chalk.cyan(entry.heading)}`);
        if (entry.body) {
          const preview = entry.body.split('\n').filter(Boolean)[0] ?? '';
          if (preview) console.log(`     ${chalk.dim(preview.slice(0, 72))}`);
        }
      }
      console.log('');
    }

    if (!projectOverview && !task && sessionCount === 0 && sharedLines.length === 0) {
      console.log(`  ${chalk.dim('Memory files are blank — your AI hasn\'t written anything yet.')}`);
      console.log(`  ${chalk.dim('Start a session and let it run — it will fill these in automatically.')}`);
      console.log('');
    }

    console.log(`  ${chalk.dim('─────────────────────────────────────────────────')}`);
    console.log(`  ${chalk.dim('Powered by Brainlink — github.com/404-not-found/brainlink')}`);
    console.log('');
  });
