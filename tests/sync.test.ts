import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

function run(args: string, cwd: string, timeoutMs = 8000): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { cwd, encoding: 'utf8', timeout: timeoutMs });
    return { stdout, stderr: '', code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 };
  }
}

describe('mindlink sync', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('sync --once', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('--once exits successfully when initialized', () => {
    run('init --yes', dir);
    const result = run('sync --once', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('All sessions share');
  });

  test('--once shows all four brain files', () => {
    run('init --yes', dir);
    const result = run('sync --once', dir);

    expect(result.stdout).toContain('SHARED.md');
    expect(result.stdout).toContain('SESSION.md');
    expect(result.stdout).toContain('LOG.md');
    expect(result.stdout).toContain('MEMORY.md');
  });

  test('--once shows non-empty SHARED.md when entries exist', () => {
    run('init --yes', dir);
    writeFileSync(
      join(dir, '.brain/SHARED.md'),
      '# Shared Context\n\nSession A discovered: use Postgres for the DB.\nSession B noted: auth uses JWT.\n'
    );

    const result = run('sync --once', dir);
    expect(result.code).toBe(0);
    // Should show some count for the lines
    expect(result.stdout).toContain('SHARED.md');
  });

  test('--help shows description', () => {
    const result = run('sync --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Sync shared context');
  });
});
