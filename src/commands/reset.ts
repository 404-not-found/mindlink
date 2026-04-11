import { Command } from 'commander';
import { confirm, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR, BRAIN_TEMPLATES_DIR } from '../utils/paths.js';

const BRAIN_FILES = ['MEMORY.md', 'SESSION.md', 'SHARED.md', 'LOG.md'];

export const resetCommand = new Command('reset')
  .description('Wipe all .brain/ memory files and start completely fresh')
  .option('-y, --yes', 'Skip confirmation prompt')
  .addHelpText('after', `
What it does:
  Resets MEMORY.md, SESSION.md, SHARED.md, and LOG.md to blank templates.
  Your settings (config.json) and agent instruction files are untouched.

Not what you need?
  mindlink clear     — reset SESSION.md only (lighter option)
  mindlink uninstall — remove MindLink from this project entirely

Examples:
  mindlink reset
  mindlink reset --yes
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    console.log('');

    if (!opts.yes) {
      console.log(`  ${chalk.yellow('!')}  This will wipe ALL .brain/ memory files and start fresh.`);
      console.log(`     ${chalk.dim('MEMORY.md, SESSION.md, SHARED.md, and LOG.md → reset to blank templates.')}`);
      console.log(`     ${chalk.dim('Settings and agent instruction files are untouched.')}`);
      console.log('');
      console.log(`  ${chalk.dim('Lighter option: mindlink clear  — resets SESSION.md only')}`);
      console.log(`  ${chalk.dim('Remove entirely: mindlink uninstall  — removes MindLink from this project')}`);
      console.log('');

      const confirmed = await confirm({
        message: 'Reset everything? This cannot be undone (unless .brain/ is tracked by git).',
      });

      if (isCancel(confirmed) || !confirmed) {
        cancel('Cancelled.');
        process.exit(0);
      }
      console.log('');
    }

    const errors: string[] = [];

    for (const file of BRAIN_FILES) {
      try {
        const templatePath = join(BRAIN_TEMPLATES_DIR, file);
        const destPath = join(brainDir, file);
        if (existsSync(templatePath)) {
          writeFileSync(destPath, readFileSync(templatePath, 'utf8'));
        }
      } catch (err: unknown) {
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (errors.length > 0) {
      for (const err of errors) console.log(`  ${chalk.red('✗')}  ${err}`);
      console.log('');
      process.exit(1);
    }

    console.log(`  ${chalk.green('✓')}  .brain/ reset. All memory files are blank.`);
    console.log(`     ${chalk.dim('Your AI will wake up with no memory of past sessions.')}`);
    console.log('');
  });
