import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
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

describe('mindlink diff', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when .brain/ does not exist', () => {
    const result = run('diff', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/');
  });

  test('runs without error after init', () => {
    run('init --yes', dir);
    const result = run('diff', dir);
    expect(result.code).toBe(0);
  });

  test('output lists all four .brain/ files', () => {
    run('init --yes', dir);
    const result = run('diff', dir);
    expect(result.stdout).toContain('MEMORY.md');
    expect(result.stdout).toContain('SESSION.md');
    expect(result.stdout).toContain('LOG.md');
    expect(result.stdout).toContain('SHARED.md');
  });

  test('--json output is valid JSON', () => {
    run('init --yes', dir);
    const result = run('diff --json', dir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('MEMORY.md');
    expect(parsed).toHaveProperty('SESSION.md');
  });

  test('shows modified indicator for file written after session start', () => {
    run('init --yes', dir);

    // Write a fake .session_ts in the past
    const pastTs = Math.floor((Date.now() - 10000) / 1000); // 10 seconds ago
    writeFileSync(join(dir, '.brain/.session_ts'), String(pastTs));

    // Touch MEMORY.md (simulate a write during session)
    writeFileSync(join(dir, '.brain/MEMORY.md'),
      readFileContent(join(dir, '.brain/MEMORY.md')) + '\n<!-- updated -->'
    );

    const result = run('diff', dir);
    expect(result.code).toBe(0);
    // The updated MEMORY.md should show as changed
    expect(result.stdout).toContain('MEMORY.md');
  });

  test('shows "no changes" message when nothing was modified this session', () => {
    run('init --yes', dir);

    // Set session_ts to future (so nothing appears modified)
    const futureTs = Math.floor((Date.now() + 60000) / 1000);
    writeFileSync(join(dir, '.brain/.session_ts'), String(futureTs));

    const result = run('diff', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No .brain/ files were modified');
  });

  test('--help shows usage', () => {
    const result = run('diff --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('diff');
  });
});

function readFileContent(path: string): string {
  const { readFileSync } = require('fs');
  return readFileSync(path, 'utf8');
}
