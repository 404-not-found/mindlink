import { Command } from 'commander';
import { select, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { BRAIN_DIR } from '../utils/paths.js';

// Days after which an entry in a given section is considered stale
const STALENESS_THRESHOLDS: Record<string, number> = {
  'current focus': 14,
  'decisions':     180,
  'conventions':   180,
  'architecture':  365,
  // 'user profile' and 'important context' have no expiry
};

interface TimestampedEntry {
  /** Section heading (e.g. "Current Focus") */
  section: string;
  /** The text of the entry (may span multiple lines) */
  text: string;
  /** ISO date from <!-- added: YYYY-MM-DD --> */
  addedDate: Date | null;
  /** Line index in the file where this entry starts (0-based) */
  lineStart: number;
  /** Line index where this entry ends (exclusive) */
  lineEnd: number;
  /** Age in days (null if no timestamp) */
  ageInDays: number | null;
  /** Staleness threshold for this section (days) */
  threshold: number;
  /** True if ageInDays exceeds threshold */
  isStale: boolean;
}

const TIMESTAMP_RE = /<!--\s*added:\s*(\d{4}-\d{2}-\d{2})\s*-->/;
const SECTION_RE = /^(#{1,6})\s+(.+)/;

function parseTimestampedEntries(content: string): TimestampedEntry[] {
  const lines = content.split('\n');
  const entries: TimestampedEntry[] = [];

  let currentSection = '';
  let currentHeadingLevel = 0;
  let entryLines: string[] = [];
  let entryStart = -1;

  function flushEntry(lineEnd: number): void {
    if (entryStart < 0 || entryLines.length === 0) return;

    // Only consider entries with a timestamp
    const fullText = entryLines.join('\n');
    const timestampMatch = fullText.match(TIMESTAMP_RE);
    if (!timestampMatch) {
      entryLines = [];
      entryStart = -1;
      return;
    }

    const addedDate = new Date(timestampMatch[1] + 'T00:00:00Z');
    const ageInDays = (Date.now() - addedDate.getTime()) / 86400000;
    const sectionKey = currentSection.toLowerCase().replace(/\s*<!--.*?-->\s*/g, '').trim();
    const threshold = STALENESS_THRESHOLDS[sectionKey] ?? Infinity;
    const isStale = isFinite(threshold) && ageInDays > threshold;

    // Strip pure comment/blank lines from start/end for cleaner display
    const trimmedLines = entryLines.filter(l => l.trim().length > 0);
    const displayText = trimmedLines.join('\n');

    entries.push({
      section: currentSection.replace(/<!--.*?-->/g, '').trim(),
      text: displayText,
      addedDate,
      lineStart: entryStart,
      lineEnd,
      ageInDays,
      threshold,
      isStale,
    });

    entryLines = [];
    entryStart = -1;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(SECTION_RE);

    if (sectionMatch) {
      const level = sectionMatch[1].length;
      const title = sectionMatch[2];

      // Flush any pending entry when we hit a new heading
      flushEntry(i);

      if (level <= 2) {
        // Top-level section change
        currentSection = title;
        currentHeadingLevel = level;
      }
      // Don't start an entry on a heading line
      continue;
    }

    // Skip horizontal rules and empty lines outside an entry
    if (line.trim() === '---') { flushEntry(i); continue; }

    // Skip pure comment blocks
    if (line.trim().startsWith('<!--') && line.trim().endsWith('-->')) {
      if (entryStart < 0) continue; // not in an entry
    }

    // Lines with a timestamp marker = end of an entry block
    if (TIMESTAMP_RE.test(line)) {
      if (entryStart < 0) entryStart = i;
      entryLines.push(line);
      flushEntry(i + 1);
      continue;
    }

    // Non-empty, non-comment lines start or continue an entry
    if (line.trim().length > 0 && !line.trim().startsWith('>')) {
      if (entryStart < 0) entryStart = i;
      entryLines.push(line);
    } else if (entryStart >= 0) {
      // Empty line inside an entry — keep for context but don't start a new one on it
      entryLines.push(line);
    }
  }

  flushEntry(lines.length);
  return entries;
}

function removeLines(content: string, lineStart: number, lineEnd: number): string {
  const lines = content.split('\n');
  lines.splice(lineStart, lineEnd - lineStart);
  return lines.join('\n');
}

function appendToArchive(content: string, entryText: string, pruneDate: string): string {
  const archiveHeading = '## Archive';
  const archiveEntry = `${entryText} <!-- archived: ${pruneDate} -->`;

  if (content.includes(archiveHeading)) {
    // Insert after the archive heading and any existing comment
    return content.replace(
      /(## Archive\n(?:<!--[^>]*-->\n)*)/,
      `$1\n${archiveEntry}\n`
    );
  } else {
    return content.trimEnd() + `\n\n${archiveHeading}\n\n<!-- Entries moved here by mindlink prune — kept for reference -->\n\n${archiveEntry}\n`;
  }
}

function formatAge(days: number): string {
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

export const pruneCommand = new Command('prune')
  .description('Review and retire stale MEMORY.md entries interactively')
  .option('--dry-run', 'Show stale entries without making any changes')
  .option('--all', 'Show all timestamped entries regardless of age')
  .addHelpText('after', `
Scans MEMORY.md for entries with <!-- added: YYYY-MM-DD --> timestamps.
Entries older than their section's staleness threshold are flagged for review.

Staleness thresholds:
  Current Focus   — 14 days
  Decisions       — 180 days
  Conventions     — 180 days
  Architecture    — 365 days
  User Profile    — never expires

Archived entries are moved to ## Archive at the bottom of MEMORY.md.
They are never permanently deleted unless you choose "Delete".

Examples:
  mindlink prune
  mindlink prune --dry-run
  mindlink prune --all
  `)
  .action(async (opts) => {
    const projectPath = resolve(process.cwd());
    const brainDir = join(projectPath, BRAIN_DIR);
    const memoryPath = join(brainDir, 'MEMORY.md');

    console.log('');
    console.log(`  ${chalk.bold('◉ MindLink Prune')}`);
    console.log(`  ${chalk.dim(memoryPath)}`);
    console.log('');

    if (!existsSync(memoryPath)) {
      console.log(`  ${chalk.red('✗')}  MEMORY.md not found. Run ${chalk.cyan('mindlink init')} first.`);
      console.log('');
      process.exit(1);
    }

    const allEntries = parseTimestampedEntries(readFileSync(memoryPath, 'utf8'));
    const toReview = opts.all
      ? allEntries.filter(e => e.addedDate !== null)
      : allEntries.filter(e => e.isStale);

    if (toReview.length === 0) {
      if (allEntries.length === 0) {
        console.log(`  ${chalk.dim('No timestamped entries found in MEMORY.md.')}`);
        console.log(`  ${chalk.dim('Entries are timestamped when your AI writes them (<!-- added: YYYY-MM-DD -->).')}`);
      } else {
        console.log(`  ${chalk.green('✓')}  No stale entries found. ${allEntries.length} entry${allEntries.length !== 1 ? 'ies' : 'y'} all within threshold.`);
        console.log(`  ${chalk.dim('Run mindlink prune --all to review all timestamped entries.')}`);
      }
      console.log('');
      return;
    }

    console.log(`  Scanning MEMORY.md for ${opts.all ? 'timestamped' : 'stale'} entries...`);
    console.log(`  Found ${toReview.length} entr${toReview.length !== 1 ? 'ies' : 'y'} to review.`);
    console.log('');

    if (opts.dryRun) {
      for (const entry of toReview) {
        const age = entry.ageInDays !== null ? formatAge(entry.ageInDays) : 'undated';
        const thresholdStr = isFinite(entry.threshold) ? ` — threshold: ${entry.threshold} days` : '';
        console.log(`  ${chalk.yellow('⚠')}  [${entry.section}] ${entry.text.split('\n')[0].slice(0, 80)}`);
        console.log(`     ${chalk.dim(`Added: ${entry.addedDate?.toISOString().slice(0, 10) ?? 'unknown'} (${age} ago)${thresholdStr}`)}`);
        console.log('');
      }
      console.log(`  ${chalk.dim('Dry run — no changes made.')}`);
      console.log('');
      return;
    }

    const pruneDate = new Date().toISOString().slice(0, 10);
    let content = readFileSync(memoryPath, 'utf8');

    let archived = 0;
    let deleted = 0;
    let kept = 0;
    let skippedAll = false;

    // Process in reverse order so line numbers stay valid as we splice
    const sorted = [...toReview].sort((a, b) => b.lineStart - a.lineStart);

    for (const entry of sorted) {
      if (skippedAll) { kept++; continue; }

      const age = entry.ageInDays !== null ? formatAge(entry.ageInDays) : 'undated';
      const thresholdStr = isFinite(entry.threshold) ? ` — threshold: ${entry.threshold} days` : '';
      const displayLines = entry.text.split('\n').slice(0, 3).join('\n');

      console.log(`  ${chalk.bold('─'.repeat(55))}`);
      console.log(`  ${chalk.bold('Section:')} ${entry.section}`);
      console.log(`  ${chalk.bold('Entry:')}`);
      for (const l of displayLines.split('\n')) console.log(`    ${chalk.dim(l)}`);
      console.log(`  ${chalk.bold('Added:')} ${entry.addedDate?.toISOString().slice(0, 10) ?? 'unknown'} (${age} ago)${thresholdStr}`);
      console.log('');

      const action = await select({
        message: 'What would you like to do?',
        options: [
          { value: 'keep',     label: 'Keep',           hint: 'leave as-is' },
          { value: 'archive',  label: 'Archive',        hint: 'move to ## Archive section' },
          { value: 'delete',   label: 'Delete',         hint: 'remove permanently' },
          { value: 'skip_all', label: 'Skip remaining', hint: 'keep all remaining entries unchanged' },
        ],
      });

      if (isCancel(action)) { console.log(''); break; }

      if (action === 'skip_all') {
        skippedAll = true;
        kept++;
        continue;
      }

      if (action === 'archive') {
        const entryText = content.split('\n').slice(entry.lineStart, entry.lineEnd).join('\n').trim();
        content = removeLines(content, entry.lineStart, entry.lineEnd);
        content = appendToArchive(content, entryText, pruneDate);
        archived++;
      } else if (action === 'delete') {
        content = removeLines(content, entry.lineStart, entry.lineEnd);
        deleted++;
      } else {
        kept++;
      }

      console.log('');
    }

    if (archived > 0 || deleted > 0) {
      writeFileSync(memoryPath, content);
    }

    console.log(`  ${chalk.bold('─'.repeat(55))}`);
    if (archived > 0) console.log(`  ${chalk.green('✓')}  ${archived} entry${archived !== 1 ? 'ies' : ''} archived`);
    if (deleted > 0)  console.log(`  ${chalk.green('✓')}  ${deleted} entry${deleted !== 1 ? 'ies' : ''} deleted`);
    if (kept > 0)     console.log(`  ${chalk.dim('·')}  ${kept} entry${kept !== 1 ? 'ies' : ''} kept`);
    if (archived > 0 || deleted > 0) {
      console.log(`  ${chalk.green('✓')}  MEMORY.md updated.`);
    }
    console.log('');
  });
