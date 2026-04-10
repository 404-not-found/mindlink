import { Command } from 'commander';
import { select, isCancel, cancel, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

function currentVersion(): string {
  try {
    const pkg = require(join(__dirname, '..', '..', 'package.json'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

async function latestVersion(): Promise<string | null> {
  try {
    const { default: https } = await import('https');
    return new Promise((resolve) => {
      const req = https.get(
        'https://registry.npmjs.org/brainlink/latest',
        { headers: { 'User-Agent': 'brainlink-cli' } },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.version ?? null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    });
  } catch {
    return null;
  }
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

export const updateCommand = new Command('update')
  .description('Update brainlink to the latest version')
  .addHelpText('after', `
Examples:
  brainlink update
  `)
  .action(async () => {
    const current = currentVersion();

    // Non-TTY: just check and report, don't prompt
    if (!process.stdin.isTTY) {
      const latest = await latestVersion();
      if (!latest) {
        console.log(JSON.stringify({ current, latest: null, upToDate: null }));
        process.exit(1);
      }
      const upToDate = !semverGt(latest, current);
      console.log(JSON.stringify({ current, latest, upToDate }));
      if (!upToDate) process.exit(2); // exit 2 = update available
      return;
    }

    const s = spinner();
    s.start('Checking for updates...');

    const latest = await latestVersion();

    if (!latest) {
      s.stop('Could not reach npm registry.');
      console.log('');
      console.log(`  ${chalk.red('✗')}  Could not check for updates. Check your internet connection.`);
      console.log(`     ${chalk.dim('Latest releases: github.com/404-not-found/brainlink/releases')}`);
      console.log('');
      process.exit(1);
    }

    s.stop('Done.');
    console.log('');
    console.log(`  Current version   : ${chalk.dim(current)}`);
    console.log(`  Latest version    : ${semverGt(latest, current) ? chalk.green(latest) : chalk.dim(latest)}`);
    console.log('');

    if (!semverGt(latest, current)) {
      console.log(`  ${chalk.green('✓')}  You're on the latest version (${current}).`);
      console.log('');
      return;
    }

    const action = await select({
      message: `Update to ${latest}?`,
      options: [
        { value: 'update', label: `Update to ${latest}` },
        { value: 'skip',   label: 'Skip this version' },
        { value: 'cancel', label: 'Cancel' },
      ],
    });

    if (isCancel(action) || action === 'cancel' || action === 'skip') {
      if (action === 'skip') {
        console.log(`  ${chalk.dim('Skipped. Run brainlink update again to install later.')}`);
      } else {
        cancel('Cancelled.');
      }
      console.log('');
      return;
    }

    // Install
    const s2 = spinner();
    s2.start(`Installing brainlink@${latest}...`);

    try {
      execSync(`npm install -g brainlink@${latest}`, { stdio: 'pipe' });
      s2.stop('Done.');
      console.log('');
      console.log(`  ${chalk.green('✓')}  Updated to ${latest}.`);
      console.log(`     ${chalk.dim('See what\'s new: github.com/404-not-found/brainlink/releases')}`);
    } catch (err: unknown) {
      s2.stop('Failed.');
      console.log('');
      console.log(`  ${chalk.red('✗')}  Update failed.`);
      console.log(`     ${chalk.dim('Try: npm install -g brainlink@' + latest)}`);
      if (err instanceof Error && err.message.includes('EACCES')) {
        console.log(`     ${chalk.dim('Permission error — try: sudo npm install -g brainlink@' + latest)}`);
      }
      process.exit(1);
    }

    console.log('');
  });
