import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

function run(args: string, cwd: string): { stdout: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { cwd, encoding: 'utf8' });
    return { stdout, code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', code: err.status ?? 1 };
  }
}

describe('brainlink uninstall', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('uninstall --yes', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('Nothing to uninstall');
  });

  test('removes .brain/ directory', () => {
    run('init --yes', dir);
    expect(existsSync(join(dir, '.brain'))).toBe(true);

    run('uninstall --yes', dir);
    expect(existsSync(join(dir, '.brain'))).toBe(false);
  });

  test('removes agent instruction files', () => {
    run('init --yes', dir);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);

    run('uninstall --yes', dir);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false);
  });

  test('removes .claude/settings.json hook', () => {
    run('init --yes', dir);
    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(true);

    run('uninstall --yes', dir);
    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(false);
  });

  test('output confirms removal and hints at CLI uninstall', () => {
    run('init --yes', dir);
    const result = run('uninstall --yes', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('removed');
    expect(result.stdout).toContain('npm uninstall -g brainlink');
  });

  test('--help shows what gets removed', () => {
    const result = run('uninstall --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('.brain/');
  });
});
