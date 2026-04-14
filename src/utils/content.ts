/**
 * Returns true if a markdown section (by heading name) has at least one real
 * (non-comment, non-heading, non-empty, non-horizontal-rule, non-table-divider) line.
 */
export function sectionHasRealContent(markdown: string, heading: string): boolean {
  const lines = markdown.split('\n');
  let inSection = false;
  let headingLevel = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);

    if (match) {
      const level = match[1].length;
      const title = match[2].replace(/<!--.*?-->/g, '').trim();

      if (title.toLowerCase() === heading.toLowerCase()) {
        inSection = true;
        headingLevel = level;
        continue;
      }

      if (inSection && level <= headingLevel) {
        break;
      }
    }

    if (inSection) {
      const t = line.trim();
      if (
        t.length > 0 &&
        !t.startsWith('#') &&
        !t.startsWith('<!--') &&
        !t.startsWith('>') &&
        !t.startsWith('|') &&
        t !== '---'
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Replace the body of a markdown section (identified by heading name) with new content.
 * The heading line itself is preserved. Returns the modified markdown.
 * If the section is not found, returns the original content unchanged.
 */
export function replaceSection(markdown: string, heading: string, newBody: string): string {
  const lines = markdown.split('\n');
  let headingIdx = -1;
  let nextSectionIdx = lines.length;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].replace(/<!--.*?-->/g, '').trim();
      if (headingIdx < 0 && title.toLowerCase() === heading.toLowerCase()) {
        headingIdx = i;
        headingLevel = level;
      } else if (headingIdx >= 0 && level <= headingLevel) {
        nextSectionIdx = i;
        break;
      }
    }
  }

  if (headingIdx < 0) return markdown;

  const before = lines.slice(0, headingIdx + 1);
  const after = lines.slice(nextSectionIdx);
  return [...before, '', newBody.trim(), '', ...after].join('\n');
}

/**
 * Counts real (non-comment, non-heading, non-empty, non-horizontal-rule) lines in a markdown string.
 */
export function countRealLines(markdown: string): number {
  return markdown.split('\n').filter(line => {
    const t = line.trim();
    return (
      t.length > 0 &&
      !t.startsWith('#') &&
      !t.startsWith('<!--') &&
      !t.startsWith('>') &&
      t !== '---'
    );
  }).length;
}
