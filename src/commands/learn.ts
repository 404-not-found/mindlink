import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve, extname } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';
import { extractSection } from '../utils/parser.js';

// ── Section target resolution ─────────────────────────────────────────────────

const VALID_SECTIONS = ['Core', 'Architecture', 'Decisions', 'Conventions', 'Important Context'] as const;
type Section = typeof VALID_SECTIONS[number];

function resolveSection(hint?: string): Section {
  if (!hint) return 'Important Context';
  const h = hint.toLowerCase();
  if (h.includes('core')) return 'Core';
  if (h.includes('arch')) return 'Architecture';
  if (h.includes('dec')) return 'Decisions';
  if (h.includes('conv')) return 'Conventions';
  return 'Important Context';
}

// ── Text extraction ───────────────────────────────────────────────────────────

/**
 * Fetch text content from a URL. Returns raw text (strips HTML tags).
 */
async function fetchUrl(url: string): Promise<string> {
  const { default: https } = await import(url.startsWith('https') ? 'https' : 'http');
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'mindlink-learn/1.0' } }, (res: any) => {
      // Follow one redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

/**
 * Strip HTML tags and collapse whitespace for readable plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Read a local file. Supports .md, .txt, .json, .yaml, .yml, .toml, source files.
 */
function readLocalFile(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const raw = readFileSync(filePath, 'utf8');

  // JSON — pretty print for readability
  if (ext === '.json') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2).slice(0, 8000);
    } catch {
      return raw;
    }
  }

  return raw;
}

// ── Fact extraction ───────────────────────────────────────────────────────────

/**
 * Extract meaningful facts from raw text.
 * Heuristics: non-empty lines, skip boilerplate nav/footer, cap at ~60 lines.
 */
function extractFacts(text: string, maxLines = 60): string {
  const SKIP_PATTERNS = [
    /^(cookie|privacy|terms|copyright|all rights reserved|subscribe|sign up|log in|home|menu|search|navigation)/i,
    /^\s*[\|<>\/\\]\s*$/,
    /^https?:\/\//,
  ];

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l =>
      l.length > 10 &&
      l.length < 300 &&
      !SKIP_PATTERNS.some(p => p.test(l))
    );

  // Deduplicate near-identical lines
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(line);
    }
  }

  return deduped.slice(0, maxLines).join('\n');
}

// ── Append to MEMORY.md section ───────────────────────────────────────────────

function appendToMemory(memoryPath: string, section: Section, facts: string, source: string): void {
  let content = readFileSync(memoryPath, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  const entry = `<!-- learned from: ${source} on ${date} -->\n${facts.trim()}`;

  const lines = content.split('\n');
  let headingIdx = -1;
  let nextSectionIdx = lines.length;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].replace(/<!--.*?-->/g, '').trim();
      if (headingIdx < 0 && title.toLowerCase() === section.toLowerCase()) {
        headingIdx = i;
        headingLevel = level;
      } else if (headingIdx >= 0 && level <= headingLevel) {
        nextSectionIdx = i;
        break;
      }
    }
  }

  if (headingIdx < 0) {
    // Section missing — append at end
    content = content.trimEnd() + `\n\n## ${section}\n\n${entry}\n`;
  } else {
    const insertAt = nextSectionIdx > 0 && lines[nextSectionIdx - 1].trim() === '---'
      ? nextSectionIdx - 1
      : nextSectionIdx;
    lines.splice(insertAt, 0, '', entry, '');
    content = lines.join('\n');
  }

  writeFileSync(memoryPath, content);
}

// ── Command ───────────────────────────────────────────────────────────────────

export const learnCommand = new Command('learn')
  .description('Extract facts from a file or URL and save them into project memory')
  .argument('<source>', 'File path or URL to learn from')
  .option('--section <name>', 'Target memory section (core, architecture, decisions, conventions, context)', 'context')
  .option('--preview', 'Show what would be learned without writing anything')
  .addHelpText('after', `
Examples:
  mindlink learn ./docs/architecture.md
  mindlink learn https://example.com/api-docs
  mindlink learn ./package.json --section architecture
  mindlink learn ./DECISIONS.md --section decisions
  mindlink learn https://stripe.com/docs/webhooks --preview
  `)
  .action(async (source: string, opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    const memoryPath = join(brainDir, 'MEMORY.md');
    if (!existsSync(memoryPath)) {
      console.log(`  ${chalk.red('✗')}  MEMORY.md not found in .brain/.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to set up memory.`);
      console.log('');
      process.exit(1);
    }

    const section = resolveSection(opts.section);
    const isUrl = source.startsWith('http://') || source.startsWith('https://');

    console.log('');

    // ── Fetch / read ──────────────────────────────────────────────────────────

    let rawText = '';

    if (isUrl) {
      process.stdout.write(`  Fetching ${chalk.dim(source)}...\n`);
      try {
        const html = await fetchUrl(source);
        rawText = stripHtml(html);
      } catch (err: unknown) {
        console.log(`  ${chalk.red('✗')}  Could not fetch URL: ${err instanceof Error ? err.message : String(err)}`);
        console.log(`     Check the URL is reachable and try again.`);
        console.log('');
        process.exit(1);
      }
    } else {
      const absPath = resolve(projectPath, source);
      if (!existsSync(absPath)) {
        console.log(`  ${chalk.red('✗')}  File not found: ${absPath}`);
        console.log('');
        process.exit(1);
      }
      try {
        rawText = readLocalFile(absPath);
      } catch (err: unknown) {
        console.log(`  ${chalk.red('✗')}  Could not read file: ${err instanceof Error ? err.message : String(err)}`);
        console.log('');
        process.exit(1);
      }
    }

    if (!rawText.trim()) {
      console.log(`  ${chalk.yellow('→')}  Source is empty — nothing to learn.`);
      console.log('');
      process.exit(0);
    }

    // ── Extract facts ─────────────────────────────────────────────────────────

    const facts = extractFacts(rawText);

    if (!facts.trim()) {
      console.log(`  ${chalk.yellow('→')}  Could not extract any meaningful content from this source.`);
      console.log('');
      process.exit(0);
    }

    // ── Preview mode ──────────────────────────────────────────────────────────

    if (opts.preview) {
      console.log(`  ${chalk.bold('Preview')} — would add to ${chalk.cyan('## ' + section)} in MEMORY.md:`);
      console.log('');
      const previewLines = facts.split('\n').slice(0, 20);
      for (const line of previewLines) {
        console.log(`  ${chalk.dim('·')} ${line}`);
      }
      if (facts.split('\n').length > 20) {
        console.log(`  ${chalk.dim(`... and ${facts.split('\n').length - 20} more lines`)}`);
      }
      console.log('');
      console.log(`  Run without ${chalk.cyan('--preview')} to save.`);
      console.log('');
      process.exit(0);
    }

    // ── Write to MEMORY.md ────────────────────────────────────────────────────

    try {
      appendToMemory(memoryPath, section, facts, source);
    } catch (err: unknown) {
      console.log(`  ${chalk.red('✗')}  Failed to write to MEMORY.md: ${err instanceof Error ? err.message : String(err)}`);
      console.log('');
      process.exit(1);
    }

    const lineCount = facts.split('\n').filter(l => l.trim()).length;
    console.log(`  ${chalk.green('✓')}  Learned ${lineCount} lines from ${chalk.dim(source)}`);
    console.log(`     Added to ${chalk.cyan('## ' + section)} in MEMORY.md`);
    console.log('');
    console.log(`  ${chalk.dim('Your AI will see this context starting next session.')}`);
    console.log(`  ${chalk.dim('Run mindlink verify to check memory health.')}`);
    console.log('');

    // Check if section was already populated — give a heads-up
    const existing = extractSection(readFileSync(memoryPath, 'utf8'), section);
    const existingLines = existing.split('\n').filter(l => l.trim() && !l.startsWith('<!--')).length;
    if (existingLines > 80) {
      console.log(`  ${chalk.yellow('→')}  ## ${section} is getting large (${existingLines} lines).`);
      console.log(`     Run ${chalk.cyan('mindlink prune')} to retire stale entries.`);
      console.log('');
    }
  });
