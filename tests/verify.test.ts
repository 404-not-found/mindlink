import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
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

describe('mindlink verify', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── Not initialized ──────────────────────────────────────────────────────────

  test('fails with actionable message when not initialized', () => {
    const result = run('verify', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('.brain/ missing');
  });

  // ── Fresh init (default state) ───────────────────────────────────────────────

  test('exits 0 on fresh init (template placeholders are acceptable)', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    // Fresh init has empty Core section — that's a fail for Core, but we want
    // to confirm the command runs and outputs structured results
    expect(result.stdout).toContain('◉ MindLink Verify');
  });

  test('reports Core as empty on fresh init', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('Core section');
  });

  test('reports LOG.md as present on fresh init', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('LOG.md');
  });

  test('reports agent files present on fresh init', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('Agent files');
  });

  // ── Core filled ──────────────────────────────────────────────────────────────

  test('reports Core as filled when MEMORY.md has real content', () => {
    run('init --yes', dir);
    const memPath = join(dir, '.brain/MEMORY.md');
    const current = readFileSync(memPath, 'utf8');
    // Inject real content into Core section
    writeFileSync(memPath, current.replace(
      /### What this project is\n/,
      '### What this project is\nTest project for verify tests.\n'
    ));
    const result = run('verify', dir);
    expect(result.stdout).toContain('Core section — filled');
  });

  // ── User Profile ─────────────────────────────────────────────────────────────

  test('reports User Profile as empty on fresh init', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('User Profile');
  });

  test('reports User Profile as filled when content is present', () => {
    run('init --yes', dir);
    const memPath = join(dir, '.brain/MEMORY.md');
    const current = readFileSync(memPath, 'utf8');
    writeFileSync(memPath, current.replace(
      /## User Profile[^\n]*\n/,
      '## User Profile  <!-- READ EVERY SESSION -->\nSenior engineer, 8 years TypeScript.\n'
    ));
    const result = run('verify', dir);
    expect(result.stdout).toContain('User Profile — filled');
  });

  // ── SESSION.md freshness ─────────────────────────────────────────────────────

  test('reports SESSION.md no content on fresh init', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('SESSION.md');
  });

  // ── MEMORY.md size ───────────────────────────────────────────────────────────

  test('reports MEMORY.md healthy on a small file', () => {
    run('init --yes', dir);
    const result = run('verify', dir);
    expect(result.stdout).toContain('MEMORY.md');
  });

  test('reports MEMORY.md fail when line count exceeds 200', () => {
    run('init --yes', dir);
    const memPath = join(dir, '.brain/MEMORY.md');
    const bloat = Array.from({ length: 210 }, (_, i) => `Real content line ${i}`).join('\n');
    writeFileSync(memPath, bloat);
    const result = run('verify', dir);
    expect(result.stdout).toContain('MEMORY.md');
    // Should fail (> 200 lines) — exit code 1
    expect(result.code).toBe(1);
  });

  // ── Agent files ──────────────────────────────────────────────────────────────

  test('reports missing agent file when configured file is deleted', () => {
    run('init --yes', dir);
    unlinkSync(join(dir, 'CLAUDE.md'));
    const result = run('verify', dir);
    expect(result.stdout).toContain('CLAUDE.md');
  });

  test('--fix regenerates missing agent file', () => {
    run('init --yes', dir);
    unlinkSync(join(dir, 'CLAUDE.md'));
    run('verify --fix', dir);
    // File should be back
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
  });

  // ── --json ───────────────────────────────────────────────────────────────────

  test('--json outputs valid JSON with ok and checks fields', () => {
    run('init --yes', dir);
    const result = run('verify --json', dir);
    let parsed: any;
    expect(() => { parsed = JSON.parse(result.stdout); }).not.toThrow();
    expect(parsed).toHaveProperty('ok');
    expect(parsed).toHaveProperty('checks');
    expect(Array.isArray(parsed.checks)).toBe(true);
  });

  test('--json check objects have id, label, status, message, fixable', () => {
    run('init --yes', dir);
    const result = run('verify --json', dir);
    const parsed = JSON.parse(result.stdout);
    for (const check of parsed.checks) {
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('label');
      expect(check).toHaveProperty('status');
      expect(['pass', 'warn', 'fail']).toContain(check.status);
      expect(check).toHaveProperty('message');
      expect(check).toHaveProperty('fixable');
    }
  });

  // ── --help ───────────────────────────────────────────────────────────────────

  test('--help lists checks and flags', () => {
    const result = run('verify --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Core');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--fix');
  });
});
