import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

const GLOBAL_PROFILE_PATH = join(homedir(), '.mindlink', 'USER.md');

function run(args: string, cwd: string): { stdout: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { cwd, encoding: 'utf8' });
    return { stdout, code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', code: err.status ?? 1 };
  }
}

describe('mindlink profile', () => {
  let dir: string;
  let originalProfile: string | null = null;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    // Back up real profile if it exists
    if (existsSync(GLOBAL_PROFILE_PATH)) {
      originalProfile = readFileSync(GLOBAL_PROFILE_PATH, 'utf8');
    } else {
      originalProfile = null;
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    // Restore real profile
    if (originalProfile !== null) {
      writeFileSync(GLOBAL_PROFILE_PATH, originalProfile);
    } else if (existsSync(GLOBAL_PROFILE_PATH)) {
      rmSync(GLOBAL_PROFILE_PATH);
    }
  });

  // ── --path ───────────────────────────────────────────────────────────────────

  test('--path prints the profile file path', () => {
    const result = run('profile --path', dir);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toContain('.mindlink/USER.md');
    expect(result.stdout.trim()).toContain(homedir());
  });

  // ── --show with no profile ────────────────────────────────────────────────────

  test('--show prints warning when no profile exists', () => {
    if (existsSync(GLOBAL_PROFILE_PATH)) rmSync(GLOBAL_PROFILE_PATH);
    const result = run('profile --show', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No global profile yet');
  });

  // ── --show with profile ───────────────────────────────────────────────────────

  test('--show prints profile content when profile exists', () => {
    mkdirSync(join(homedir(), '.mindlink'), { recursive: true });
    writeFileSync(GLOBAL_PROFILE_PATH, '# MindLink — Global User Profile\n\nSenior engineer, TypeScript.\n');
    const result = run('profile --show', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Senior engineer');
  });

  // ── mindlink init imports global profile ─────────────────────────────────────

  test('mindlink init imports global profile into User Profile section', () => {
    mkdirSync(join(homedir(), '.mindlink'), { recursive: true });
    writeFileSync(GLOBAL_PROFILE_PATH, '# MindLink — Global User Profile\n\n> This file is imported.\n\nSenior engineer, 8 years TypeScript. <!-- added: 2026-04-13 -->\n');
    run('init --yes', dir);
    const memoryContent = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memoryContent).toContain('Senior engineer');
  });

  test('mindlink init prints profile imported message', () => {
    mkdirSync(join(homedir(), '.mindlink'), { recursive: true });
    writeFileSync(GLOBAL_PROFILE_PATH, '# MindLink — Global User Profile\n\n> Header line.\n\nSenior engineer, 8 years.\n');
    const result = run('init --yes', dir);
    expect(result.stdout).toContain('User Profile imported');
  });

  test('mindlink init prints profile hint when no profile exists', () => {
    if (existsSync(GLOBAL_PROFILE_PATH)) rmSync(GLOBAL_PROFILE_PATH);
    const result = run('init --yes', dir);
    expect(result.stdout).toContain('mindlink profile');
  });

  // ── mindlink update syncs profile ────────────────────────────────────────────

  test('mindlink update syncs profile changes to registered project', () => {
    // Init first so project is registered
    run('init --yes', dir);
    // Set up profile
    mkdirSync(join(homedir(), '.mindlink'), { recursive: true });
    writeFileSync(GLOBAL_PROFILE_PATH, '# MindLink — Global User Profile\n\n> Header.\n\nUpdated profile content for sync test.\n');
    // Run update (non-interactive: not a TTY so it just outputs JSON + exits)
    execSync(`node ${CLI} update 2>/dev/null || true`, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    const memoryContent = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memoryContent).toContain('Updated profile content for sync test');
  });

  // ── --help ───────────────────────────────────────────────────────────────────

  test('--help describes the command', () => {
    const result = run('profile --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('USER.md');
    expect(result.stdout).toContain('--show');
    expect(result.stdout).toContain('--path');
  });
});
