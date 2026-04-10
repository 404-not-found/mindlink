import { Command } from 'commander';
import { confirm, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR, BRAIN_TEMPLATES_DIR } from '../utils/paths.js';

export const clearCommand = new Command('clear')
  .description('Reset SESSION.md for a fresh session start')
  .option('-y, --yes', 'Skip confirmation prompt')
  .addHelpText('after', `
Examples:
  brainlink clear
  brainlink clear --yes
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('brainlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    console.log('');

    if (!opts.yes) {
      console.log(`  ${chalk.dim('This will reset SESSION.md for a fresh session start.')}`);
      console.log(`  ${chalk.dim('MEMORY.md and LOG.md are untouched.')}`);
      console.log('');

      const confirmed = await confirm({
        message: 'Clear current session?',
      });

      if (isCancel(confirmed) || !confirmed) {
        cancel('Cancelled.');
        process.exit(0);
      }
      console.log('');
    }

    try {
      const templatePath = join(BRAIN_TEMPLATES_DIR, 'SESSION.md');
      const destPath = join(brainDir, 'SESSION.md');
      writeFileSync(destPath, readFileSync(templatePath, 'utf8'));
    } catch (err: unknown) {
      console.log(`  ${chalk.red('✗')}  ${err instanceof Error ? err.message : String(err)}`);
      console.log('');
      process.exit(1);
    }

    console.log(`  ${chalk.green('✓')}  SESSION.md cleared. Ready for a clean session.`);
    console.log('');
  });
