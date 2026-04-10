import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseLogEntries } from '../src/utils/parser.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

function run(args: string, cwd: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { cwd, encoding: 'utf8' });
    return { stdout, stderr: '', code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 };
  }
}

const SAMPLE_LOG = `# Session Log

## Apr 9, 2026
Scaffolded auth module. Decided on JWT.

## Apr 8, 2026
Set up project structure. Chose Postgres.

## Apr 7, 2026
Initial planning session.
`;

describe('parseLogEntries', () => {
  test('parses entries from LOG.md', () => {
    const entries = parseLogEntries(SAMPLE_LOG);
    expect(entries).toHaveLength(3);
    expect(entries[0].heading).toBe('Apr 9, 2026');
    expect(entries[0].body).toContain('JWT');
    expect(entries[1].heading).toBe('Apr 8, 2026');
    expect(entries[2].heading).toBe('Apr 7, 2026');
  });

  test('returns empty array for empty log', () => {
    expect(parseLogEntries('# Session Log\n')).toHaveLength(0);
    expect(parseLogEntries('')).toHaveLength(0);
  });

  test('handles entries with no body', () => {
    const log = '## Apr 9, 2026\n## Apr 8, 2026\n';
    const entries = parseLogEntries(log);
    expect(entries).toHaveLength(2);
    expect(entries[0].body).toBe('');
  });
});

describe('brainlink log', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('log', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('shows empty message when no sessions logged', () => {
    run('init --yes', dir);
    const result = run('log', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No sessions logged');
  });

  test('shows log entries after sessions are written', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);

    const result = run('log', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Apr 9, 2026');
    expect(result.stdout).toContain('Apr 8, 2026');
  });

  test('--limit restricts number of entries shown', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);

    const result = run('log --limit 1', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Apr 9, 2026');
    expect(result.stdout).not.toContain('Apr 7, 2026');
  });

  test('--all shows every entry', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);

    const result = run('log --all', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Apr 9, 2026');
    expect(result.stdout).toContain('Apr 7, 2026');
  });

  test('--since filters entries by date text', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);

    const result = run('log --since "Apr 8"', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Apr 8, 2026');
    expect(result.stdout).not.toContain('Apr 9, 2026');
    expect(result.stdout).not.toContain('Apr 7, 2026');
  });

  test('--json outputs valid JSON array', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);

    const result = run('log --json', dir);

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('heading');
    expect(parsed[0]).toHaveProperty('body');
  });
});
