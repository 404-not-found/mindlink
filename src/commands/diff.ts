import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { BRAIN_DIR } from '../utils/paths.js';

const BRAIN_FILES = ['MEMORY.md', 'SESSION.md', 'LOG.md', 'SHARED.md'];

function relativeTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Try to get git diff for a file since the last commit (or HEAD~1). Returns null if not in git. */
function getGitDiff(filePath: string, since?: string): string | null {
  try {
    const dir = resolve(filePath, '..');
    // Check if in git
    execSync('git rev-parse --is-inside-work-tree', { cwd: dir, stdio: 'pipe' });
    const ref = since || 'HEAD~1';
    const diff = execSync(`git diff ${ref} -- "${filePath}"`, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return diff || null;
  } catch {
    return null;
  }
}

/** Summarize additions/removals from a unified diff string */
function parseDiffSummary(diff: string): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const t = line.slice(1).trim();
      if (t && !t.startsWith('<!--') && !t.startsWith('#') && t !== '---') added.push(t);
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      const t = line.slice(1).trim();
      if (t && !t.startsWith('<!--') && !t.startsWith('#') && t !== '---') removed.push(t);
    }
  }
  return { added, removed };
}

export const diffCommand = new Command('diff')
  .description('Show what changed in .brain/ since last session')
  .option('--since <ref>', 'Git ref or date to diff against (default: last mindlink clear or HEAD~1)')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
What it does:
  Shows what changed in each .brain/ file since your last session.
  Uses git diff when .brain/ is tracked; falls back to file modification times.

Examples:
  mindlink diff
  mindlink diff --since HEAD~3
  mindlink diff --since "2026-04-10"
  `)
  .action((opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log('');
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    const results: Record<string, {
      exists: boolean;
      mtime?: number;
      diff?: string | null;
      added?: string[];
      removed?: string[];
      sizeLines?: number;
    }> = {};

    // Get session start timestamp (from .session_ts if available)
    const sessionTsPath = join(brainDir, '.session_ts');
    const sessionTs = existsSync(sessionTsPath)
      ? parseInt(readFileSync(sessionTsPath, 'utf8').trim(), 10) * 1000
      : null;

    const now = Date.now();
    const isGitTracked = (() => {
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: projectPath, stdio: 'pipe' });
        // Check if .brain/ is tracked
        const tracked = execSync('git ls-files --error-unmatch .brain/MEMORY.md', {
          cwd: projectPath, stdio: 'pipe',
        });
        return true;
      } catch {
        return false;
      }
    })();

    for (const file of BRAIN_FILES) {
      const filePath = join(brainDir, file);
      if (!existsSync(filePath)) {
        results[file] = { exists: false };
        continue;
      }
      const stat = statSync(filePath);
      const mtime = stat.mtimeMs;
      const content = readFileSync(filePath, 'utf8');
      const sizeLines = content.split('\n').length;

      let diff: string | null = null;
      let added: string[] = [];
      let removed: string[] = [];

      if (isGitTracked) {
        diff = getGitDiff(filePath, opts.since);
        if (diff) {
          const summary = parseDiffSummary(diff);
          added = summary.added.slice(0, 5);
          removed = summary.removed.slice(0, 5);
        }
      }

      results[file] = { exists: true, mtime, diff, added, removed, sizeLines };
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log('');
    console.log(`  ${chalk.bold('.brain/ changes')}`);
    if (sessionTs) {
      console.log(`  ${chalk.dim(`Session started ${relativeTime(now - sessionTs)}`)}`);
    }
    if (isGitTracked) {
      const sinceRef = opts.since || 'HEAD~1';
      console.log(`  ${chalk.dim(`Git diff against: ${sinceRef}`)}`);
    } else {
      console.log(`  ${chalk.dim('.brain/ is not git-tracked — showing modification times only')}`);
    }
    console.log('');

    for (const file of BRAIN_FILES) {
      const r = results[file];
      if (!r.exists) {
        console.log(`  ${chalk.dim('—')}  ${file}  ${chalk.dim('(not found)')}`);
        continue;
      }

      const age = r.mtime ? relativeTime(now - r.mtime) : '';
      const changedThisSession = sessionTs && r.mtime ? r.mtime > sessionTs : false;
      const indicator = changedThisSession ? chalk.green('●') : chalk.dim('○');
      const label = changedThisSession ? chalk.green(file) : chalk.dim(file);

      console.log(`  ${indicator}  ${label}  ${chalk.dim(`${r.sizeLines} lines · modified ${age}`)}`);

      if (isGitTracked && r.diff) {
        for (const line of (r.added ?? []).slice(0, 3)) {
          console.log(`       ${chalk.green('+')} ${line.length > 80 ? line.slice(0, 80) + '…' : line}`);
        }
        for (const line of (r.removed ?? []).slice(0, 3)) {
          console.log(`       ${chalk.red('-')} ${line.length > 80 ? line.slice(0, 80) + '…' : line}`);
        }
      } else if (!isGitTracked && changedThisSession) {
        console.log(`       ${chalk.dim('(content diff unavailable — commit .brain/ to git for line-level diff)')}`);
      } else if (isGitTracked && !r.diff) {
        console.log(`       ${chalk.dim('no changes since last commit')}`);
      }
    }

    console.log('');

    const changedCount = BRAIN_FILES.filter(f => {
      const r = results[f];
      return r.exists && sessionTs && r.mtime && r.mtime > sessionTs;
    }).length;

    if (changedCount === 0) {
      console.log(`  ${chalk.dim('No .brain/ files were modified this session.')}`);
      if (sessionTs) {
        console.log(`  ${chalk.dim('If the session just started, this is expected.')}`);
      }
    } else {
      console.log(`  ${chalk.green('✓')}  ${changedCount} file${changedCount !== 1 ? 's' : ''} updated this session.`);
    }
    console.log('');
  });
