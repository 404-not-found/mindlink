import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { parseLogEntries } from '../utils/parser.js';
import { BRAIN_DIR } from '../utils/paths.js';

export const logCommand = new Command('log')
  .description('Print session history')
  .option('--all', 'Show full history')
  .option('--limit <n>', 'Show last N sessions', '10')
  .option('--since <date>', 'Show sessions from a date (matched against heading text)')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  brainlink log
  brainlink log --all
  brainlink log --limit 20
  brainlink log --since "Apr 1"
  brainlink log --json
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

    const logPath = join(brainDir, 'LOG.md');
    const logMd = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';

    let entries = parseLogEntries(logMd);

    if (entries.length === 0) {
      console.log('');
      console.log(`  ${chalk.dim('No sessions logged yet.')}`);
      console.log(`  ${chalk.dim('Your AI will append an entry here at the end of each session.')}`);
      console.log('');
      return;
    }

    // Filter by --since
    if (opts.since) {
      const since = opts.since.toLowerCase();
      entries = entries.filter(e => e.heading.toLowerCase().includes(since));
    }

    // Limit (unless --all)
    const limit = opts.all ? entries.length : parseInt(opts.limit, 10);
    const total = entries.length;
    const shown = entries.slice(0, limit);

    // ── JSON output ───────────────────────────────────────────────────────────
    if (opts.json) {
      console.log(JSON.stringify(shown, null, 2));
      return;
    }

    // ── Human output ──────────────────────────────────────────────────────────
    console.log('');

    if (!opts.all) {
      const rest = total - shown.length;
      const hint = rest > 0 ? `  ${chalk.dim(`${rest} more — run brainlink log --all to see everything`)}` : '';
      console.log(`  ${chalk.dim(`Showing last ${shown.length} of ${total} session${total !== 1 ? 's' : ''}`)}${hint ? '' : ''}`);
      if (rest > 0) console.log(`  ${chalk.dim(`${rest} more — run brainlink log --all to see everything`)}`);
      console.log('');
    }

    for (const entry of shown) {
      console.log(`  ${chalk.bold('──')} ${chalk.cyan(entry.heading)} ${'─'.repeat(Math.max(0, 40 - entry.heading.length))}`);
      if (entry.body) {
        const lines = entry.body.split('\n');
        for (const line of lines) {
          console.log(`  ${chalk.dim(line)}`);
        }
      }
      console.log('');
    }
  });
