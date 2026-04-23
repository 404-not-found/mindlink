import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';
import { parseLogEntries, extractSection } from '../utils/parser.js';

export const recapCommand = new Command('recap')
  .description('Summary of everything your AI learned across recent sessions')
  .option('--days <n>', 'How many days back to include', '7')
  .option('--sessions <n>', 'Max number of sessions to include')
  .addHelpText('after', `
Examples:
  mindlink recap
  mindlink recap --days 30
  mindlink recap --sessions 5
  `)
  .action((opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);

    if (!existsSync(brainDir)) {
      console.log(`  ${chalk.red('✗')}  No .brain/ found in this directory.`);
      console.log(`     Run ${chalk.cyan('mindlink init')} to get started.`);
      console.log('');
      process.exit(1);
    }

    const logPath = join(brainDir, 'LOG.md');
    const memoryPath = join(brainDir, 'MEMORY.md');

    if (!existsSync(logPath)) {
      console.log(`  ${chalk.dim('No session history yet.')}`);
      console.log(`  Start working with your AI — it will build up a log automatically.`);
      console.log('');
      process.exit(0);
    }

    const logContent = readFileSync(logPath, 'utf8');
    const allEntries = parseLogEntries(logContent);

    if (allEntries.length === 0) {
      console.log(`  ${chalk.dim('No sessions logged yet.')}`);
      console.log('');
      process.exit(0);
    }

    // Filter by days
    const maxDays = parseInt(opts.days ?? '7', 10);
    const maxSessions = opts.sessions ? parseInt(opts.sessions, 10) : undefined;
    const cutoff = Date.now() - maxDays * 86400000;

    // Parse date from heading — supports formats like "Apr 9, 2026" or "2026-04-09" or "⭐ Apr 9, 2026"
    function parseEntryDate(heading: string): Date | null {
      const clean = heading.replace(/^⭐\s*/, '').trim();
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d;
    }

    let filtered = allEntries.filter(e => {
      const d = parseEntryDate(e.heading);
      if (!d) return true; // include undated entries
      return d.getTime() >= cutoff;
    });

    if (maxSessions && filtered.length > maxSessions) {
      filtered = filtered.slice(0, maxSessions);
    }

    // Extract signal from each entry body
    function extractField(body: string, label: string): string[] {
      const lines = body.split('\n');
      const results: string[] = [];
      const labelLower = label.toLowerCase();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        // Match inline: "**Completed:** foo · bar" or "Completed: foo"
        const inlinePatterns = [
          new RegExp(`\\*\\*${label}[:\\*s]*\\*\\*:?\\s*(.+)`, 'i'),
          new RegExp(`^${label}:?\\s*(.+)`, 'i'),
        ];
        for (const pat of inlinePatterns) {
          const m = line.match(pat);
          if (m?.[1]) {
            // Split on · or , for multiple items on same line
            const items = m[1].split(/[·,]/).map(s => s.trim()).filter(s => s.length > 0);
            results.push(...items);
          }
        }

        // Match block: label on its own line, items follow as bullets
        if (lineLower.includes(labelLower + ':') && !line.includes('→') && results.length === 0) {
          let j = i + 1;
          while (j < lines.length) {
            const next = lines[j].trim();
            if (!next || next.startsWith('**') || next.startsWith('##')) break;
            const t = next.replace(/^[-*]\s*/, '').trim();
            if (t.length > 0) results.push(t);
            j++;
          }
        }
      }
      return results;
    }

    // Collect signal across all filtered entries
    const completedItems: string[] = [];
    const decisions: string[] = [];
    const nextItems: string[] = [];

    for (const entry of filtered) {
      completedItems.push(...extractField(entry.body, 'completed'));
      completedItems.push(...extractField(entry.body, 'what was completed'));
      decisions.push(...extractField(entry.body, 'decisions'));
      nextItems.push(...extractField(entry.body, 'next'));
      nextItems.push(...extractField(entry.body, 'up next'));
      nextItems.push(...extractField(entry.body, 'what\'s next'));
    }

    // Deduplicate
    const dedup = (arr: string[]) => [...new Set(arr)].filter(s => s.length > 0 && s !== '(none)');

    const completed = dedup(completedItems).slice(0, 8);
    const decidedItems = dedup(decisions).slice(0, 6);
    const upNext = dedup(nextItems).slice(0, 4);

    // Read current memory state
    let memoryState = '';
    if (existsSync(memoryPath)) {
      const mem = readFileSync(memoryPath, 'utf8');
      const core = extractSection(mem, 'Core');
      const coreLines = core.split('\n').filter(l => {
        const t = l.trim();
        return t.length > 0 && !t.startsWith('<!--') && !t.startsWith('#') && t !== '---';
      });
      if (coreLines.length > 0) memoryState = coreLines.slice(0, 4).join('\n');
    }

    // Render
    console.log('');
    console.log(`  ${chalk.bold('◉ MindLink — Session Recap')}  ${chalk.dim(`last ${maxDays} days · ${filtered.length} session${filtered.length !== 1 ? 's' : ''}`)}`);
    console.log('');

    if (memoryState) {
      console.log(`  ${chalk.cyan('Memory snapshot')}`);
      for (const line of memoryState.split('\n')) {
        console.log(`    ${chalk.dim(line)}`);
      }
      console.log('');
    }

    if (completed.length > 0) {
      console.log(`  ${chalk.green('What got done')}`);
      for (const item of completed) {
        console.log(`  ${chalk.green('→')}  ${item}`);
      }
      console.log('');
    }

    if (decidedItems.length > 0) {
      console.log(`  ${chalk.yellow('Decisions made')}`);
      for (const item of decidedItems) {
        console.log(`  ${chalk.yellow('→')}  ${item}`);
      }
      console.log('');
    }

    if (upNext.length > 0) {
      console.log(`  ${chalk.blue('Up next')}`);
      for (const item of upNext) {
        console.log(`  ${chalk.blue('→')}  ${item}`);
      }
      console.log('');
    }

    if (completed.length === 0 && decidedItems.length === 0 && upNext.length === 0) {
      console.log(`  ${chalk.dim('Sessions found but no structured content extracted.')}`);
      console.log(`  ${chalk.dim('Ask your AI to use the standard log format: completed / decisions / next.')}`);
      console.log('');
    }
  });
