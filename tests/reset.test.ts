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

describe('mindlink reset', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('errors when not initialized', () => {
    const result = run('reset --yes', dir);
    expect(result.code).not.toBe(0);
    expect(result.stdout).toContain('No .brain/ found');
  });

  test('resets all four brain files to template content', () => {
    run('init --yes', dir);

    // Overwrite all four files with custom content
    for (const file of ['MEMORY.md', 'SESSION.md', 'SHARED.md', 'LOG.md']) {
      writeFileSync(join(dir, `.brain/${file}`), `# Custom ${file}\n`);
    }

    run('reset --yes', dir);

    // All files should now be blank templates (not the custom content)
    for (const file of ['MEMORY.md', 'SESSION.md', 'SHARED.md', 'LOG.md']) {
      const content = readFileSync(join(dir, `.brain/${file}`), 'utf8');
      expect(content).not.toContain(`Custom ${file}`);
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('preserves config.json', () => {
    run('init --yes', dir);
    const configBefore = readFileSync(join(dir, '.brain/config.json'), 'utf8');

    run('reset --yes', dir);

    const configAfter = readFileSync(join(dir, '.brain/config.json'), 'utf8');
    expect(configAfter).toBe(configBefore);
  });

  test('output confirms reset success', () => {
    run('init --yes', dir);
    const result = run('reset --yes', dir);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('reset');
  });

  test('does not remove agent instruction files', () => {
    run('init --yes', dir);

    run('reset --yes', dir);

    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
  });
});
