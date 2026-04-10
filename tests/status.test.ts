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

describe('brainlink status', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── Not initialized ────────────────────────────────────────────────────────

  test('exits with error when .brain/ does not exist', () => {
    const result = run('status', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('error output tells user to run brainlink init', () => {
    const result = run('status', dir);
    expect(result.stdout).toContain('brainlink init');
  });

  // ── Fresh project (no sessions yet) ───────────────────────────────────────

  test('shows empty state message on freshly initialized project', () => {
    initProject(dir);
    const result = run('status', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No sessions logged yet');
  });

  // ── Populated SESSION.md ───────────────────────────────────────────────────

  test('shows current task when SESSION.md has content', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task
Build the authentication module

## In Progress
- Writing JWT middleware
- Setting up token refresh

## Decisions Made This Session
- Use RS256 algorithm for JWT signing

## Blockers

## Up Next
- Write unit tests for auth
- Connect to user database
`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Build the authentication module');
  });

  test('shows in-progress items', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task
Build auth

## In Progress
- Writing JWT middleware
- Setting up token refresh

## Decisions Made This Session

## Blockers

## Up Next
`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Writing JWT middleware');
    expect(result.stdout).toContain('Setting up token refresh');
  });

  test('shows up-next items with arrow indicators', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task

## In Progress

## Decisions Made This Session

## Blockers

## Up Next
- Write unit tests
- Hook up database
`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Write unit tests');
    expect(result.stdout).toContain('Hook up database');
    expect(result.stdout).toContain('→');
  });

  test('shows decisions made this session', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task

## In Progress

## Decisions Made This Session
- Use RS256 for JWT
- Store tokens in httpOnly cookies

## Blockers

## Up Next
`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Use RS256 for JWT');
    expect(result.stdout).toContain('Store tokens in httpOnly cookies');
  });

  test('shows blockers when present', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task

## In Progress

## Decisions Made This Session

## Blockers
- Waiting for API keys from client

## Up Next
`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Waiting for API keys from client');
    expect(result.stdout).toContain('✗');
  });

  // ── LOG.md stats ───────────────────────────────────────────────────────────

  test('shows session count from LOG.md', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session\n## Current Task\nSomething\n## In Progress\n## Decisions Made This Session\n## Blockers\n## Up Next\n`);
    writeFileSync(join(dir, '.brain/LOG.md'), `# Session Log\n\n## Apr 9, 2026\nBuilt the auth module.\n\n## Apr 8, 2026\nSet up the project.\n`);
    const result = run('status', dir);
    expect(result.stdout).toContain('2'); // 2 sessions
  });

  test('shows last session date from LOG.md', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session\n## Current Task\nSomething\n## In Progress\n## Decisions Made This Session\n## Blockers\n## Up Next\n`);
    writeFileSync(join(dir, '.brain/LOG.md'), `# Session Log\n\n## Apr 9, 2026\nBuilt things.\n`);
    const result = run('status', dir);
    expect(result.stdout).toContain('Apr 9, 2026');
  });

  test('shows brainlink log hint at the bottom', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session\n## Current Task\nSomething\n## In Progress\n## Decisions Made This Session\n## Blockers\n## Up Next\n`);
    const result = run('status', dir);
    expect(result.stdout).toContain('brainlink log');
  });

  // ── JSON output ────────────────────────────────────────────────────────────

  test('--json outputs valid JSON', () => {
    initProject(dir);
    const result = run('status --json', dir);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  test('--json includes expected keys', () => {
    initProject(dir);
    const result = run('status --json', dir);
    const data = JSON.parse(result.stdout);
    expect(data).toHaveProperty('currentTask');
    expect(data).toHaveProperty('inProgress');
    expect(data).toHaveProperty('upNext');
    expect(data).toHaveProperty('stats');
    expect(data.stats).toHaveProperty('sessionsLogged');
    expect(data.stats).toHaveProperty('decisionsMade');
    expect(data.stats).toHaveProperty('lastUpdated');
  });

  test('--json reflects SESSION.md content', () => {
    initProject(dir);
    writeFileSync(join(dir, '.brain/SESSION.md'), `# Current Session

## Current Task
Write the payment module

## In Progress
- Stripe integration

## Decisions Made This Session

## Blockers

## Up Next
- Add webhook handler
`);
    const result = run('status --json', dir);
    const data = JSON.parse(result.stdout);
    expect(data.currentTask).toBe('Write the payment module');
    expect(data.inProgress).toContain('Stripe integration');
    expect(data.upNext).toContain('Add webhook handler');
  });

  // ── Help ───────────────────────────────────────────────────────────────────

  test('--help exits successfully', () => {
    const result = run('status --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('brainlink status');
  });
});

// ── Parser utilities ──────────────────────────────────────────────────────────

import { extractSection, extractBullets, countLogEntries, lastLogDate, countDecisions } from '../src/utils/parser.js';

describe('parser utilities', () => {
  test('extractSection returns content under a heading', () => {
    const md = `# Title\n\n## Section A\nContent A\n\n## Section B\nContent B`;
    expect(extractSection(md, 'Section A')).toBe('Content A');
  });

  test('extractSection is case-insensitive', () => {
    const md = `## UP NEXT\n- item one`;
    expect(extractSection(md, 'up next')).toContain('item one');
  });

  test('extractSection returns empty string when heading not found', () => {
    const md = `## Existing\nContent`;
    expect(extractSection(md, 'Missing')).toBe('');
  });

  test('extractBullets parses dash-prefixed items', () => {
    const text = `- Item one\n- Item two\n- Item three`;
    expect(extractBullets(text)).toEqual(['Item one', 'Item two', 'Item three']);
  });

  test('extractBullets ignores comment placeholders', () => {
    const text = `- Real item\n- <!-- placeholder -->`;
    const result = extractBullets(text);
    expect(result).toContain('Real item');
    expect(result.some(i => i.includes('<!--'))).toBe(false);
  });

  test('countLogEntries counts ## headings in LOG.md', () => {
    const log = `# Log\n\n## Apr 9\nEntry.\n\n## Apr 8\nEntry.`;
    expect(countLogEntries(log)).toBe(2);
  });

  test('countLogEntries returns 0 for empty log', () => {
    expect(countLogEntries('# Session Log\n')).toBe(0);
  });

  test('lastLogDate returns first ## heading content', () => {
    const log = `# Log\n\n## Apr 9, 2026\nEntry.`;
    expect(lastLogDate(log)).toBe('Apr 9, 2026');
  });

  test('lastLogDate returns null when no entries', () => {
    expect(lastLogDate('# Session Log\n')).toBeNull();
  });

  test('countDecisions counts table rows in Key Decisions', () => {
    const md = `# Memory\n\n## Key Decisions\n\n| Decision | What | Why |\n|---|---|---|\n| Use JWT | JWT | Fast |\n| Use Postgres | PG | Reliable |`;
    expect(countDecisions(md)).toBe(2);
  });
});
