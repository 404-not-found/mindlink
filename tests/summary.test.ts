import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
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

describe('mindlink summary', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('summary', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('shows empty message on blank memory', () => {
    run('init --yes', dir);
    const result = run('summary', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('MindLink');
  });

  test('shows project overview when MEMORY.md has content', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/MEMORY.md'), `# Memory\n\n## Project Overview\n\nThis is a todo app.\n`);
    const result = run('summary', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('todo app');
  });

  test('shows session task when SESSION.md has current task', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Session\n\n## Current Task\n\nBuild the login page.\n`);
    const result = run('summary', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('login page');
  });

  test('shows shared context when SHARED.md has content', () => {
    run('init --yes', dir);
    writeFileSync(join(dir, '.brain/SHARED.md'), `# Shared\n\nSession A found: use Postgres.\n`);
    const result = run('summary', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Postgres');
  });

  test('--json outputs valid JSON', () => {
    run('init --yes', dir);
    const result = run('summary --json', dir);
    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('project');
    expect(parsed).toHaveProperty('session');
    expect(parsed).toHaveProperty('log');
    expect(parsed).toHaveProperty('shared');
  });

  test('--help shows description', () => {
    const result = run('summary --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('briefing');
  });
});
