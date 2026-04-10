import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
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

describe('brainlink clear', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('clear --yes', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('resets SESSION.md to template content', () => {
    run('init --yes', dir);

    // Write custom content to SESSION.md
    writeFileSync(join(dir, '.brain/SESSION.md'), '# My custom session\n## Current task\nDoing stuff\n');

    run('clear --yes', dir);

    const content = readFileSync(join(dir, '.brain/SESSION.md'), 'utf8');
    expect(content).not.toContain('My custom session');
    expect(content.length).toBeGreaterThan(0);
  });

  test('does not touch MEMORY.md', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/MEMORY.md'), '# My custom memory\n');

    run('clear --yes', dir);

    const content = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(content).toBe('# My custom memory\n');
  });

  test('does not touch LOG.md', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/LOG.md'), '# Log\n## Apr 9, 2026\nDone stuff.\n');

    run('clear --yes', dir);

    const content = readFileSync(join(dir, '.brain/LOG.md'), 'utf8');
    expect(content).toContain('Apr 9, 2026');
  });

  test('output confirms session cleared', () => {
    run('init --yes', dir);
    const result = run('clear --yes', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('cleared');
  });
});
