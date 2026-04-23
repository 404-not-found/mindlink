/**
 * Extract the content of a markdown section by heading name.
 * Returns lines under the heading until the next heading of same/higher level.
 */
export function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  let inSection = false;
  let headingLevel = 0;
  const result: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);

    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      // Strip inline HTML comments (e.g. "Core  <!-- READ EVERY SESSION -->") before matching
      const cleanTitle = title.replace(/<!--.*?-->/g, '').trim();
      if (cleanTitle.toLowerCase() === heading.toLowerCase()) {
        inSection = true;
        headingLevel = level;
        continue;
      }

      if (inSection && level <= headingLevel) {
        break;
      }
    }

    if (inSection) {
      result.push(line);
    }
  }

  return result.join('\n').trim();
}

/**
 * Extract bullet list items from a markdown string.
 * Returns non-empty, non-comment lines that start with - or *.
 */
export function extractBullets(text: string): string[] {
  return text
    .split('\n')
    .filter(l => /^[-*]\s+/.test(l.trim()))
    .map(l => l.replace(/^[-*]\s+/, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('<!--'));
}

/**
 * Count how many top-level log entries exist in LOG.md.
 * Each entry starts with a ## heading.
 */
export function countLogEntries(markdown: string): number {
  return (markdown.match(/^##\s+/gm) ?? []).length;
}

/**
 * Get the date of the last log entry in LOG.md.
 */
export function lastLogDate(markdown: string): string | null {
  const matches = markdown.match(/^##\s+(.+)/m);
  return matches ? matches[1].trim() : null;
}

/**
 * Count how many rows exist in the Key Decisions table in MEMORY.md.
 * Skips the header and divider rows.
 */
export function countDecisions(markdown: string): number {
  const section = extractSection(markdown, 'Key Decisions');
  return section
    .split('\n')
    .filter(l => l.startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('decision'))
    .filter(l => {
      const cols = l.split('|').map(c => c.trim()).filter(Boolean);
      return cols.some(c => c.length > 0);
    }).length;
}

/**
 * Parse LOG.md into individual session entry objects.
 * Each entry starts with a ## heading.
 */
export interface LogEntry {
  heading: string;
  body: string;
}

export function parseLogEntries(markdown: string): LogEntry[] {
  const blocks = markdown.split(/(?=^## )/m).filter(b => b.trimStart().startsWith('## '));
  return blocks.map(block => {
    const newline = block.indexOf('\n');
    const heading = newline === -1 ? block.slice(3).trim() : block.slice(3, newline).trim();
    const body = newline === -1 ? '' : block.slice(newline + 1).trim();
    return { heading, body };
  });
}

/**
 * Get relative time string from a file's last modified date.
 */
export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
