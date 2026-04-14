import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { GLOBAL_MINDLINK_DIR, GLOBAL_USER_PROFILE_PATH } from '../utils/paths.js';

const PROFILE_TEMPLATE = `# MindLink — Global User Profile

> This file is imported into every new project's MEMORY.md on \`mindlink init\`.
> Edit it with \`mindlink profile\`. Run \`mindlink update\` to sync changes to all projects.

<!-- Role, company, title, level, years of experience -->
<!-- Primary languages and tools -->
<!-- Communication style and preferences -->
<!-- Editor, OS, shell setup -->
<!-- Added: ${new Date().toISOString().slice(0, 10)} -->
`;

function ensureProfileExists(): void {
  if (!existsSync(GLOBAL_MINDLINK_DIR)) {
    mkdirSync(GLOBAL_MINDLINK_DIR, { recursive: true });
  }
  if (!existsSync(GLOBAL_USER_PROFILE_PATH)) {
    writeFileSync(GLOBAL_USER_PROFILE_PATH, PROFILE_TEMPLATE);
  }
}

export const profileCommand = new Command('profile')
  .description('Manage your global user profile (imported into every new project)')
  .option('--show', 'Print current profile to stdout')
  .option('--path', 'Print profile file path only')
  .addHelpText('after', `
Your profile is stored at ~/.mindlink/USER.md and auto-imported into
MEMORY.md when you run \`mindlink init\` on a new project.

Run \`mindlink update\` to sync profile changes to all registered projects.

Examples:
  mindlink profile            # open profile in $EDITOR
  mindlink profile --show     # print profile to stdout
  mindlink profile --path     # print file path
  `)
  .action((opts) => {
    if (opts.path) {
      console.log(GLOBAL_USER_PROFILE_PATH);
      return;
    }

    if (opts.show) {
      if (!existsSync(GLOBAL_USER_PROFILE_PATH)) {
        console.log('');
        console.log(`  ${chalk.yellow('⚠')}  No global profile yet.`);
        console.log(`     Run ${chalk.cyan('mindlink profile')} to create one.`);
        console.log('');
        return;
      }
      console.log('');
      console.log(readFileSync(GLOBAL_USER_PROFILE_PATH, 'utf8'));
      return;
    }

    // Open in $EDITOR
    ensureProfileExists();
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
    console.log('');
    console.log(`  ${chalk.dim(`Opening ${GLOBAL_USER_PROFILE_PATH} in ${editor}...`)}`);
    console.log(`  ${chalk.dim('Run mindlink update after saving to sync to all registered projects.')}`);
    console.log('');

    try {
      execSync(`${editor} "${GLOBAL_USER_PROFILE_PATH}"`, { stdio: 'inherit' });
      console.log('');
      console.log(`  ${chalk.green('✓')}  Profile saved.`);
      console.log(`  ${chalk.dim('→  Run mindlink update to sync to all registered projects.')}`);
      console.log('');
    } catch {
      // Editor exited non-zero (e.g. user hit Ctrl-C in nano) — not an error
      console.log('');
    }
  });
