import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

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

function initProject(dir: string) {
  run('init --yes', dir);
}

const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const SAMPLE_LOG = `## ${TODAY}
**Completed:** Built auth module · Added tests
**Decisions:** Use JWT over sessions
**Next:** Add refresh token support

## ${TODAY}
**Completed:** Refactored DB layer
**Decisions:** Switch to Postgres
**Next:** Run migrations
`;

describe('mindlink recap', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── Not initialized ─────────────────────────────────────────────────────────

  test('exits with error when .brain/ does not exist', () => {
    const result = run('recap', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  // ── No log entries ──────────────────────────────────────────────────────────

  test('exits cleanly with message when LOG.md is empty', () => {
    initProject(dir);
    const result = run('recap', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/no session|no .brain|no log/i);
  });

  // ── With log entries ────────────────────────────────────────────────────────

  test('shows recap header with session count', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);
    const result = run('recap', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Recap');
    expect(result.stdout).toContain('session');
  });

  test('shows completed items from log', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);
    const result = run('recap', dir);
    // Should extract items from Completed field
    expect(result.stdout).toMatch(/auth module|refactored|DB layer|got done/i);
  });

  test('--days flag filters by date range', () => {
    initProject(dir);
    // Write a log with a very old entry
    const oldLog = `## Jan 1, 2020\n**Completed:** Ancient work\n**Next:** Nothing\n`;
    writeFileSync(join(dir, '.brain/LOG.md'), oldLog);
    const result = run('recap --days 7', dir);
    expect(result.code).toBe(0);
    // Old entry should not appear as a completed item
    expect(result.stdout).not.toContain('Ancient work');
  });

  test('--sessions flag limits number of sessions included', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/LOG.md'), SAMPLE_LOG);
    const result = run('recap --sessions 1', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('1 session');
  });

  test('shows graceful message when no structured content found', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/LOG.md'), `## ${TODAY}\nJust some unstructured notes.\n`);
    const result = run('recap', dir);
    expect(result.code).toBe(0);
    // Should not crash — graceful fallback message
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});
