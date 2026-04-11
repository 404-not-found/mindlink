import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

function run(args: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, { encoding: 'utf8' });
    return { stdout, stderr: '', code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.status ?? 1 };
  }
}

describe('mindlink update', () => {
  test('--help shows description', () => {
    const result = run('update --help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Update mindlink');
  });

  test('--help shows example', () => {
    const result = run('update --help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('mindlink update');
  });
});
