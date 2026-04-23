import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
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

function writeMemory(dir: string, content: string) {
  writeFileSync(join(dir, '.brain/MEMORY.md'), content);
}

const SAMPLE_MEMORY = `# Project Memory

## Core  <!-- READ EVERY SESSION -->

### What this project is
My test project using Postgres for data storage

### Stack
Node.js + TypeScript + Postgres

### Top decisions
- Use Postgres over MySQL for JSON support

### Current focus
Building auth module

---

## Architecture  <!-- Read when the task involves project structure -->

API routes in src/routes/
Auth middleware in src/middleware/

---

## Decisions  <!-- Read when making a choice -->

| Decision | What was decided | Why |
|---|---|---|
| Database | Postgres | JSON support |
| Auth | JWT | Stateless |

---

## Conventions  <!-- Read when writing code -->

Use camelCase for variables

---

## User Profile  <!-- READ EVERY SESSION -->

Senior engineer, 8 years experience

---

## Important Context  <!-- Read when something feels off -->

Stripe integration has known rate limit issues
`;

describe('mindlink search', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── No projects ─────────────────────────────────────────────────────────────

  test('exits cleanly when no projects found', () => {
    const result = run('search "postgres"', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/no mindlink projects|no .brain/i);
  });

  // ── With project ─────────────────────────────────────────────────────────────

  test('finds match in MEMORY.md', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    const result = run('search "postgres"', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/postgres/i);
  });

  test('shows project name in output', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    const result = run('search "postgres"', dir);
    expect(result.stdout).toContain('MEMORY.md');
  });

  test('shows no matches message when query not found', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    const result = run('search "xyznotfound"', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No matches');
  });

  test('--section flag filters to specific section', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    // "Postgres" appears in Core and Decisions — with --section decisions should still find it
    const result = run('search "postgres" --section decisions', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/postgres|Decisions/i);
  });

  test('--section flag excludes non-matching sections', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    // "camelCase" only in Conventions — searching in Decisions should not find it
    const result = run('search "camelCase" --section decisions', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No matches');
  });

  test('--log flag searches LOG.md', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    writeFileSync(join(dir, '.brain/LOG.md'), '## Apr 22, 2026\nCompleted: stripe integration\n');
    const result = run('search "stripe" --log', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/stripe/i);
  });

  test('regex pattern search works', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    // Simple regex — case insensitive match
    const result = run('search "post.*gres"', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/postgres/i);
  });

  test('invalid regex falls back to literal search', () => {
    initProject(dir);
    writeMemory(dir, SAMPLE_MEMORY);
    // "[invalid" is an invalid regex
    const result = run('search "[invalid"', dir);
    expect(result.code).toBe(0);
    // Should not throw — graceful fallback
  });
});
