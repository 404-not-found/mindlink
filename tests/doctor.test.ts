import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, unlinkSync } from 'fs';
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

describe('brainlink doctor', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('fails when not initialized', () => {
    const result = run('doctor', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('.brain/ missing');
  });

  test('exits 0 on a fresh init (warnings allowed, no failures)', () => {
    run('init --yes', dir);
    const result = run('doctor', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('problems found');
    expect(result.stdout).toContain('.brain/ found');
  });

  test('warns when MEMORY.md is missing', () => {
    run('init --yes', dir);
    unlinkSync(join(dir, '.brain/MEMORY.md'));
    const result = run('doctor', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('MEMORY.md missing');
  });

  test('warns when SESSION.md is missing', () => {
    run('init --yes', dir);
    unlinkSync(join(dir, '.brain/SESSION.md'));
    const result = run('doctor', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('SESSION.md missing');
  });

  test('shows warning for config.json with no agents', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/config.json'), JSON.stringify({ agents: [], gitTracking: true, autoSync: true }));
    const result = run('doctor', dir);
    expect(result.stdout).toContain('No agents configured');
  });

  test('--help shows what gets checked', () => {
    const result = run('doctor --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('MEMORY.md');
    expect(result.stdout).toContain('SESSION.md');
    expect(result.stdout).toContain('LOG.md');
  });
});
