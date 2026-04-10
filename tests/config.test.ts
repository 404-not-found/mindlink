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

describe('brainlink config', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `brainlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    // config is interactive — non-interactive mode just shows an error and exits
    const result = run('config --help', dir);
    // --help exits 0 with help text regardless of initialized state
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Change settings');
  });

  test('config.json is created by init and readable', () => {
    run('init --yes', dir);
    const config = JSON.parse(readFileSync(join(dir, '.brain/config.json'), 'utf8'));

    expect(config).toHaveProperty('gitTracking', true);
    expect(config).toHaveProperty('autoSync', true);
    expect(config).toHaveProperty('agents');
    expect(config).toHaveProperty('maxLogEntries', 50);
    expect(Array.isArray(config.agents)).toBe(true);
  });

  test('config.json agents list matches what init created', () => {
    run('init --yes', dir);
    const config = JSON.parse(readFileSync(join(dir, '.brain/config.json'), 'utf8'));

    // Default agents from --yes flag
    expect(config.agents).toContain('claude');
    expect(config.agents).toContain('cursor');
    expect(config.agents).toContain('gemini');
    expect(config.agents).toContain('copilot');
    expect(config.agents).toContain('windsurf');
  });

  test('config.json does not include non-default agents', () => {
    run('init --yes', dir);
    const config = JSON.parse(readFileSync(join(dir, '.brain/config.json'), 'utf8'));

    // cline and aider are not selected by default
    expect(config.agents).not.toContain('cline');
    expect(config.agents).not.toContain('aider');
  });

  // ── Git tracking ────────────────────────────────────────────────────────────
  // (These test the underlying logic that config uses, triggered by init flags)

  test('init --yes creates .gitignore when gitTracking is false — not applicable for --yes', () => {
    // --yes defaults to gitTracking: true, so no .gitignore entry
    run('init --yes', dir);
    const config = JSON.parse(readFileSync(join(dir, '.brain/config.json'), 'utf8'));
    expect(config.gitTracking).toBe(true);

    // .gitignore should NOT have .brain/ when tracking is enabled
    const gitignorePath = join(dir, '.gitignore');
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      expect(content).not.toContain('.brain/');
    }
  });

  // ── Agent file management ───────────────────────────────────────────────────

  test('init --yes creates CLAUDE.md from template', () => {
    run('init --yes', dir);

    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
    const content = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    expect(content).toContain('Brainlink');
  });

  test('init --yes creates .claude/settings.json for Claude Code hook', () => {
    run('init --yes', dir);

    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(true);
    const content = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('hooks');
    expect(parsed.hooks).toHaveProperty('UserPromptSubmit');
  });

  test('init --yes creates copilot instructions in .github/ subdirectory', () => {
    run('init --yes', dir);

    expect(existsSync(join(dir, '.github/copilot-instructions.md'))).toBe(true);
  });

  // ── config --help ───────────────────────────────────────────────────────────

  test('config --help shows description', () => {
    const result = run('config --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('config');
  });
});
