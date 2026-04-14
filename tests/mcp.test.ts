import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawn, ChildProcess } from 'child_process';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI = resolve(__dirname, '../dist/cli.js');

function run(args: string, cwd: string, env?: Record<string, string>): { stdout: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    return { stdout, code: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', code: err.status ?? 1 };
  }
}

// ── JSON-RPC over stdio helper ─────────────────────────────────────────────────

interface McpResponse {
  jsonrpc: string;
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Spawn the MCP server, perform the initialize handshake, call `fn` with a
 * send helper, then kill the process.  Returns the last response received.
 */
async function withMcpServer(
  projectPath: string,
  fn: (send: (msg: object) => void, responses: () => McpResponse[]) => Promise<void>
): Promise<void> {
  const proc: ChildProcess = spawn('node', [CLI, 'mcp'], {
    env: { ...process.env, MINDLINK_PROJECT_PATH: projectPath },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const received: McpResponse[] = [];
  let buffer = '';

  proc.stdout!.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    // Each JSON-RPC message is a single line (newline-delimited JSON)
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          received.push(JSON.parse(line));
        } catch {}
      }
    }
  });

  function send(msg: object) {
    proc.stdin!.write(JSON.stringify(msg) + '\n');
  }

  // MCP initialize handshake
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'test-client', version: '1.0.0' },
      capabilities: {},
    },
  });

  // Wait for initialize response
  await waitFor(() => received.some(r => r.id === 1), 5000);
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });

  await fn(send, () => received);

  proc.kill();
  await new Promise(resolve => proc.on('close', resolve));
}

function waitFor(condition: () => boolean, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('waitFor timeout'));
      setTimeout(check, 20);
    };
    check();
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mindlink mcp', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `mindlink-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // ── --help ───────────────────────────────────────────────────────────────────

  test('--help describes the MCP server and its tools', () => {
    const result = run('mcp --help', dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('mindlink_read_memory');
    expect(result.stdout).toContain('mindlink_write_memory');
    expect(result.stdout).toContain('mindlink_session_update');
    expect(result.stdout).toContain('mindlink_verify');
  });

  // ── MCP initialize handshake ─────────────────────────────────────────────────

  test('responds to initialize with server capabilities', async () => {
    run('init --yes', dir);

    const responses: McpResponse[] = [];
    await withMcpServer(dir, async (_send, getResponses) => {
      await waitFor(() => getResponses().some(r => r.id === 1), 5000);
      responses.push(...getResponses());
    });

    const initResponse = responses.find(r => r.id === 1);
    expect(initResponse).toBeDefined();
    expect(initResponse!.result).toHaveProperty('serverInfo');
    // @ts-expect-error dynamic
    expect(initResponse!.result.serverInfo.name).toBe('mindlink');
  }, 15000);

  // ── tools/list ───────────────────────────────────────────────────────────────

  test('lists all 4 tools via tools/list', async () => {
    run('init --yes', dir);

    let toolsList: string[] = [];
    await withMcpServer(dir, async (send, getResponses) => {
      send({ jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} });
      await waitFor(() => getResponses().some(r => r.id === 10), 5000);
      const resp = getResponses().find(r => r.id === 10);
      // @ts-expect-error dynamic
      toolsList = resp?.result?.tools?.map((t: any) => t.name) ?? [];
    });

    expect(toolsList).toContain('mindlink_read_memory');
    expect(toolsList).toContain('mindlink_write_memory');
    expect(toolsList).toContain('mindlink_session_update');
    expect(toolsList).toContain('mindlink_verify');
  }, 15000);

  // ── mindlink_read_memory ─────────────────────────────────────────────────────

  test('mindlink_read_memory returns Core + User Profile by default', async () => {
    run('init --yes', dir);

    let content = '';
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 20, method: 'tools/call',
        params: { name: 'mindlink_read_memory', arguments: {} },
      });
      await waitFor(() => getResponses().some(r => r.id === 20), 5000);
      const resp = getResponses().find(r => r.id === 20);
      // @ts-expect-error dynamic
      content = resp?.result?.content?.[0]?.text ?? '';
    });

    expect(content).toContain('## Core');
    expect(content).toContain('## User Profile');
  }, 15000);

  test('mindlink_read_memory returns specific section when requested', async () => {
    run('init --yes', dir);

    let content = '';
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 21, method: 'tools/call',
        params: { name: 'mindlink_read_memory', arguments: { section: 'Architecture' } },
      });
      await waitFor(() => getResponses().some(r => r.id === 21), 5000);
      const resp = getResponses().find(r => r.id === 21);
      // @ts-expect-error dynamic
      content = resp?.result?.content?.[0]?.text ?? '';
    });

    // Should return just the Architecture section (not Core or other sections)
    expect(content).not.toContain('## Core');
  }, 15000);

  test('mindlink_read_memory returns error when no project found', async () => {
    // Start server with a path that has no .brain/
    const emptyDir = join(tmpdir(), `mindlink-empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });

    let isError = false;
    try {
      const proc: ChildProcess = spawn('node', [CLI, 'mcp'], {
        env: { ...process.env, MINDLINK_PROJECT_PATH: emptyDir },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const received: McpResponse[] = [];
      let buffer = '';
      proc.stdout!.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) try { received.push(JSON.parse(line)); } catch {}
        }
      });

      const send = (msg: object) => proc.stdin!.write(JSON.stringify(msg) + '\n');

      send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', clientInfo: { name: 'test', version: '0' }, capabilities: {} } });
      await waitFor(() => received.some(r => r.id === 1), 5000);
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });

      send({ jsonrpc: '2.0', id: 30, method: 'tools/call', params: { name: 'mindlink_read_memory', arguments: {} } });
      await waitFor(() => received.some(r => r.id === 30), 5000);

      const resp = received.find(r => r.id === 30);
      // @ts-expect-error dynamic
      const text: string = resp?.result?.content?.[0]?.text ?? '';
      isError = text.includes('Error');
      proc.kill();
      await new Promise(r => proc.on('close', r));
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }

    expect(isError).toBe(true);
  }, 15000);

  // ── mindlink_write_memory ────────────────────────────────────────────────────

  test('mindlink_write_memory appends content to a section', async () => {
    run('init --yes', dir);

    let resultText = '';
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 40, method: 'tools/call',
        params: {
          name: 'mindlink_write_memory',
          arguments: {
            section: 'Core',
            content: 'Test fact written by MCP tool. <!-- added: 2026-04-13 -->',
          },
        },
      });
      await waitFor(() => getResponses().some(r => r.id === 40), 5000);
      const resp = getResponses().find(r => r.id === 40);
      // @ts-expect-error dynamic
      resultText = resp?.result?.content?.[0]?.text ?? '';
    });

    expect(resultText).toContain('Appended to ## Core');
    const memory = readFileSync(join(dir, '.brain/MEMORY.md'), 'utf8');
    expect(memory).toContain('Test fact written by MCP tool.');
  }, 15000);

  // ── mindlink_session_update ──────────────────────────────────────────────────

  test('mindlink_session_update writes SESSION.md', async () => {
    run('init --yes', dir);

    let resultText = '';
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 50, method: 'tools/call',
        params: {
          name: 'mindlink_session_update',
          arguments: { summary: 'User asked about test. Responded with test content.' },
        },
      });
      await waitFor(() => getResponses().some(r => r.id === 50), 5000);
      const resp = getResponses().find(r => r.id === 50);
      // @ts-expect-error dynamic
      resultText = resp?.result?.content?.[0]?.text ?? '';
    });

    expect(resultText).toContain('SESSION.md updated');
    const session = readFileSync(join(dir, '.brain/SESSION.md'), 'utf8');
    expect(session).toContain('User asked about test.');
  }, 15000);

  // ── mindlink_verify ──────────────────────────────────────────────────────────

  test('mindlink_verify returns ok and checks array', async () => {
    run('init --yes', dir);

    let parsed: any = null;
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 60, method: 'tools/call',
        params: { name: 'mindlink_verify', arguments: {} },
      });
      await waitFor(() => getResponses().some(r => r.id === 60), 5000);
      const resp = getResponses().find(r => r.id === 60);
      // @ts-expect-error dynamic
      const text: string = resp?.result?.content?.[0]?.text ?? '{}';
      try { parsed = JSON.parse(text); } catch {}
    });

    expect(parsed).not.toBeNull();
    expect(parsed).toHaveProperty('ok');
    expect(parsed).toHaveProperty('checks');
    expect(Array.isArray(parsed.checks)).toBe(true);
  }, 15000);

  // ── MINDLINK_PROJECT_PATH resolution ─────────────────────────────────────────

  test('resolves project via MINDLINK_PROJECT_PATH env var', async () => {
    run('init --yes', dir);

    // If resolution works, read_memory will return content (not an error)
    let content = '';
    await withMcpServer(dir, async (send, getResponses) => {
      send({
        jsonrpc: '2.0', id: 70, method: 'tools/call',
        params: { name: 'mindlink_read_memory', arguments: {} },
      });
      await waitFor(() => getResponses().some(r => r.id === 70), 5000);
      const resp = getResponses().find(r => r.id === 70);
      // @ts-expect-error dynamic
      content = resp?.result?.content?.[0]?.text ?? '';
    });

    // A successful resolution returns markdown, not an error message
    expect(content).not.toContain('Error:');
    expect(content).toContain('##');
  }, 15000);
});
