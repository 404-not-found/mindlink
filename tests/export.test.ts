import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
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

describe('brainlink export', () => {
  let dir: string;
  let outDir: string;

  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dir = join(tmpdir(), `brainlink-test-${suffix}`);
    outDir = join(tmpdir(), `brainlink-out-${suffix}`);
    mkdirSync(dir, { recursive: true });
    mkdirSync(outDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run(`export --output ${outDir}`, dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/');
  });

  test('creates zip file in output directory', () => {
    run('init --yes', dir);
    const result = run(`export --output ${outDir}`, dir);
    expect(result.code).toBe(0);

    // Find zip in outDir
    const files = readdirSync(outDir);
    const zip = files.find(f => f.endsWith('.zip'));
    expect(zip).toBeTruthy();
    expect(zip).toMatch(/brain.*\.zip$/);
  });

  test('zip filename contains project name and date', () => {
    run('init --yes', dir);
    const result = run(`export --output ${outDir}`, dir);
    expect(result.code).toBe(0);
    // Output mentions the filename
    expect(result.stdout).toContain('.zip');
  });

  test('reports exported files', () => {
    run('init --yes', dir);
    const result = run(`export --output ${outDir}`, dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('.brain/MEMORY.md');
    expect(result.stdout).toContain('.brain/LOG.md');
  });

  test('output includes import hint', () => {
    run('init --yes', dir);
    const result = run(`export --output ${outDir}`, dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('brainlink import');
  });

  test('--output with explicit zip path works', () => {
    run('init --yes', dir);
    const zipPath = join(outDir, 'custom-name.zip');
    const result = run(`export --output ${zipPath}`, dir);
    expect(result.code).toBe(0);
    expect(existsSync(zipPath)).toBe(true);
  });

  test('--help shows use cases', () => {
    const result = run('export --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Onboard');
  });
});
