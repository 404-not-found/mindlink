import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR, BRAIN_TEMPLATES_DIR } from '../utils/paths.js';

export const clearCommand = new Command('clear')
  .description('Reset SESSION.md for a fresh session start')
  .option('-y, --yes', 'Skip confirmation prompt')
  .addHelpText('after', `
What it does:
  Resets SESSION.md to a blank template — wipes current task, in-progress items,
  blockers, and up-next. MEMORY.md, LOG.md, and SHARED.md are untouched.

Not what you need?
  mindlink reset     — wipe ALL memory files back to blank (scorched earth)
  mindlink uninstall — remove MindLink from this project entirely

Examples:
  mindlink clear
  mindlink clear --yes
  `)
  .action(async (_opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log('');
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    console.log('');

    try {
      const templatePath = join(BRAIN_TEMPLATES_DIR, 'SESSION.md');
      const destPath = join(brainDir, 'SESSION.md');
      writeFileSync(destPath, readFileSync(templatePath, 'utf8'));
      // Clean up ephemeral session timestamp used by Stop hook
      const tsDest = join(brainDir, '.session_ts');
      if (existsSync(tsDest)) unlinkSync(tsDest);
    } catch (err: unknown) {
      console.log(`  ${chalk.red('✗')}  ${err instanceof Error ? err.message : String(err)}`);
      console.log('');
      process.exit(1);
    }

    console.log(`  ${chalk.green('✓')}  SESSION.md cleared. Ready for a clean session.`);
    console.log(`     ${chalk.dim('MEMORY.md, LOG.md, and SHARED.md are untouched.')}`);
    console.log('');
  });
