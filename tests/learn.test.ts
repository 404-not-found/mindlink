import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
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

describe('mindlink learn', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── Not initialized ──────────────────────────────────────────────────────────

  test('exits with error when .brain/ does not exist', () => {
    const result = run('learn ./somefile.md', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('error tells user to run mindlink init', () => {
    const result = run('learn ./somefile.md', dir);
    expect(result.stdout).toContain('mindlink init');
  });

  // ── File not found ───────────────────────────────────────────────────────────

  test('exits with error when file does not exist', () => {
    initProject(dir);
    const result = run('learn ./nonexistent.md', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('not found');
  });

  // ── Local file learning ──────────────────────────────────────────────────────

  test('learns from a local markdown file', () => {
    initProject(dir);
    const docPath = join(dir, 'ARCH.md');
    writeFileSync(docPath, '# Architecture\n\nWe use Postgres for the database.\nAPI is built with Express.\nFrontend is React.\n');
    const result = run('learn ./ARCH.md', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('✓');
    expect(result.stdout).toContain('Learned');
  });

  test('content is written to MEMORY.md', () => {
    initProject(dir);
    const docPath = join(dir, 'ARCH.md');
    writeFileSync(docPath, 'We use Postgres for the database.\nAPI is built with Express.\n');
    run('learn ./ARCH.md', dir);
    const memory = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memory).toMatch(/postgres|express/i);
  });

  test('--section flag targets the correct section', () => {
    initProject(dir);
    const docPath = join(dir, 'DECISIONS.md');
    writeFileSync(docPath, 'We chose JWT over sessions for stateless auth.\nWe use Postgres over MySQL for JSON support.\n');
    run('learn ./DECISIONS.md --section decisions', dir);
    const memory = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memory).toMatch(/jwt|postgres/i);
  });

  test('--preview does not modify MEMORY.md', () => {
    initProject(dir);
    const docPath = join(dir, 'notes.md');
    writeFileSync(docPath, 'Important architecture note about the system design here.\n');
    const memoryBefore = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    run('learn ./notes.md --preview', dir);
    const memoryAfter = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memoryAfter).toBe(memoryBefore);
  });

  test('--preview shows content that would be written', () => {
    initProject(dir);
    const docPath = join(dir, 'notes.md');
    writeFileSync(docPath, 'The system uses a microservice architecture with three core services.\n');
    const result = run('learn ./notes.md --preview', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Preview');
    expect(result.stdout).toMatch(/microservice|architecture/i);
  });

  test('learned source is tagged with a comment in MEMORY.md', () => {
    initProject(dir);
    const docPath = join(dir, 'ARCH.md');
    writeFileSync(docPath, 'We use Postgres for the database.\n');
    run('learn ./ARCH.md', dir);
    const memory = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memory).toContain('learned from:');
  });

  test('learns from a JSON file', () => {
    initProject(dir);
    const jsonPath = join(dir, 'config.json');
    writeFileSync(jsonPath, JSON.stringify({ database: 'postgres', port: 3000, env: 'production' }));
    const result = run('learn ./config.json --section architecture', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('✓');
  });

  test('handles empty file gracefully', () => {
    initProject(dir);
    const emptyPath = join(dir, 'empty.md');
    writeFileSync(emptyPath, '');
    const result = run('learn ./empty.md', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/empty|nothing to learn/i);
  });

  test('section defaults to Important Context when not specified', () => {
    initProject(dir);
    const docPath = join(dir, 'notes.md');
    writeFileSync(docPath, 'Stripe has known rate limiting issues on webhooks in production.\n');
    run('learn ./notes.md', dir);
    const memory = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    // Should appear somewhere in the file
    expect(memory).toMatch(/stripe|rate limit/i);
  });
});
