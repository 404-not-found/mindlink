import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve, basename } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';

function timestamp(): string {
  const d = new Date();
  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  const time = d.toTimeString().slice(0, 5);
  return `${month} ${day} ${time}`;
}

function describeFile(filePath: string): string {
  if (!existsSync(filePath)) return chalk.dim('(missing)');
  const stat = statSync(filePath);
  const kb = (stat.size / 1024).toFixed(1);
  const content = readFileSync(filePath, 'utf8');
  const entries = (content.match(/^## /gm) ?? []).length;
  const name = basename(filePath);
  if (name === 'LOG.md') return entries > 0 ? `${entries} session${entries !== 1 ? 's' : ''}` : chalk.dim('empty');
  if (name === 'SHARED.md') {
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('<!--') && !l.startsWith('>') && l !== '---').length;
    return lines > 0 ? `${lines} line${lines !== 1 ? 's' : ''}` : chalk.dim('empty');
  }
  if (name === 'SESSION.md') {
    const hasTask = content.includes('## Current Task') && !content.includes('<!-- ');
    return hasTask ? chalk.green('active') : chalk.dim('idle');
  }
  return `${kb} KB`;
}

export const syncCommand = new Command('sync')
  .description('Sync shared context between sessions')
  .option('--once', 'Sync once and exit (default: watch mode)')
  .addHelpText('after', `
Examples:
  mindlink sync
  mindlink sync --once
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

    const sharedPath  = join(brainDir, 'SHARED.md');
    const sessionPath = join(brainDir, 'SESSION.md');
    const logPath     = join(brainDir, 'LOG.md');
    const memoryPath  = join(brainDir, 'MEMORY.md');

    // ── --once mode ───────────────────────────────────────────────────────────
    if (opts.once) {
      console.log('');
      console.log(`  ${chalk.dim('Checking shared context...')}`);
      console.log('');

      const files = [
        { label: 'SHARED.md  ', path: sharedPath  },
        { label: 'SESSION.md ', path: sessionPath },
        { label: 'LOG.md     ', path: logPath      },
        { label: 'MEMORY.md  ', path: memoryPath   },
      ];

      for (const { label, path } of files) {
        const desc = describeFile(path);
        const mtime = existsSync(path) ? statSync(path).mtime : null;
        const age = mtime
          ? (() => {
              const diff = Date.now() - mtime.getTime();
              const min = Math.floor(diff / 60000);
              const hr  = Math.floor(diff / 3600000);
              if (min < 2) return 'just now';
              if (min < 60) return `${min}m ago`;
              return `${hr}h ago`;
            })()
          : '';
        console.log(`  ${chalk.dim(label)}  ${desc}  ${chalk.dim(age)}`);
      }

      console.log('');
      console.log(`  ${chalk.green('✓')}  All sessions share the same .brain/ folder.`);
      console.log(`     ${chalk.dim('Any session that writes to SHARED.md is immediately visible to all others.')}`);
      console.log('');
      return;
    }

    // ── Watch mode ────────────────────────────────────────────────────────────
    // Dynamic import so chokidar is only loaded when needed
    const { watch } = await import('chokidar');

    console.log('');
    console.log(`  ${chalk.dim('Watching for changes...')}  ${chalk.dim('(Ctrl+C to stop)')}`);
    console.log('');

    const watcher = watch(brainDir, {
      ignoreInitial: true,
      ignored: /(^|[/\\])\../,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    watcher.on('change', (filePath: string) => {
      const name = basename(filePath);
      const stat = statSync(filePath);
      const kb = (stat.size / 1024).toFixed(1);
      console.log(`  ${chalk.dim('[' + timestamp() + ']')}  ${chalk.cyan(name)} updated  ${chalk.dim(kb + ' KB')}  ${chalk.green('→ synced ✓')}`);
    });

    watcher.on('add', (filePath: string) => {
      const name = basename(filePath);
      console.log(`  ${chalk.dim('[' + timestamp() + ']')}  ${chalk.cyan(name)} created  ${chalk.green('→ synced ✓')}`);
    });

    watcher.on('error', (err: unknown) => {
      console.log(`  ${chalk.red('✗')}  Watch error: ${err instanceof Error ? err.message : String(err)}`);
    });

    // Keep process alive
    process.on('SIGINT', () => {
      watcher.close();
      console.log('');
      console.log(`  ${chalk.dim('Stopped.')}`);
      console.log('');
      process.exit(0);
    });
  });
