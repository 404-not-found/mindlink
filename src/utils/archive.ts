import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Counts ## headings in a markdown string (session entries in LOG.md).
 */
function countEntries(content: string): number {
  return (content.match(/^## /gm) ?? []).length;
}

/**
 * If LOG.md has more than maxEntries session entries, archive the oldest ones.
 *
 * Keeps the file header (everything before the first ## heading) intact.
 * Moves excess entries to LOG-YYYY-MM-DD.md in the same directory.
 * Appends a one-line notice in LOG.md pointing to the archive file.
 */
export function archiveLogIfNeeded(logPath: string, maxEntries: number): void {
  if (!existsSync(logPath)) return;

  const content = readFileSync(logPath, 'utf8');
  const total = countEntries(content);
  if (total <= maxEntries) return;

  // Split into header and individual entries
  const headerMatch = content.match(/^([\s\S]*?)(?=^## )/m);
  const header = headerMatch ? headerMatch[1] : '';
  const entriesSection = content.slice(header.length);
  const entryBlocks = entriesSection.split(/(?=^## )/m).filter(Boolean);

  // Keep newest maxEntries, archive the rest
  const toKeep = entryBlocks.slice(0, maxEntries);
  const toArchive = entryBlocks.slice(maxEntries);

  const archiveDate = new Date().toISOString().slice(0, 10);
  const archiveName = `LOG-${archiveDate}.md`;
  const archivePath = join(logPath, '..', archiveName);

  // Write or append to archive file
  if (existsSync(archivePath)) {
    const existing = readFileSync(archivePath, 'utf8');
    writeFileSync(archivePath, existing + toArchive.join(''));
  } else {
    writeFileSync(archivePath, `# Session Log Archive — ${archiveDate}\n\n` + toArchive.join(''));
  }

  // Rewrite LOG.md with header + kept entries + archive notice
  const notice = `\n> _Older entries archived to \`${archiveName}\` on ${archiveDate}._\n`;
  writeFileSync(logPath, header + notice + toKeep.join(''));
}
