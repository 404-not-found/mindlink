import { Command } from 'commander';
import { select, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, rmSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';

export const uninstallCommand = new Command('uninstall')
  .description('Remove Brainlink from the current project')
  .option('-y, --yes', 'Skip confirmation and remove all project files')
  .addHelpText('after', `
What gets removed:
  - .brain/ folder (all memory files)
  - Agent instruction files (CLAUDE.md, CURSOR.md, etc.)
  - .claude/settings.json hook (if it was created by Brainlink)

What stays:
  - The brainlink CLI itself (run: npm uninstall -g brainlink)
  - Any files Brainlink did not create

Examples:
  brainlink uninstall
  brainlink uninstall --yes
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Nothing to uninstall here.`);
      console.log('');
      process.exit(1);
    }

    // Read config to know which agent files to remove
    let agents: string[] = [];
    try {
      const cfg = JSON.parse(readFileSync(join(brainDir, 'config.json'), 'utf8'));
      agents = cfg.agents ?? [];
    } catch {
      // config unreadable — use all agents as a safe default
      agents = AGENTS.map(a => a.value);
    }

    console.log('');

    if (!opts.yes) {
      console.log(`  ${chalk.yellow('!')}  This will remove Brainlink from this project:`);
      console.log(`     ${chalk.dim('· .brain/              (all memory files)')}`);
      for (const v of agents) {
        const agent = AGENTS.find(a => a.value === v);
        if (agent) console.log(`     ${chalk.dim('· ' + agent.destFile)}`);
      }
      if (agents.includes('claude')) {
        console.log(`     ${chalk.dim('· .claude/settings.json  (hook)')}`);
      }
      console.log('');
      console.log(`  ${chalk.dim('The brainlink CLI itself is NOT removed.')}`);
      console.log(`  ${chalk.dim('To remove the CLI: npm uninstall -g brainlink')}`);
      console.log('');

      const action = await select({
        message: 'Remove Brainlink from this project?',
        options: [
          { value: 'remove', label: 'Yes, remove everything listed above' },
          { value: 'cancel', label: 'Cancel' },
        ],
      });

      if (isCancel(action) || action === 'cancel') {
        cancel('Cancelled.');
        console.log('');
        return;
      }
      console.log('');
    }

    const removed: string[] = [];
    const errors: string[] = [];

    // Remove .brain/
    try {
      rmSync(brainDir, { recursive: true, force: true });
      removed.push('.brain/');
    } catch (err: unknown) {
      errors.push(`.brain/: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Remove agent instruction files
    for (const v of agents) {
      const agent = AGENTS.find(a => a.value === v);
      if (!agent) continue;
      const destPath = join(projectPath, agent.destFile);
      if (existsSync(destPath)) {
        try {
          unlinkSync(destPath);
          removed.push(agent.destFile);
        } catch (err: unknown) {
          errors.push(`${agent.destFile}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Remove .claude/settings.json (only if agent was claude)
    if (agents.includes('claude')) {
      const hookPath = join(projectPath, '.claude', 'settings.json');
      if (existsSync(hookPath)) {
        try {
          unlinkSync(hookPath);
          removed.push('.claude/settings.json');
        } catch {
          // non-fatal — user may have customised this file
        }
      }
    }

    for (const f of removed) console.log(`  ${chalk.green('✓')}  ${f} removed.`);
    for (const e of errors)  console.log(`  ${chalk.red('✗')}  ${e}`);

    console.log('');
    console.log(`  ${chalk.dim('Brainlink removed from this project.')}`);
    console.log(`  ${chalk.dim('To remove the CLI itself: npm uninstall -g brainlink')}`);
    console.log('');
  });
