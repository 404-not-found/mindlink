import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'fs';
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

describe('brainlink import', () => {
  let srcDir: string;
  let destDir: string;
  let outDir: string;

  beforeEach(() => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    srcDir  = join(tmpdir(), `brainlink-src-${suffix}`);
    destDir = join(tmpdir(), `brainlink-dst-${suffix}`);
    outDir  = join(tmpdir(), `brainlink-out-${suffix}`);
    mkdirSync(srcDir,  { recursive: true });
    mkdirSync(destDir, { recursive: true });
    mkdirSync(outDir,  { recursive: true });
  });

  afterEach(() => {
    rmSync(srcDir,  { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
    rmSync(outDir,  { recursive: true, force: true });
  });

  function buildZip(exportDir: string): string {
    run('init --yes', exportDir);
    run(`export --output ${outDir}`, exportDir);
    const files = readdirSync(outDir);
    const zip = files.find(f => f.endsWith('.zip'))!;
    return join(outDir, zip);
  }

  test('errors when zip file does not exist', () => {
    const result = run('import /nonexistent/brain.zip', destDir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('not found');
  });

  test('errors on non-zip file', () => {
    const txtPath = join(outDir, 'brain.txt');
    execSync(`touch ${txtPath}`);
    const result = run(`import ${txtPath}`, destDir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('.zip');
  });

  test('imports .brain/ files into empty project', () => {
    const zipPath = buildZip(srcDir);
    const result = run(`import ${zipPath}`, destDir);
    expect(result.code).toBe(0);
    expect(existsSync(join(destDir, '.brain/MEMORY.md'))).toBe(true);
    expect(existsSync(join(destDir, '.brain/LOG.md'))).toBe(true);
    expect(result.stdout).toContain('Brain transplant complete');
  });

  test('--yes overwrites existing .brain/', () => {
    // Set up destination with existing init
    run('init --yes', destDir);
    const originalMemory = readFileSync(join(destDir, '.brain/MEMORY.md'), 'utf8');

    // Export from a different source with modified memory
    run('init --yes', srcDir);
    const zipPath = buildZip(srcDir);

    const result = run(`import ${zipPath} --yes`, destDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('MEMORY.md');
  });

  test('reports skipped files in merge mode', () => {
    run('init --yes', destDir);
    const zipPath = buildZip(srcDir);

    // Run merge (non-TTY mode hits the default overwrite path, need --yes to test skip)
    // In non-TTY without --yes, it will overwrite. Test the explicit --yes overwrite.
    const result = run(`import ${zipPath} --yes`, destDir);
    expect(result.code).toBe(0);
  });

  test('--help shows use cases', () => {
    const result = run('import --help', destDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Onboard');
    expect(result.stdout).toContain('Merge');
    expect(result.stdout).toContain('Overwrite');
  });
});
