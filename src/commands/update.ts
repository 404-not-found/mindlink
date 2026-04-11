import { Command } from 'commander';
import { select, isCancel, cancel, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { AGENT_TEMPLATES_DIR, HOOKS_TEMPLATES_DIR, BRAIN_DIR } from '../utils/paths.js';
import { AGENTS } from '../utils/agents.js';
import { getRegisteredProjects } from '../utils/registry.js';
import { VERSION } from '../utils/version.js';

async function latestVersion(): Promise<string | null> {
  try {
    const { default: https } = await import('https');
    return new Promise((resolve) => {
      const req = https.get(
        'https://registry.npmjs.org/mindlink/latest',
        { headers: { 'User-Agent': 'mindlink-cli' } },
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
  .description('Update mindlink to the latest version')
  .addHelpText('after', `
Examples:
  mindlink update
  `)
  .action(async () => {
    const current = VERSION;

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
      console.log(`     ${chalk.dim('Latest releases: github.com/404-not-found/mindlink/releases')}`);
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
        console.log(`  ${chalk.dim('Skipped. Run mindlink update again to install later.')}`);
      } else {
        cancel('Cancelled.');
      }
      console.log('');
      return;
    }

    // Install
    const s2 = spinner();
    s2.start(`Installing mindlink@${latest}...`);

    try {
      execSync(`npm install -g mindlink@${latest}`, { stdio: 'pipe' });
      s2.stop('Done.');
      console.log('');
      console.log(`  ${chalk.green('✓')}  Updated to ${latest}.`);
      console.log(`     ${chalk.dim('See what\'s new: github.com/404-not-found/mindlink/releases')}`);
    } catch (err: unknown) {
      s2.stop('Failed.');
      console.log('');
      console.log(`  ${chalk.red('✗')}  Update failed.`);
      console.log(`     ${chalk.dim('Try: npm install -g mindlink@' + latest)}`);
      if (err instanceof Error && err.message.includes('EACCES')) {
        console.log(`     ${chalk.dim('Permission error — try: sudo npm install -g mindlink@' + latest)}`);
      }
      process.exit(1);
    }

    // Refresh agent instruction files across all registered projects
    const projects = getRegisteredProjects().filter(p => existsSync(join(p, BRAIN_DIR, 'config.json')));

    if (projects.length > 0) {
      console.log('');
      const refresh = await select({
        message: `Refresh agent instruction files in ${projects.length} project${projects.length > 1 ? 's' : ''}?`,
        options: [
          { value: 'yes', label: 'Yes — update CLAUDE.md, CURSOR.md, etc. in all projects', hint: 'safe, no memory data is touched' },
          { value: 'no',  label: 'No — keep existing files' },
        ],
      });

      if (!isCancel(refresh) && refresh === 'yes') {
        console.log('');
        for (const projectPath of projects) {
          const configPath = join(projectPath, BRAIN_DIR, 'config.json');
          let config: { agents?: string[] } = {};
          try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}

          const agentValues: string[] = config.agents ?? AGENTS.filter(a => a.selected).map(a => a.value);
          const refreshed: string[] = [];

          for (const agentValue of agentValues) {
            const agent = AGENTS.find(a => a.value === agentValue);
            if (!agent) continue;
            const destPath = join(projectPath, agent.destFile);
            try {
              mkdirSync(dirname(destPath), { recursive: true });
              writeFileSync(destPath, readFileSync(join(AGENT_TEMPLATES_DIR, agent.templateFile), 'utf8'));
              refreshed.push(agent.destFile);
            } catch {}
          }

          if (agentValues.includes('claude')) {
            const hookDest = join(projectPath, '.claude', 'settings.json');
            try {
              mkdirSync(join(projectPath, '.claude'), { recursive: true });
              writeFileSync(hookDest, readFileSync(join(HOOKS_TEMPLATES_DIR, 'claude-settings.json'), 'utf8'));
              refreshed.push('.claude/settings.json');
            } catch {}
          }

          console.log(`  ${chalk.bold(projectPath)}`);
          for (const f of refreshed) {
            console.log(`    ${chalk.green('✓')}  ${f}`);
          }
        }
        console.log('');
        console.log(`  ${chalk.dim('All agent files are up to date.')}`);
      }
    }

    console.log('');
  });
